import { Router } from "express";
import { RolUsuario } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../infraestructura/prisma.js";
import { autenticar, permitirPermiso } from "../../seguridad/middlewares.js";
import { crearPagina, esquemaPaginacion } from "../../compartido/paginacion.js";
import { ErrorAplicacion } from "../../compartido/errores.js";
import { calcularCorte, cerrarCorte } from "./servicio.js";

export const rutasCortes = Router();
rutasCortes.use(autenticar, permitirPermiso("CORTES_CONSULTAR"));

function protegerOperador(rol: RolUsuario, usuarioId: string, solicitado: string) {
  if (rol === RolUsuario.COBRADOR && usuarioId !== solicitado)
    throw new ErrorAplicacion(
      "OPERADOR_PROHIBIDO",
      "El cobrador solo puede consultar y cerrar su propia jornada.",
      403,
    );
}

rutasCortes.get("/operadores", async (req, res) => {
  const datos = await prisma.usuario.findMany({
    where:
      req.usuario!.rol === RolUsuario.COBRADOR
        ? { id: req.usuario!.id }
        : { activo: true, rol: { in: [RolUsuario.COBRADOR, RolUsuario.ADMINISTRADOR] } },
    select: { id: true, nombre: true, rol: true },
    orderBy: { nombre: "asc" },
  });
  res.json({ datos });
});

rutasCortes.get("/previsualizar", async (req, res) => {
  const datos = z
    .object({ usuarioOperadorId: z.string().uuid(), fecha: z.string() })
    .parse(req.query);
  protegerOperador(req.usuario!.rol, req.usuario!.id, datos.usuarioOperadorId);
  res.json(await calcularCorte(datos.usuarioOperadorId, datos.fecha));
});

rutasCortes.get("/", async (req, res) => {
  const { pagina, limite } = esquemaPaginacion.parse(req.query);
  const where =
    req.usuario!.rol === RolUsuario.COBRADOR
      ? { usuarioOperadorId: req.usuario!.id }
      : {};
  const [datos, total] = await prisma.$transaction([
    prisma.corteCaja.findMany({
      where,
      include: {
        usuarioOperador: { select: { nombre: true } },
        cerradoPor: { select: { nombre: true } },
      },
      orderBy: [{ fechaOperativa: "desc" }, { cerradoEn: "desc" }],
      skip: (pagina - 1) * limite,
      take: limite,
    }),
    prisma.corteCaja.count({ where }),
  ]);
  res.json(crearPagina(datos, total, pagina, limite));
});

rutasCortes.post("/", permitirPermiso("CORTES_CERRAR"), async (req, res) => {
  const datos = z
    .object({
      usuarioOperadorId: z.string().uuid(),
      fecha: z.string(),
      efectivo: z.coerce.number().min(0),
      transferencia: z.coerce.number().min(0),
      tarjeta: z.coerce.number().min(0),
      otro: z.coerce.number().min(0),
      firmaNombre: z.string().trim().min(3).max(180),
      confirmacion: z.string(),
      notas: z.string().trim().max(1000).optional(),
    })
    .parse(req.body);
  protegerOperador(req.usuario!.rol, req.usuario!.id, datos.usuarioOperadorId);
  if (datos.confirmacion !== `CERRAR ${datos.fecha}`)
    throw new ErrorAplicacion(
      "CONFIRMACION_INVALIDA",
      `Escriba exactamente CERRAR ${datos.fecha}.`,
      422,
    );
  const corte = await cerrarCorte(
    req.usuario!.id,
    datos.usuarioOperadorId,
    datos.fecha,
    {
      efectivo: datos.efectivo,
      transferencia: datos.transferencia,
      tarjeta: datos.tarjeta,
      otro: datos.otro,
    },
    datos.firmaNombre,
    datos.notas,
  );
  res.status(201).json(corte);
});
