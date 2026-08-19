import { Router } from "express";
import { RolUsuario } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../infraestructura/prisma.js";
import { autenticar, permitir } from "../../seguridad/middlewares.js";
import { crearPagina, esquemaPaginacion } from "../../compartido/paginacion.js";
import { anularAbono, esquemaAbono, registrarAbono } from "./servicio.js";
import { recalcularRiesgoCliente } from "./riesgo.js";
import { filtroClientesDelActor } from "../../seguridad/alcanceDatos.js";

export const rutasAbonos = Router();
rutasAbonos.use(autenticar);

rutasAbonos.get(
  "/",
  permitir(RolUsuario.ADMINISTRADOR, RolUsuario.CONTABLE, RolUsuario.COBRADOR),
  async (req, res) => {
    const { pagina, limite, buscar } = esquemaPaginacion.parse(req.query);
    const where = {
      cliente: {
        ...filtroClientesDelActor(req.usuario!),
        ...(buscar
          ? {
              nombreCompleto: {
                contains: buscar,
                mode: "insensitive" as const,
              },
            }
          : {}),
      },
    };
    const [datos, total] = await prisma.$transaction([
      prisma.abono.findMany({
        where,
        include: {
          cliente: { select: { nombreCompleto: true, numeroTarjeta: true } },
          usuario: { select: { nombre: true } },
          aplicaciones: { include: { cuota: true } },
        },
        orderBy: { fechaAbono: "desc" },
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      prisma.abono.count({ where }),
    ]);
    res.json(crearPagina(datos, total, pagina, limite));
  },
);

rutasAbonos.post(
  "/",
  permitir(RolUsuario.ADMINISTRADOR, RolUsuario.CONTABLE, RolUsuario.COBRADOR),
  async (req, res) => {
    const abono = await registrarAbono(
      req.usuario!,
      esquemaAbono.parse(req.body),
    );
    res.status(abono.idempotente ? 200 : 201).json(abono);
  },
);

rutasAbonos.post(
  "/riesgo/recalcular",
  permitir(RolUsuario.ADMINISTRADOR, RolUsuario.CONTABLE),
  async (req, res) => {
    const datos = z
      .object({ clienteId: z.string().uuid().optional() })
      .parse(req.body);
    const ids = datos.clienteId
      ? [datos.clienteId]
      : (
          await prisma.cliente.findMany({
            where: { activo: true, saldo: { saldoActual: { gt: 0 } } },
            select: { id: true },
          })
        ).map((cliente) => cliente.id);
    const evaluaciones = [];
    for (const id of ids) {
      evaluaciones.push(
        await prisma.$transaction((tx) => recalcularRiesgoCliente(tx, id)),
      );
    }
    res.json({ total: evaluaciones.length, datos: evaluaciones });
  },
);

rutasAbonos.post(
  "/:id/anular",
  permitir(RolUsuario.ADMINISTRADOR, RolUsuario.CONTABLE),
  async (req, res) => {
    const { motivo } = z
      .object({ motivo: z.string().trim().min(10).max(500) })
      .parse(req.body);
    res.json(await anularAbono(req.usuario!.id, String(req.params.id), motivo));
  },
);
