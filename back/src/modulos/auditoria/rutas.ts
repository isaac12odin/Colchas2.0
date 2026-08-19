import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../infraestructura/prisma.js";
import { autenticar, permitirPermiso } from "../../seguridad/middlewares.js";
import { crearPagina, esquemaPaginacion } from "../../compartido/paginacion.js";

export const rutasAuditoria = Router();
rutasAuditoria.use(autenticar, permitirPermiso("AUDITORIA_CONSULTAR"));

rutasAuditoria.get("/", async (req, res) => {
  const { pagina, limite, buscar } = esquemaPaginacion.parse(req.query);
  const filtros = z
    .object({ entidad: z.string().max(80).optional(), accion: z.string().max(80).optional() })
    .parse(req.query);
  const where = {
    ...(filtros.entidad ? { entidad: filtros.entidad } : {}),
    ...(filtros.accion ? { accion: filtros.accion } : {}),
    ...(buscar
      ? {
          OR: [
            { entidad: { contains: buscar, mode: "insensitive" as const } },
            { accion: { contains: buscar, mode: "insensitive" as const } },
            { usuario: { nombre: { contains: buscar, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };
  const [datos, total] = await prisma.$transaction([
    prisma.auditoria.findMany({
      where,
      include: { usuario: { select: { nombre: true, correo: true } } },
      orderBy: { creadoEn: "desc" },
      skip: (pagina - 1) * limite,
      take: limite,
    }),
    prisma.auditoria.count({ where }),
  ]);
  res.json(crearPagina(datos, total, pagina, limite));
});
