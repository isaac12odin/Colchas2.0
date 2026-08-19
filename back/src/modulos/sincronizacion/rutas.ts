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
rutasSincronizacion.use(
  autenticar,
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
      actualizadoEn: true,
    },
    orderBy: [{ marca: "asc" }, { nombre: "asc" }],
  });
  res.json({ datos, generadoEn: new Date() });
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
