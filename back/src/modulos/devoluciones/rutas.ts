import { Router } from "express";
import { prisma } from "../../infraestructura/prisma.js";
import { autenticar, permitirPermiso } from "../../seguridad/middlewares.js";
import { crearPagina, esquemaPaginacion } from "../../compartido/paginacion.js";
import { ErrorAplicacion } from "../../compartido/errores.js";
import { esquemaDevolucion, registrarDevolucion } from "./servicio.js";

export const rutasDevoluciones = Router();
rutasDevoluciones.use(autenticar);

rutasDevoluciones.get(
  "/",
  permitirPermiso("DEVOLUCIONES_CONSULTAR"),
  async (req, res) => {
    const { pagina, limite, buscar } = esquemaPaginacion.parse(req.query);
    const where = buscar
      ? {
          OR: [
            { folio: { contains: buscar, mode: "insensitive" as const } },
            {
              venta: {
                folio: { contains: buscar, mode: "insensitive" as const },
              },
            },
            {
              cliente: {
                nombreCompleto: {
                  contains: buscar,
                  mode: "insensitive" as const,
                },
              },
            },
          ],
        }
      : {};
    const [datos, total] = await prisma.$transaction([
      prisma.devolucion.findMany({
        where,
        select: {
          id: true,
          folio: true,
          tipo: true,
          estado: true,
          motivo: true,
          totalDevuelto: true,
          aplicadoSaldo: true,
          montoReembolsado: true,
          metodoReembolso: true,
          evidenciaMime: true,
          creadoEn: true,
          venta: { select: { id: true, folio: true } },
          cliente: { select: { id: true, nombreCompleto: true } },
          autorizadoPor: { select: { nombre: true } },
          usuarioOperador: { select: { nombre: true } },
          detalles: true,
        },
        orderBy: { creadoEn: "desc" },
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      prisma.devolucion.count({ where }),
    ]);
    res.json(crearPagina(datos, total, pagina, limite));
  },
);

rutasDevoluciones.post(
  "/",
  permitirPermiso("DEVOLUCIONES_AUTORIZAR"),
  async (req, res) => {
    const devolucion = await registrarDevolucion(
      req.usuario!.id,
      esquemaDevolucion.parse(req.body),
    );
    res.status(201).json(devolucion);
  },
);

rutasDevoluciones.get(
  "/:id/evidencia",
  permitirPermiso("DEVOLUCIONES_CONSULTAR"),
  async (req, res) => {
    const evidencia = await prisma.devolucion.findUnique({
      where: { id: String(req.params.id) },
      select: {
        evidenciaContenido: true,
        evidenciaMime: true,
        evidenciaNombre: true,
        evidenciaHash: true,
      },
    });
    if (!evidencia?.evidenciaContenido || !evidencia.evidenciaMime)
      throw new ErrorAplicacion(
        "EVIDENCIA_NO_ENCONTRADA",
        "La devolucion no tiene evidencia fotografica.",
        404,
      );
    res.setHeader("Content-Type", evidencia.evidenciaMime);
    res.setHeader("Content-Disposition", `inline; filename="evidencia"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Hash", evidencia.evidenciaHash ?? "");
    res.send(Buffer.from(evidencia.evidenciaContenido));
  },
);
