import { Router } from "express";
import type { Request, Response } from "express";
import argon2 from "argon2";
import { addDays, addMinutes } from "date-fns";
import { z } from "zod";
import type { RolUsuario } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "../../infraestructura/prisma.js";
import { entorno } from "../../configuracion/entorno.js";
import { ErrorAplicacion } from "../../compartido/errores.js";
import { autenticar } from "../../seguridad/middlewares.js";
import {
  crearTokenAcceso,
  crearTokenCsrf,
  crearTokenRefresco,
  hashToken,
  validarTokenRefresco,
} from "../../seguridad/tokens.js";
import { cifrarCampo, descifrarCampo } from "../../compartido/cifrado.js";
import {
  generarSecretoMfa,
  uriConfiguracionMfa,
  validarCodigoMfa,
} from "../../seguridad/mfa.js";
import {
  crearHashContrasena,
  esquemaContrasenaSegura,
} from "../../seguridad/contrasenas.js";

export const rutasAutenticacion = Router();

const opcionesCookie = {
  httpOnly: true,
  secure: entorno.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

function usuarioPublico(usuario: {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  debeCambiarContrasena: boolean;
  mfaHabilitado: boolean;
}) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
    debeCambiarContrasena: usuario.debeCambiarContrasena,
    mfaHabilitado: usuario.mfaHabilitado,
  };
}

