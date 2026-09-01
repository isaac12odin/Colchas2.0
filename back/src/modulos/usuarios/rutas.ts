import { Router } from "express";
import argon2 from "argon2";
import { RolUsuario } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../infraestructura/prisma.js";
import { autenticar, permitir } from "../../seguridad/middlewares.js";
import { ErrorAplicacion } from "../../compartido/errores.js";
import { auditar } from "../../compartido/auditoria.js";
import { crearPagina, esquemaPaginacion } from "../../compartido/paginacion.js";
import {
  crearHashContrasena,
  esquemaContrasenaSegura,
} from "../../seguridad/contrasenas.js";

export const rutasUsuarios = Router();
rutasUsuarios.use(autenticar, permitir(RolUsuario.ADMINISTRADOR));

const camposPublicos = {
  id: true,
  nombre: true,
  correo: true,
  rol: true,
  activo: true,
  debeCambiarContrasena: true,
  ultimoAcceso: true,
  creadoEn: true,
} as const;

export const esquemaConsultaUsuarios = esquemaPaginacion.extend({
  rol: z.nativeEnum(RolUsuario).optional(),
  activo: z
    .enum(["true", "false"])
    .transform((valor) => valor === "true")
    .optional(),
});

rutasUsuarios.get("/", async (req, res) => {
  const { pagina, limite, buscar, rol, activo } = esquemaConsultaUsuarios.parse(
    req.query,
  );
  const where = {
    ...(rol ? { rol } : {}),
    ...(activo !== undefined ? { activo } : {}),
    ...(buscar
      ? {
          OR: [
            {
              nombre: { contains: buscar, mode: "insensitive" as const },
            },
            {
              correo: { contains: buscar, mode: "insensitive" as const },
            },
          ],
        }
      : {}),
  };
  const [usuarios, total] = await prisma.$transaction([
    prisma.usuario.findMany({
      where,
      select: camposPublicos,
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
      skip: (pagina - 1) * limite,
      take: limite,
    }),
    prisma.usuario.count({ where }),
  ]);
  res.json(crearPagina(usuarios, total, pagina, limite));
});

rutasUsuarios.post("/", async (req, res) => {
  const datos = z
    .object({
      nombre: z.string().trim().min(3).max(120),
      correo: z
        .string()
        .email()
        .transform((valor) => valor.toLowerCase()),
      contrasenaTemporal: esquemaContrasenaSegura,
      rol: z.nativeEnum(RolUsuario),
    })
    .parse(req.body);

  const usuario = await prisma.usuario.create({
    data: {
      nombre: datos.nombre,
      correo: datos.correo,
      hashContrasena: await crearHashContrasena(datos.contrasenaTemporal),
      rol: datos.rol,
      debeCambiarContrasena: true,
    },
    select: camposPublicos,
  });
  await auditar(req, "CREAR", "Usuario", usuario.id, undefined, usuario);
  res.status(201).json(usuario);
});

