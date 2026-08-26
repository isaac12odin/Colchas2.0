import { RolUsuario } from "@prisma/client";
import { Router } from "express";

import { prisma } from "../../infraestructura/prisma.js";
import { autenticar, permitir } from "../../seguridad/middlewares.js";
import { esquemaLoteSincronizacion } from "./esquemas.js";
import { sincronizarLote } from "./procesador.js";
import { z } from "zod";
import { cifrarCampo, descifrarCampo } from "../../compartido/cifrado.js";
import { ErrorAplicacion } from "../../compartido/errores.js";
import { hashesIguales } from "./integridad.js";

export const rutasSincronizacion = Router();
rutasSincronizacion.use(autenticar);

rutasSincronizacion.get(
  "/revisiones",
  permitir(RolUsuario.ADMINISTRADOR, RolUsuario.CONTABLE),
  async (req, res) => {
    const pendientes = req.query.pendientes !== "false";
    const datos = await prisma.operacionSincronizada.findMany({
      where: pendientes ? { requiereRevision: true } : {},
      select: {
        id: true,
        idOperacion: true,
        tipo: true,
        estado: true,
        codigoError: true,
        mensajeError: true,
        dispositivoId: true,
        creadaEnCliente: true,
        procesadaEn: true,
        diferenciaRelojSegundos: true,
        requiereRevision: true,
        revisadaEn: true,
        resolucion: true,
        operacionCompensatoriaId: true,
        usuario: { select: { id: true, nombre: true, correo: true } },
        revisadaPor: { select: { id: true, nombre: true } },
      },
      orderBy: { procesadaEn: "desc" },
      take: 200,
    });
    res.json({ datos });
  },
);

rutasSincronizacion.patch(
  "/revisiones/:id/resolver",
  permitir(RolUsuario.ADMINISTRADOR, RolUsuario.CONTABLE),
  async (req, res) => {
    const datos = z
      .object({
        resolucion: z.string().trim().min(10).max(1000),
        operacionCompensatoriaId: z.string().trim().min(8).max(100).optional(),
      })
      .parse(req.body);
    const operacion = await prisma.$transaction(async (tx) => {
      const actual = await tx.operacionSincronizada.findUniqueOrThrow({
        where: { id: String(req.params.id) },
      });
      if (actual.estado !== "RECHAZADA")
        throw new ErrorAplicacion(
          "REVISION_NO_APLICA",
          "Sólo una operación rechazada puede cerrarse mediante revisión.",
          422,
        );
      if (!actual.requiereRevision)
        throw new ErrorAplicacion(
          "REVISION_YA_RESUELTA",
          "La operación ya tiene una resolución administrativa.",
          409,
        );
      const actualizada = await tx.operacionSincronizada.update({
        where: { id: actual.id },
        data: {
          requiereRevision: false,
          revisadaEn: new Date(),
          revisadaPorId: req.usuario!.id,
          resolucion: datos.resolucion,
          operacionCompensatoriaId: datos.operacionCompensatoriaId,
        },
      });
      await tx.auditoria.create({
        data: {
          usuarioId: req.usuario!.id,
          accion: "RESOLVER_RECHAZO_OFFLINE",
          entidad: "OperacionSincronizada",
          entidadId: actual.id,
          datosAntes: {
            codigoError: actual.codigoError,
            requiereRevision: true,
          },
          datosDespues: {
            resolucion: datos.resolucion,
            operacionCompensatoriaId: datos.operacionCompensatoriaId,
          },
        },
      });
      return actualizada;
    });
    res.json(operacion);
  },
);

