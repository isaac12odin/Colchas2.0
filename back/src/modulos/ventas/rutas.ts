import { Router } from "express";
import { RolUsuario } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../infraestructura/prisma.js";
import { autenticar, permitir } from "../../seguridad/middlewares.js";
import { crearPagina, esquemaPaginacion } from "../../compartido/paginacion.js";
import { crearVenta, esquemaNuevaVenta } from "./servicio.js";
import { ocultarCostosDeVenta } from "./presentacion.js";
import { filtroVentasDelActor } from "../../seguridad/alcanceDatos.js";

export const rutasVentas = Router();
rutasVentas.use(autenticar);

function rolSinCostos(rol: RolUsuario) {
  return rol === RolUsuario.COBRADOR || rol === RolUsuario.VENDEDOR;
}

rutasVentas.get(
  "/",
  permitir(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.CONTABLE,
    RolUsuario.VENDEDOR,
    RolUsuario.COBRADOR,
  ),
  async (req, res) => {
    const { pagina, limite, buscar } = esquemaPaginacion.parse(req.query);
    const tipo = z
      .enum(["CREDITO", "CONTADO", "PUBLICO"])
      .optional()
      .parse(req.query.tipo);
    const where = {
      ...filtroVentasDelActor(req.usuario!),
      ...(tipo ? { tipo } : {}),
      ...(buscar
        ? {
            OR: [
              { folio: { contains: buscar, mode: "insensitive" as const } },
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
        : {}),
    };
    const [datos, total] = await prisma.$transaction([
      prisma.venta.findMany({
        where,
        include: {
          cliente: {
            select: { id: true, nombreCompleto: true, numeroTarjeta: true },
          },
          usuario: { select: { nombre: true } },
          detalles: { include: { producto: true } },
          planPago: true,
        },
        orderBy: { fechaVenta: "desc" },
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      prisma.venta.count({ where }),
    ]);
    const datosPermitidos = rolSinCostos(req.usuario!.rol)
      ? datos.map(ocultarCostosDeVenta)
      : datos;
    res.json(crearPagina(datosPermitidos, total, pagina, limite));
  },
);

rutasVentas.post(
  "/",
  permitir(RolUsuario.ADMINISTRADOR, RolUsuario.CONTABLE, RolUsuario.VENDEDOR),
  async (req, res) => {
    const venta = await crearVenta(
      req.usuario!,
      esquemaNuevaVenta.parse(req.body),
    );
    res
      .status(201)
      .json(
        req.usuario!.rol === RolUsuario.VENDEDOR
          ? ocultarCostosDeVenta(venta)
          : venta,
      );
  },
);

rutasVentas.get(
  "/:id",
  permitir(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.CONTABLE,
    RolUsuario.VENDEDOR,
    RolUsuario.COBRADOR,
  ),
  async (req, res) => {
    const venta = await prisma.venta.findFirstOrThrow({
      where: {
        id: String(req.params.id),
        ...filtroVentasDelActor(req.usuario!),
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombreCompleto: true,
            numeroTarjeta: true,
            saldo: true,
          },
        },
        usuario: { select: { nombre: true } },
        detalles: { include: { producto: true } },
        planPago: {
          include: {
            cuotas: { include: { aplicaciones: { include: { abono: true } } } },
          },
        },
        abonos: true,
        devoluciones: {
          where: { estado: "REGISTRADA" },
          include: { detalles: true },
        },
      },
    });
    res.json(
      rolSinCostos(req.usuario!.rol) ? ocultarCostosDeVenta(venta) : venta,
    );
  },
);