async function emitirSesion(
  req: Request,
  res: Response,
  usuario: {
    id: string;
    nombre: string;
    correo: string;
    rol: RolUsuario;
    debeCambiarContrasena: boolean;
    mfaHabilitado: boolean;
    tokenVersion: number;
  },
  movil: boolean,
  sesionAnteriorId?: string,
  familiaExistenteId?: string,
) {
  const identidad = {
    sub: usuario.id,
    correo: usuario.correo,
    rol: usuario.rol,
    debeCambiarContrasena: usuario.debeCambiarContrasena,
    tokenVersion: usuario.tokenVersion,
  };
  const accessToken = crearTokenAcceso(identidad);
  const refreshToken = crearTokenRefresco(identidad);
  const csrfToken = crearTokenCsrf();

  const familiaId = familiaExistenteId ?? randomUUID();
  const rotacion = await prisma.$transaction(async (tx) => {
    // Serializa inicios y rotaciones del usuario; así el límite de cinco
    // sesiones también se conserva bajo concurrencia.
    await tx.$queryRaw`
      SELECT 1::integer AS bloqueado
      FROM (
        SELECT pg_advisory_xact_lock(hashtext(${`nexo:sesiones:${usuario.id}`}))
      ) AS candado
    `;
    if (sesionAnteriorId) {
      // Consumo único: dos renovaciones concurrentes no pueden rotar el mismo
      // token. La revocación y la creación sucesora se confirman juntas.
      const consumida = await tx.sesion.updateMany({
        where: {
          id: sesionAnteriorId,
          usuarioId: usuario.id,
          revocadaEn: null,
          expiraEn: { gt: new Date() },
        },
        data: { revocadaEn: new Date() },
      });
      if (consumida.count !== 1) {
        // No se lanza dentro de la transacción: primero debe confirmarse la
        // revocación de toda la familia sospechosa.
        await tx.sesion.updateMany({
          where: { familiaId, revocadaEn: null },
          data: { revocadaEn: new Date() },
        });
        return { reutilizada: true as const };
      }
    }

    await tx.sesion.create({
      data: {
        usuarioId: usuario.id,
        hashToken: hashToken(refreshToken),
        familiaId,
        agenteUsuario: req.get("user-agent"),
        ip: req.ip,
        expiraEn: addDays(new Date(), 30),
      },
    });
    const sesionesActivas = await tx.sesion.findMany({
      where: {
        usuarioId: usuario.id,
        revocadaEn: null,
        expiraEn: { gt: new Date() },
      },
      orderBy: { creadoEn: "desc" },
      skip: 5,
      select: { id: true },
    });
    if (sesionesActivas.length) {
      await tx.sesion.updateMany({
        where: { id: { in: sesionesActivas.map((sesion) => sesion.id) } },
        data: { revocadaEn: new Date() },
      });
    }
    return { reutilizada: false as const };
  });

  if (rotacion.reutilizada)
    throw new ErrorAplicacion(
      "REFRESCO_REUTILIZADO",
      "Se detectó reutilización del token. Toda la familia de sesiones fue revocada.",
      401,
    );

  if (!movil) {
    res.cookie("access_token", accessToken, {
      ...opcionesCookie,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("refresh_token", refreshToken, {
      ...opcionesCookie,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.cookie("csrf_token", csrfToken, {
      secure: opcionesCookie.secure,
      sameSite: opcionesCookie.sameSite,
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  return { accessToken, refreshToken, csrfToken };
}

async function registrarIntentoFallido(usuarioId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT 1::integer AS bloqueado
      FROM (
        SELECT pg_advisory_xact_lock(hashtext(${`nexo:login:${usuarioId}`}))
      ) AS candado
    `;
    const actual = await tx.usuario.findUnique({ where: { id: usuarioId } });
    if (!actual?.activo) return;
    const intentos = actual.intentosFallidos + 1;
    await tx.usuario.update({
      where: { id: usuarioId },
      data: {
        intentosFallidos: intentos,
        bloqueadoHasta: intentos >= 5 ? addMinutes(new Date(), 15) : null,
      },
    });
  });
}

async function prepararInicioExitoso(usuarioId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT 1::integer AS bloqueado
      FROM (
        SELECT pg_advisory_xact_lock(hashtext(${`nexo:login:${usuarioId}`}))
      ) AS candado
    `;
    const actual = await tx.usuario.findUniqueOrThrow({
      where: { id: usuarioId },
    });
    if (
      !actual.activo ||
      (actual.bloqueadoHasta && actual.bloqueadoHasta > new Date())
    )
      throw new ErrorAplicacion(
        "CUENTA_BLOQUEADA",
        "La cuenta está bloqueada o inactiva.",
        423,
      );
    await tx.usuario.update({
      where: { id: usuarioId },
      data: {
        ultimoAcceso: new Date(),
        intentosFallidos: 0,
        bloqueadoHasta: null,
      },
    });
  });
}

rutasAutenticacion.post("/iniciar-sesion", async (req, res) => {
  const datos = z
    .object({
      correo: z
        .string()
        .email()
        .transform((valor) => valor.toLowerCase()),
      contrasena: z.string().min(6).max(200),
      cliente: z.enum(["WEB", "MOVIL"]).default("WEB"),
      codigoMfa: z
        .string()
        .regex(/^\d{6}$/)
        .optional(),
    })
    .parse(req.body);

  const usuario = await prisma.usuario.findUnique({
    where: { correo: datos.correo },
  });
  if (usuario?.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
    throw new ErrorAplicacion(
      "CUENTA_BLOQUEADA",
      "La cuenta esta bloqueada temporalmente por varios intentos fallidos.",
      423,
    );
  }
  const valido = usuario
    ? await argon2.verify(usuario.hashContrasena, datos.contrasena)
    : false;
  if (!usuario || !valido || !usuario.activo) {
    if (usuario?.activo) {
      await registrarIntentoFallido(usuario.id);
    }
    throw new ErrorAplicacion(
      "CREDENCIALES_INVALIDAS",
      "Correo o contrasena incorrectos.",
      401,
    );
  }

  if (
    datos.cliente === "WEB" &&
    (usuario.rol === "ALMACENISTA" || usuario.rol === "COBRADOR")
  )
    throw new ErrorAplicacion(
      "ROL_EXCLUSIVO_MOVIL",
      "Este puesto opera únicamente desde la aplicación móvil de Vektra.",
      403,
    );

  if (usuario.mfaHabilitado) {
    if (!datos.codigoMfa) {
      res.status(202).json({ mfaRequerido: true });
      return;
    }
    const secreto = usuario.mfaSecretoCifrado
      ? descifrarCampo(usuario.mfaSecretoCifrado)
      : "";
    const contador = validarCodigoMfa(secreto, datos.codigoMfa);
    if (
      contador === null ||
      (usuario.mfaUltimoContador !== null &&
        contador <= usuario.mfaUltimoContador)
    )
      throw new ErrorAplicacion(
        "MFA_INVALIDO",
        "El codigo de autenticacion es incorrecto o ya fue utilizado.",
        401,
      );
    const actualizado = await prisma.usuario.updateMany({
      where: {
        id: usuario.id,
        OR: [
          { mfaUltimoContador: null },
          { mfaUltimoContador: { lt: contador } },
        ],
      },
      data: { mfaUltimoContador: contador },
    });
    if (actualizado.count !== 1)
      throw new ErrorAplicacion(
        "MFA_REUTILIZADO",
        "El codigo ya fue utilizado. Espere al siguiente codigo.",
        409,
      );
  }

  await prepararInicioExitoso(usuario.id);
  const usuarioVigente = await prisma.usuario.findUniqueOrThrow({
    where: { id: usuario.id },
  });
  const tokens = await emitirSesion(
    req,
    res,
    usuarioVigente,
    datos.cliente === "MOVIL",
  );

  res.json({
    usuario: usuarioPublico(usuarioVigente),
    ...(datos.cliente === "MOVIL"
      ? { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }
      : { csrfToken: tokens.csrfToken }),
  });
});

rutasAutenticacion.post("/renovar", async (req, res) => {
  const refreshToken = req.cookies?.refresh_token ?? req.body?.refreshToken;
  if (!refreshToken)
    throw new ErrorAplicacion(
      "REFRESCO_INVALIDO",
      "No existe una sesion renovable.",
      401,
    );

  try {
    validarTokenRefresco(refreshToken);
  } catch {
    throw new ErrorAplicacion(
      "REFRESCO_INVALIDO",
      "La sesion ya no es valida.",
      401,
    );
  }

  const sesion = await prisma.sesion.findUnique({
    where: { hashToken: hashToken(refreshToken) },
    include: { usuario: true },
  });
  if (!sesion || sesion.expiraEn < new Date() || !sesion.usuario.activo) {
    throw new ErrorAplicacion(
      "REFRESCO_INVALIDO",
      "La sesion ya no es valida.",
      401,
    );
  }
  if (sesion.revocadaEn) {
    await prisma.sesion.updateMany({
      where: { familiaId: sesion.familiaId, revocadaEn: null },
      data: { revocadaEn: new Date() },
    });
    throw new ErrorAplicacion(
      "REFRESCO_REUTILIZADO",
      "Se detectó reutilización del token. Toda la familia de sesiones fue revocada.",
      401,
    );
  }

  const movil = Boolean(req.body?.refreshToken);
  const tokens = await emitirSesion(
    req,
    res,
    sesion.usuario,
    movil,
    sesion.id,
    sesion.familiaId,
  );
  res.json({
    usuario: usuarioPublico(sesion.usuario),
    ...(movil
      ? { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }
      : { csrfToken: tokens.csrfToken }),
  });
});

rutasAutenticacion.post("/cerrar-sesion", async (req, res) => {
  const refreshToken = req.cookies?.refresh_token ?? req.body?.refreshToken;
  if (refreshToken) {
    await prisma.sesion.updateMany({
      where: { hashToken: hashToken(refreshToken) },
      data: { revocadaEn: new Date() },
    });
  }
  res.clearCookie("access_token", opcionesCookie);
  res.clearCookie("refresh_token", opcionesCookie);
  res.clearCookie("csrf_token", { path: "/" });
  res.status(204).send();
});

rutasAutenticacion.get("/sesion", autenticar, async (req, res) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuario!.id },
    select: {
      id: true,
      nombre: true,
      correo: true,
      rol: true,
      debeCambiarContrasena: true,
      mfaHabilitado: true,
    },
  });
  if (!usuario)
    throw new ErrorAplicacion(
      "USUARIO_NO_ENCONTRADO",
      "El usuario ya no existe.",
      401,
    );
  res.json({ usuario, csrfToken: req.cookies?.csrf_token });
});

rutasAutenticacion.post("/cambiar-contrasena", autenticar, async (req, res) => {
  const datos = z
    .object({
      contrasenaActual: z.string().min(6),
      nuevaContrasena: esquemaContrasenaSegura,
    })
    .refine((valor) => valor.contrasenaActual !== valor.nuevaContrasena, {
      message: "La nueva contrasena debe ser diferente.",
      path: ["nuevaContrasena"],
    })
    .parse(req.body);

  const usuario = await prisma.usuario.findUniqueOrThrow({
    where: { id: req.usuario!.id },
  });
  if (!(await argon2.verify(usuario.hashContrasena, datos.contrasenaActual))) {
    throw new ErrorAplicacion(
      "CONTRASENA_INVALIDA",
      "La contrasena actual no coincide.",
      422,
    );
  }
  const hashContrasena = await crearHashContrasena(datos.nuevaContrasena);
  await prisma.$transaction([
    prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        hashContrasena,
        debeCambiarContrasena: false,
        tokenVersion: { increment: 1 },
      },
    }),
    prisma.sesion.updateMany({
      where: { usuarioId: usuario.id, revocadaEn: null },
      data: { revocadaEn: new Date() },
    }),
  ]);
  res.status(204).send();
});

