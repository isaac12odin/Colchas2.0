import { Router } from "express";
import { DiaSemana, Prisma, RolUsuario } from "@prisma/client";
import { prisma } from "../../infraestructura/prisma.js";
import { autenticar } from "../../seguridad/middlewares.js";
import { rangoDiaMexico } from "../../compartido/fechas.js";
import {
  filtroClientesDelActor,
  filtroRutasDelActor,
} from "../../seguridad/alcanceDatos.js";

export const rutasAlertas = Router();
rutasAlertas.use(autenticar);

const dias: DiaSemana[] = [
  DiaSemana.DOMINGO,
  DiaSemana.LUNES,
  DiaSemana.MARTES,
  DiaSemana.MIERCOLES,
  DiaSemana.JUEVES,
  DiaSemana.VIERNES,
  DiaSemana.SABADO,
];

rutasAlertas.get("/", async (req, res) => {
  const hoy = new Date();
  const fecha = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
  }).format(hoy);
  const { desde, hasta } = rangoDiaMexico(fecha);
  const indiceDia = new Date(`${fecha}T12:00:00.000Z`).getUTCDay();
  const rol = req.usuario!.rol;
  const puedeAlmacen =
    rol === RolUsuario.ADMINISTRADOR || rol === RolUsuario.ALMACENISTA;
  const puedeCartera =
    rol === RolUsuario.ADMINISTRADOR ||
    rol === RolUsuario.CONTABLE ||
    rol === RolUsuario.COBRADOR;
  const filtroPedidos: Prisma.PedidoVentaWhereInput = {
    estado: { notIn: ["ENTREGADO", "CANCELADO"] },
    OR: [
      { fechaCompromiso: { lt: desde } },
      { creadoEn: { lt: new Date(Date.now() - 7 * 86_400_000) } },
    ],
    cliente: filtroClientesDelActor(req.usuario!),
  };

  const [
    productos,
    totalProductos,
    clientes,
    totalClientes,
    pedidos,
    totalPedidos,
    rutas,
  ] = await Promise.all([
    puedeAlmacen
      ? prisma.producto.findMany({
          where: {
            activo: true,
            existencia: { lte: prisma.producto.fields.existenciaMinima },
          },
          select: {
            id: true,
            nombre: true,
            sku: true,
            existencia: true,
            existenciaMinima: true,
          },
          take: 20,
        })
      : Promise.resolve([]),
    puedeAlmacen
      ? prisma.producto.count({
          where: {
            activo: true,
            existencia: { lte: prisma.producto.fields.existenciaMinima },
          },
        })
      : Promise.resolve(0),
    puedeCartera
      ? prisma.cliente.findMany({
          where: {
            activo: true,
            saldo: { vencidoActual: { gt: 0 } },
            ...filtroClientesDelActor(req.usuario!),
          },
          select: {
            id: true,
            nombreCompleto: true,
            numeroTarjeta: true,
            saldo: { select: { saldoActual: true, vencidoActual: true } },
          },
          orderBy: { saldo: { vencidoActual: "desc" } },
          take: 20,
        })
      : Promise.resolve([]),
    puedeCartera
      ? prisma.cliente.count({
          where: {
            activo: true,
            saldo: { vencidoActual: { gt: 0 } },
            ...filtroClientesDelActor(req.usuario!),
          },
        })
      : Promise.resolve(0),
    prisma.pedidoVenta.findMany({
          where: filtroPedidos,
          select: {
            id: true,
            folio: true,
            estado: true,
            fechaCompromiso: true,
            cliente: { select: { nombreCompleto: true } },
          },
          orderBy: { creadoEn: "asc" },
          take: 20,
        }),
    prisma.pedidoVenta.count({ where: filtroPedidos }),
    puedeCartera
      ? prisma.ruta.findMany({
          where: {
            activa: true,
            diaSemana: dias[indiceDia],
            ...filtroRutasDelActor(req.usuario!),
          },
          include: {
            clientes: { where: { activo: true }, select: { clienteId: true } },
            visitas: {
              where: { fechaProgramada: { gte: desde, lte: hasta }, fechaVisita: { not: null } },
              select: { clienteId: true },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const rutasIncompletas = rutas
    .map((ruta) => ({
      id: ruta.id,
      nombre: ruta.nombre,
      pendientes: Math.max(
        0,
        ruta.clientes.length - new Set(ruta.visitas.map((visita) => visita.clienteId)).size,
      ),
    }))
    .filter((ruta) => ruta.pendientes > 0);
  res.json({
    actualizadoEn: new Date(),
    totales: {
      bajoInventario: totalProductos,
      clientesVencidos: totalClientes,
      pedidosAtrasados: totalPedidos,
      rutasIncompletas: rutasIncompletas.length,
      total:
        totalProductos +
        totalClientes +
        totalPedidos +
        rutasIncompletas.length,
    },
    productos,
    clientes,
    pedidos,
    rutas: rutasIncompletas,
  });
});