rutasUsuarios.patch("/:id", async (req, res) => {
  const datos = z
    .object({
      nombre: z.string().trim().min(3).max(120).optional(),
      rol: z.nativeEnum(RolUsuario).optional(),
      activo: z.boolean().optional(),
    })
    .parse(req.body);
  if (String(req.params.id) === req.usuario!.id && datos.activo === false) {
    throw new ErrorAplicacion(
      "AUTO_BLOQUEO",
      "No puede desactivar su propio usuario.",
      422,
    );
  }
  const { antes, usuario } = await prisma.$transaction(async (tx) => {
    // Este candado global serializa todas las degradaciones/desactivaciones.
    // Contar sin él permitiría que dos solicitudes dejaran cero administradores.
    await tx.$queryRaw`
      SELECT 1::integer AS bloqueado
      FROM (
        SELECT pg_advisory_xact_lock(hashtext('nexo:administradores-activos'))
      ) AS candado
    `;
    // La autorización del middleware pudo quedar obsoleta mientras esta
    // solicitud esperaba el candado. Releer al actor impide que dos
    // administradores ya admitidos se degraden mutuamente en paralelo.
    const autorizadorActual = await tx.usuario.findUnique({
      where: { id: req.usuario!.id },
      select: { activo: true, rol: true },
    });
    if (
      !autorizadorActual?.activo ||
      autorizadorActual.rol !== RolUsuario.ADMINISTRADOR
    ) {
      throw new ErrorAplicacion(
        "AUTORIZACION_REVOCADA",
        "La autorización administrativa cambió mientras se procesaba la solicitud. Actualice la sesión.",
        422,
      );
    }
    const antes = await tx.usuario.findUniqueOrThrow({
      where: { id: String(req.params.id) },
    });
    if (
      antes.id === req.usuario!.id &&
      datos.rol !== undefined &&
      datos.rol !== antes.rol
    ) {
      throw new ErrorAplicacion(
        "AUTO_CAMBIO_ROL",
        "No puede cambiar su propio rol.",
        422,
      );
    }
    if (
      antes.activo &&
      antes.rol === RolUsuario.ADMINISTRADOR &&
      ((datos.rol !== undefined && datos.rol !== RolUsuario.ADMINISTRADOR) ||
        datos.activo === false)
    ) {
      const administradoresActivos = await tx.usuario.count({
        where: { rol: RolUsuario.ADMINISTRADOR, activo: true },
      });
      if (administradoresActivos <= 1) {
        throw new ErrorAplicacion(
          "ULTIMO_ADMINISTRADOR",
          "Debe conservar al menos un administrador activo.",
          422,
        );
      }
    }
    const usuario = await tx.usuario.update({
      where: { id: String(req.params.id) },
      data: {
        ...datos,
        ...(datos.activo === false || datos.rol !== undefined
          ? { tokenVersion: { increment: 1 } }
          : {}),
      },
      select: camposPublicos,
    });
    if (datos.activo === false || datos.rol !== undefined) {
      await tx.sesion.updateMany({
        where: { usuarioId: usuario.id, revocadaEn: null },
        data: { revocadaEn: new Date() },
      });
    }
    return { antes, usuario };
  });
  await auditar(req, "ACTUALIZAR", "Usuario", usuario.id, antes, usuario);
  res.json(usuario);
});

rutasUsuarios.post("/:id/restablecer-contrasena", async (req, res) => {
  const datos = z
    .object({
      contrasenaAdministrador: z.string().min(6).max(200),
      contrasenaTemporal: esquemaContrasenaSegura,
    })
    .parse(req.body);
  const usuarioId = String(req.params.id);
  const [administrador, objetivo] = await Promise.all([
    prisma.usuario.findUniqueOrThrow({ where: { id: req.usuario!.id } }),
    prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } }),
  ]);
  if (
    !(await argon2.verify(
      administrador.hashContrasena,
      datos.contrasenaAdministrador,
    ))
  ) {
    throw new ErrorAplicacion(
      "CONTRASENA_INVALIDA",
      "La contrasena del administrador no coincide.",
      422,
    );
  }

  const hashContrasena = await crearHashContrasena(datos.contrasenaTemporal);
  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({
      where: { id: objetivo.id },
      data: {
        hashContrasena,
        debeCambiarContrasena: true,
        intentosFallidos: 0,
        bloqueadoHasta: null,
        tokenVersion: { increment: 1 },
      },
    });
    await tx.sesion.updateMany({
      where: { usuarioId: objetivo.id, revocadaEn: null },
      data: { revocadaEn: new Date() },
    });
    await tx.auditoria.create({
      data: {
        usuarioId: req.usuario!.id,
        accion: "RESTABLECER_CONTRASENA",
        entidad: "Usuario",
        entidadId: objetivo.id,
        datosAntes: { debeCambiarContrasena: objetivo.debeCambiarContrasena },
        datosDespues: {
          debeCambiarContrasena: true,
          sesionesRevocadas: true,
        },
        ip: req.ip,
      },
    });
  });
  res.status(204).send();
});