rutasAutenticacion.post("/mfa/iniciar", autenticar, async (req, res) => {
  if (req.usuario!.rol !== "ADMINISTRADOR")
    throw new ErrorAplicacion(
      "MFA_SOLO_ADMIN",
      "El segundo factor se habilita primero para administradores.",
      403,
    );
  const usuario = await prisma.usuario.findUniqueOrThrow({
    where: { id: req.usuario!.id },
  });
  if (usuario.mfaHabilitado)
    throw new ErrorAplicacion(
      "MFA_YA_HABILITADO",
      "El segundo factor ya esta habilitado.",
      409,
    );
  const secreto = generarSecretoMfa();
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { mfaSecretoCifrado: cifrarCampo(secreto), mfaUltimoContador: null },
  });
  res.json({
    secreto,
    uri: uriConfiguracionMfa(usuario.correo, secreto),
    instrucciones:
      "Agregue esta clave en su aplicacion autenticadora y confirme con el codigo de seis digitos.",
  });
});

rutasAutenticacion.post("/mfa/confirmar", autenticar, async (req, res) => {
  const { codigo } = z
    .object({ codigo: z.string().regex(/^\d{6}$/) })
    .parse(req.body);
  const usuario = await prisma.usuario.findUniqueOrThrow({
    where: { id: req.usuario!.id },
  });
  if (!usuario.mfaSecretoCifrado)
    throw new ErrorAplicacion(
      "MFA_NO_INICIADO",
      "Primero genere la configuracion del segundo factor.",
      409,
    );
  const contador = validarCodigoMfa(
    descifrarCampo(usuario.mfaSecretoCifrado),
    codigo,
  );
  if (contador === null)
    throw new ErrorAplicacion(
      "MFA_INVALIDO",
      "El codigo de autenticacion no es valido.",
      422,
    );
  await prisma.$transaction([
    prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        mfaHabilitado: true,
        mfaUltimoContador: contador,
        tokenVersion: { increment: 1 },
      },
    }),
    prisma.sesion.updateMany({
      where: { usuarioId: usuario.id, revocadaEn: null },
      data: { revocadaEn: new Date() },
    }),
    prisma.auditoria.create({
      data: {
        usuarioId: usuario.id,
        accion: "HABILITAR_MFA",
        entidad: "Usuario",
        entidadId: usuario.id,
      },
    }),
  ]);
  res.status(204).send();
});

