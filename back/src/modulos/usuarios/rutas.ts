import { Router } from "express";
import argon2 from "argon2";
import { RolUsuario } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../infraestructura/prisma.js";
import { autenticar, permitir } from "../../seguridad/middlewares.js";
import { ErrorAplicacion } from "../../compartido/errores.js";
import { auditar } from "../../compartido/auditoria.js";

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

rutasUsuarios.get("/", async (_req, res) => {
  const usuarios = await prisma.usuario.findMany({
    select: camposPublicos,
    orderBy: { nombre: "asc" },
  });
  res.json({ datos: usuarios });
});

rutasUsuarios.post("/", async (req, res) => {
  const datos = z
    .object({
      nombre: z.string().trim().min(3).max(120),
      correo: z
        .string()
        .email()
        .transform((valor) => valor.toLowerCase()),
      contrasenaTemporal: z.string().min(12).max(200),
      rol: z.nativeEnum(RolUsuario),
    })
    .parse(req.body);

  const usuario = await prisma.usuario.create({
    data: {
      nombre: datos.nombre,
      correo: datos.correo,
      hashContrasena: await argon2.hash(datos.contrasenaTemporal, {
        type: argon2.argon2id,
        memoryCost: 65_536,
        timeCost: 3,
      }),
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
  const antes = await prisma.usuario.findUniqueOrThrow({
    where: { id: String(req.params.id) },
  });
  const usuario = await prisma.usuario.update({
    where: { id: String(req.params.id) },
    data: datos,
    select: camposPublicos,
  });
  if (datos.activo === false) {
    await prisma.sesion.updateMany({
      where: { usuarioId: usuario.id },
      data: { revocadaEn: new Date() },
    });
  }
  await auditar(req, "ACTUALIZAR", "Usuario", usuario.id, antes, usuario);
  res.json(usuario);
});
