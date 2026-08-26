import { Router } from "express";
import { RolUsuario } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../infraestructura/prisma.js";
import { autenticar, permitir } from "../../seguridad/middlewares.js";
import { crearPagina, esquemaPaginacion } from "../../compartido/paginacion.js";
import { anularAbono, esquemaAbono, registrarAbono } from "./servicio.js";
import { recalcularRiesgoCliente } from "./riesgo.js";
import { filtroClientesDelActor } from "../../seguridad/alcanceDatos.js";
import {
  fechaISODesdeDateDb,
  fechaMexicoISO,
  fechaOperativa,
  rangoDiaMexico,
} from "../../compartido/fechas.js";

export const rutasAbonos = Router();
rutasAbonos.use(autenticar);

function desplazarFecha(fecha: string, dias: number) {
  const valor = new Date(`${fecha}T12:00:00.000Z`);
  valor.setUTCDate(valor.getUTCDate() + dias);
  return valor.toISOString().slice(0, 10);
}

rutasAbonos.get(
  "/agenda",
  permitir(RolUsuario.ADMINISTRADOR, RolUsuario.CONTABLE, RolUsuario.COBRADOR),
  async (req, res) => {
    const hoy = fechaMexicoISO(new Date());
    const diaSemana = new Date(`${hoy}T12:00:00.000Z`).getUTCDay();
    const inicioSemana = desplazarFecha(
      hoy,
      -(diaSemana === 0 ? 6 : diaSemana - 1),
    );
    const finSemana = desplazarFecha(inicioSemana, 6);
    const alcanceCliente = filtroClientesDelActor(req.usuario!);
    const { desde: desdeSemana } = rangoDiaMexico(inicioSemana);
    const { hasta: hastaSemana } = rangoDiaMexico(finSemana);

    const [cuotas, abonosHoy, abonosSemana] = await prisma.$transaction([
      prisma.cuota.findMany({
        where: {
          estado: { in: ["PENDIENTE", "PARCIAL", "VENCIDA"] },
          planPago: {
            venta: {
              estado: "CONFIRMADA",
              cliente: { is: alcanceCliente },
            },
          },
        },
        select: {
          id: true,
          fechaVence: true,
          monto: true,
          montoPagado: true,
          numero: true,
          planPago: {
            select: {
              periodicidad: true,
              venta: {
                select: {
                  id: true,
                  folio: true,
                  cliente: {
                    select: {
                      id: true,
                      nombreCompleto: true,
                      numeroTarjeta: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ fechaVence: "asc" }, { numero: "asc" }],
      }),
      prisma.abono.aggregate({
        where: {
          anuladoEn: null,
          fechaOperativa: {
            gte: fechaOperativa(hoy),
            lte: fechaOperativa(hoy),
          },
          cliente: alcanceCliente,
        },
        _count: { id: true },
        _sum: { monto: true },
      }),
      prisma.abono.aggregate({
        where: {
          anuladoEn: null,
          recibidaEnServidor: { gte: desdeSemana, lte: hastaSemana },
          cliente: alcanceCliente,
        },
        _count: { id: true },
        _sum: { monto: true },
      }),
    ]);

    const pendientes = cuotas
      .map((cuota) => ({
        cuotaId: cuota.id,
        fecha: fechaISODesdeDateDb(cuota.fechaVence),
        numero: cuota.numero,
        pendiente: Math.max(0, Number(cuota.monto) - Number(cuota.montoPagado)),
        periodicidad: cuota.planPago.periodicidad,
        venta: {
          id: cuota.planPago.venta.id,
          folio: cuota.planPago.venta.folio,
        },
        cliente: cuota.planPago.venta.cliente,
      }))
      .filter((cuota) => cuota.pendiente > 0 && cuota.cliente);
    const resumir = (items: typeof pendientes) => ({
      cantidad: new Set(items.map((item) => item.cliente!.id)).size,
      cuotas: items.length,
      total: Number(
        items.reduce((suma, item) => suma + item.pendiente, 0).toFixed(2),
      ),
    });
    const vencidos = pendientes.filter((cuota) => cuota.fecha < hoy);
    const deHoy = pendientes.filter((cuota) => cuota.fecha === hoy);
    const deSemana = pendientes.filter(
      (cuota) => cuota.fecha >= inicioSemana && cuota.fecha <= finSemana,
    );
    const dias = [...new Set(deSemana.map((cuota) => cuota.fecha))].map(
      (fecha) => {
        const items = deSemana.filter((cuota) => cuota.fecha === fecha);
        return { fecha, ...resumir(items), items };
      },
    );

    res.json({
      generadoEn: new Date().toISOString(),
      hoy: { fecha: hoy, ...resumir(deHoy), items: deHoy },
      semana: {
        inicio: inicioSemana,
        fin: finSemana,
        ...resumir(deSemana),
        dias,
      },
      vencidos: { ...resumir(vencidos), items: vencidos },
      cobrado: {
        hoy: {
          cantidad: abonosHoy._count.id,
          total: Number(abonosHoy._sum.monto ?? 0),
        },
        semana: {
          cantidad: abonosSemana._count.id,
          total: Number(abonosSemana._sum.monto ?? 0),
        },
      },
    });
  },
);

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