rutasAutenticacion.post("/mfa/deshabilitar", autenticar, async (req, res) => {
  const { contrasena, codigo } = z
    .object({
      contrasena: z.string().min(6),
      codigo: z.string().regex(/^\d{6}$/),
    })
    .parse(req.body);
  const usuario = await prisma.usuario.findUniqueOrThrow({
    where: { id: req.usuario!.id },
  });
  const contador = usuario.mfaSecretoCifrado
    ? validarCodigoMfa(descifrarCampo(usuario.mfaSecretoCifrado), codigo)
    : null;
  if (
    !(await argon2.verify(usuario.hashContrasena, contrasena)) ||
    contador === null
  )
    throw new ErrorAplicacion(
      "CONFIRMACION_INVALIDA",
      "La contrasena o el codigo MFA no son validos.",
      422,
    );
  await prisma.$transaction([
    prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        mfaHabilitado: false,
        mfaSecretoCifrado: null,
        mfaUltimoContador: null,
        tokenVersion: { increment: 1 },
      },
    }),
    prisma.sesion.updateMany({
      where: { usuarioId: usuario.id },
      data: { revocadaEn: new Date() },
    }),
    prisma.auditoria.create({
      data: {
        usuarioId: usuario.id,
        accion: "DESHABILITAR_MFA",
        entidad: "Usuario",
        entidadId: usuario.id,
      },
    }),
  ]);
  res.status(204).send();
});
