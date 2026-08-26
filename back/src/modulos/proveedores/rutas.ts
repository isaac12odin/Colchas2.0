import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../infraestructura/prisma.js";
import { autenticar, permitirPermiso } from "../../seguridad/middlewares.js";
import { auditar } from "../../compartido/auditoria.js";

export const rutasProveedores = Router();
rutasProveedores.use(autenticar);

const esquemaProveedor = z.object({
  nombre: z.string().trim().min(2).max(180),
  contacto: z.string().trim().max(180).nullable().optional(),
  telefono: z.string().trim().max(30).nullable().optional(),
  correo: z.string().trim().email().max(180).nullable().optional(),
  rfc: z.string().trim().max(20).nullable().optional(),
  notas: z.string().trim().max(1000).nullable().optional(),
  activo: z.boolean().optional(),
});

rutasProveedores.get(
  "/opciones",
  permitirPermiso("PROVEEDORES_SELECCIONAR"),
  async (_req, res) => {
    const datos = await prisma.proveedor.findMany({
      where: { activo: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    });
    res.json({ datos });
  },
);

rutasProveedores.get(
  "/",
  permitirPermiso("PROVEEDORES_CONSULTAR"),
  async (req, res) => {
    const incluirInactivos = req.query.incluirInactivos === "true";
    const datos = await prisma.proveedor.findMany({
      where: incluirInactivos ? {} : { activo: true },
      include: { _count: { select: { compras: true, itemsPedido: true } } },
      orderBy: { nombre: "asc" },
    });
    res.json({ datos });
  },
);

rutasProveedores.post(
  "/",
  permitirPermiso("PROVEEDORES_GESTIONAR"),
  async (req, res) => {
    const datos = esquemaProveedor.parse(req.body);
    const proveedor = await prisma.proveedor.create({ data: datos });
    await auditar(
      req,
      "CREAR",
      "Proveedor",
      proveedor.id,
      undefined,
      proveedor,
    );
    res.status(201).json(proveedor);
  },
);

rutasProveedores.patch(
  "/:id",
  permitirPermiso("PROVEEDORES_GESTIONAR"),
  async (req, res) => {
    const datos = esquemaProveedor.partial().parse(req.body);
    const antes = await prisma.proveedor.findUniqueOrThrow({
      where: { id: String(req.params.id) },
    });
    const proveedor = await prisma.proveedor.update({
      where: { id: antes.id },
      data: datos,
    });
    await auditar(
      req,
      "ACTUALIZAR",
      "Proveedor",
      proveedor.id,
      antes,
      proveedor,
    );
    res.json(proveedor);
  },
);