rutasSincronizacion.post(
  "/dispositivos/:id/reemplazar",
  permitir(RolUsuario.ADMINISTRADOR),
  async (req, res) => {
    const datos = z
      .object({
        dispositivoId: z.string().trim().min(3).max(120),
        claveIntegridad: z.string().regex(/^[a-f0-9]{64}$/i),
        usuarioId: z.string().uuid().optional(),
        motivo: z.string().trim().min(10).max(500),
      })
      .parse(req.body);
    const reemplazo = await prisma.$transaction(async (tx) => {
      const anterior = await tx.dispositivoSincronizacion.findUniqueOrThrow({
        where: { id: String(req.params.id) },
      });
      const usuarioId = datos.usuarioId ?? anterior.usuarioId;
      const operador = await tx.usuario.findFirst({
        where: {
          id: usuarioId,
          activo: true,
          rol: { in: [RolUsuario.ADMINISTRADOR, RolUsuario.COBRADOR] },
        },
        select: { id: true },
      });
      if (!operador)
        throw new ErrorAplicacion(
          "OPERADOR_DISPOSITIVO_INVALIDO",
          "El nuevo responsable debe ser administrador o cobrador activo.",
          422,
        );
      const activosDestino = await tx.dispositivoSincronizacion.count({
        where: {
          usuarioId,
          activo: true,
          ...(usuarioId === anterior.usuarioId
            ? { id: { not: anterior.id } }
            : {}),
        },
      });
      if (activosDestino >= 5)
        throw new ErrorAplicacion(
          "LIMITE_DISPOSITIVOS",
          "El nuevo responsable ya tiene cinco equipos activos.",
          409,
        );
      await tx.dispositivoSincronizacion.update({
        where: { id: anterior.id },
        data: { activo: false },
      });
      const nuevo = await tx.dispositivoSincronizacion.create({
        data: {
          usuarioId,
          dispositivoId: datos.dispositivoId,
          claveIntegridadCifrada: cifrarCampo(datos.claveIntegridad),
        },
      });
      await tx.auditoria.create({
        data: {
          usuarioId: req.usuario!.id,
          accion: "REEMPLAZAR_DISPOSITIVO",
          entidad: "DispositivoSincronizacion",
          entidadId: nuevo.id,
          datosAntes: {
            id: anterior.id,
            dispositivoId: anterior.dispositivoId,
            usuarioId: anterior.usuarioId,
            ultimaSecuencia: anterior.ultimaSecuencia,
            ultimoHash: anterior.ultimoHash,
          },
          datosDespues: {
            dispositivoId: nuevo.dispositivoId,
            usuarioId,
            motivo: datos.motivo,
            cadenaNueva: "GENESIS",
          },
        },
      });
      return nuevo;
    });
    res.status(201).json({
      id: reemplazo.id,
      dispositivoId: reemplazo.dispositivoId,
      usuarioId: reemplazo.usuarioId,
      ultimaSecuencia: reemplazo.ultimaSecuencia,
      ultimoHash: reemplazo.ultimoHash,
    });
  },
);

rutasSincronizacion.use(
  permitir(RolUsuario.ADMINISTRADOR, RolUsuario.COBRADOR),
);

// Catálogo mínimo para la venta en campo. Nunca expone el costo de compra.
rutasSincronizacion.get("/catalogo", async (_req, res) => {
  const datos = await prisma.producto.findMany({
    where: { activo: true },
    select: {
      id: true,
      sku: true,
      nombre: true,
      marca: true,
      categoria: true,
      codigoBarras: true,
      codigoQr: true,
      existencia: true,
      precioVenta: true,
      fotoMime: true,
      fotoActualizadaEn: true,
      actualizadoEn: true,
    },
    orderBy: [{ marca: "asc" }, { nombre: "asc" }],
  });
  res.json({
    datos: datos.map(({ fotoMime, ...producto }) => ({
      ...producto,
      tieneFoto: Boolean(fotoMime),
    })),
    generadoEn: new Date(),
  });
});

