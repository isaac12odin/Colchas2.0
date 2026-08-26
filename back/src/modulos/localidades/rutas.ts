import { Router } from "express";
import { RolUsuario } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../infraestructura/prisma.js";
import { autenticar, permitir } from "../../seguridad/middlewares.js";
import { auditar } from "../../compartido/auditoria.js";

export const rutasLocalidades = Router();
rutasLocalidades.use(autenticar);

rutasLocalidades.get("/", async (req, res) => {
  const incluirInactivas =
    req.usuario?.rol === RolUsuario.ADMINISTRADOR &&
    req.query.incluirInactivas === "true";
  const datos = await prisma.localidad.findMany({
    where: incluirInactivas ? {} : { activo: true },
    orderBy: [{ estado: "asc" }, { nombre: "asc" }],
  });
  res.json({ datos });
});

rutasLocalidades.post(
  "/",
  permitir(RolUsuario.ADMINISTRADOR),
  async (req, res) => {
    const datos = z
      .object({
        nombre: z.string().trim().min(2).max(120),
        estado: z.string().trim().min(2).max(120),
      })
      .parse(req.body);
    const localidad = await prisma.localidad.create({ data: datos });
    await auditar(
      req,
      "CREAR",
      "Localidad",
      localidad.id,
      undefined,
      localidad,
    );
    res.status(201).json(localidad);
  },
);

rutasLocalidades.patch(
  "/:id",
  permitir(RolUsuario.ADMINISTRADOR),
  async (req, res) => {
    const datos = z
      .object({
        nombre: z.string().trim().min(2).max(120).optional(),
        estado: z.string().trim().min(2).max(120).optional(),
        activo: z.boolean().optional(),
      })
      .parse(req.body);
    const antes = await prisma.localidad.findUniqueOrThrow({
      where: { id: String(req.params.id) },
    });
    const localidad = await prisma.localidad.update({
      where: { id: String(req.params.id) },
      data: datos,
    });
    await auditar(
      req,
      "ACTUALIZAR",
      "Localidad",
      localidad.id,
      antes,
      localidad,
    );
    res.json(localidad);
  },
);