rutasSincronizacion.post("/dispositivos/registrar", async (req, res) => {
  const datos = z
    .object({
      dispositivoId: z.string().trim().min(3).max(120),
      claveIntegridad: z.string().regex(/^[a-f0-9]{64}$/i),
    })
    .parse(req.body);
  const dispositivo = await prisma.$transaction(async (tx) => {
    const existente = await tx.dispositivoSincronizacion.findUnique({
      where: {
        usuarioId_dispositivoId: {
          usuarioId: req.usuario!.id,
          dispositivoId: datos.dispositivoId,
        },
      },
    });
    if (existente) {
      if (!existente.activo)
        throw new ErrorAplicacion(
          "DISPOSITIVO_REVOCADO",
          "Este equipo fue revocado por un administrador.",
          403,
        );
      const registrada = descifrarCampo(existente.claveIntegridadCifrada);
      if (!hashesIguales(registrada, datos.claveIntegridad))
        throw new ErrorAplicacion(
          "CLAVE_DISPOSITIVO_NO_COINCIDE",
          "La identidad criptográfica del equipo cambió. Requiere autorización administrativa.",
          409,
        );
      return existente;
    }
    const total = await tx.dispositivoSincronizacion.count({
      where: { usuarioId: req.usuario!.id, activo: true },
    });
    if (total >= 5)
      throw new ErrorAplicacion(
        "LIMITE_DISPOSITIVOS",
        "Se alcanzó el límite de equipos autorizados para este usuario.",
        409,
      );
    const creado = await tx.dispositivoSincronizacion.create({
      data: {
        usuarioId: req.usuario!.id,
        dispositivoId: datos.dispositivoId,
        claveIntegridadCifrada: cifrarCampo(datos.claveIntegridad),
      },
    });
    await tx.auditoria.create({
      data: {
        usuarioId: req.usuario!.id,
        accion: "REGISTRAR_DISPOSITIVO",
        entidad: "DispositivoSincronizacion",
        entidadId: creado.id,
        datosDespues: { dispositivoId: datos.dispositivoId },
      },
    });
    return creado;
  });
  res.status(200).json({
    dispositivoId: dispositivo.dispositivoId,
    ultimaSecuencia: dispositivo.ultimaSecuencia,
    ultimoHash: dispositivo.ultimoHash,
  });
});

rutasSincronizacion.get("/dispositivos", async (req, res) => {
  const usuarioId =
    req.usuario!.rol === RolUsuario.ADMINISTRADOR
      ? z.string().uuid().optional().parse(req.query.usuarioId)
      : req.usuario!.id;
  const datos = await prisma.dispositivoSincronizacion.findMany({
    where: usuarioId ? { usuarioId } : {},
    select: {
      id: true,
      usuarioId: true,
      dispositivoId: true,
      ultimaSecuencia: true,
      ultimoHash: true,
      activo: true,
      registradoEn: true,
      ultimoUsoEn: true,
      usuario: { select: { nombre: true, correo: true } },
    },
    orderBy: { registradoEn: "desc" },
  });
  res.json({ datos });
});

rutasSincronizacion.patch(
  "/dispositivos/:id/revocar",
  permitir(RolUsuario.ADMINISTRADOR),
  async (req, res) => {
    const dispositivo = await prisma.$transaction(async (tx) => {
      const actualizado = await tx.dispositivoSincronizacion.update({
        where: { id: String(req.params.id) },
        data: { activo: false },
      });
      await tx.auditoria.create({
        data: {
          usuarioId: req.usuario!.id,
          accion: "REVOCAR",
          entidad: "DispositivoSincronizacion",
          entidadId: actualizado.id,
          datosDespues: { dispositivoId: actualizado.dispositivoId },
        },
      });
      return actualizado;
    });
    res.json({
      id: dispositivo.id,
      dispositivoId: dispositivo.dispositivoId,
      activo: dispositivo.activo,
    });
  },
);

rutasSincronizacion.post("/lotes", async (req, res) => {
  const lote = esquemaLoteSincronizacion.parse(req.body);
  const resultado = await sincronizarLote(lote, req.usuario!);
  res.status(201).json(resultado);
});
