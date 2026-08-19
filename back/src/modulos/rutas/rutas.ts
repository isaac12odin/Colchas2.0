import { Router } from "express";
import {
  DiaSemana,
  Prisma,
  ResultadoVisita,
  RolUsuario,
} from "@prisma/client";
import { differenceInCalendarDays, subMonths } from "date-fns";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";
import { prisma } from "../../infraestructura/prisma.js";
import { autenticar, permitirPermiso } from "../../seguridad/middlewares.js";
import {
  buscarClientesExtraordinarios,
  obtenerDirectorioCobranza,
  obtenerJornadaRuta,
} from "./clientesCobranza.js";
import { combinarClientesRuta } from "./reglas.js";
import {
  asegurarClienteAsignado,
  asegurarRutaAsignada,
  filtroRutasDelActor,
} from "../../seguridad/alcanceDatos.js";
import { ErrorAplicacion } from "../../compartido/errores.js";
import {
  esquemaAbono,
  registrarAbonoEnTransaccion,
} from "../cobranza/servicio.js";

export const rutasCobranza = Router();
rutasCobranza.use(autenticar);

export const esquemaRuta = z.object({
  nombre: z.string().trim().min(3).max(120),
  diaSemana: z.nativeEnum(DiaSemana),
  notas: z.string().max(1000).optional(),
  cobradorId: z.string().uuid(),
  localidadIds: z.array(z.string().uuid()).min(1),
  clienteIds: z.array(z.string().uuid()).default([]),
  incluirClientesLocalidades: z.boolean().default(true),
});

rutasCobranza.get(
  "/",
  permitirPermiso("RUTAS_HISTORIAL"),
  async (req, res) => {
    const datos = await prisma.ruta.findMany({
      where: { activa: true, ...filtroRutasDelActor(req.usuario!) },
      include: {
        cobrador: { select: { id: true, nombre: true, correo: true } },
        localidades: {
          orderBy: { orden: "asc" },
          include: { localidad: true },
        },
        _count: { select: { clientes: true, visitas: true } },
      },
      orderBy: [{ diaSemana: "asc" }, { nombre: "asc" }],
    });
    res.json({ datos });
  },
);

const esquemaRegistroVisitaWeb = z.object({
  clienteId: z.string().uuid(),
  fechaProgramada: z.coerce.date(),
  fechaVisita: z.coerce.date().default(new Date()),
  resultado: z.nativeEnum(ResultadoVisita),
  notas: z.string().trim().max(1000).optional(),
  abono: esquemaAbono
    .omit({ clienteId: true, visitaId: true, idOperacionMovil: true })
    .optional(),
});

rutasCobranza.post(
  "/:id/visitas",
  permitirPermiso("RUTAS_OPERAR"),
  async (req, res) => {
    const datos = esquemaRegistroVisitaWeb.parse(req.body);
    const rutaId = String(req.params.id);
    const resultado = await prisma.$transaction(
      async (tx) => {
        await asegurarRutaAsignada(tx, req.usuario!, rutaId);
        await asegurarClienteAsignado(tx, req.usuario!, datos.clienteId);
        const asignacion = await tx.rutaCliente.findUnique({
          where: {
            rutaId_clienteId: { rutaId, clienteId: datos.clienteId },
          },
          select: { activo: true },
        });
        const fueraDeRuta = !asignacion?.activo;
        const visita = await tx.visitaCobranza.upsert({
          where: {
            rutaId_clienteId_fechaProgramada: {
              rutaId,
              clienteId: datos.clienteId,
              fechaProgramada: datos.fechaProgramada,
            },
          },
          create: {
            rutaId,
            clienteId: datos.clienteId,
            usuarioId: req.usuario!.id,
            fechaProgramada: datos.fechaProgramada,
            fechaVisita: datos.fechaVisita,
            resultado: datos.resultado,
            notas: datos.notas,
            fueraDeRuta,
          },
          update: {
            usuarioId: req.usuario!.id,
            fechaVisita: datos.fechaVisita,
            resultado: datos.resultado,
            notas: datos.notas,
            fueraDeRuta,
          },
        });
        const abono = datos.abono
          ? await registrarAbonoEnTransaccion(tx, req.usuario!, {
              ...datos.abono,
              clienteId: datos.clienteId,
              visitaId: visita.id,
            })
          : null;
        return { visita, abono };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
    res.status(201).json(resultado);
  },
);

rutasCobranza.post(
  "/",
  permitirPermiso("RUTAS_CONFIGURAR"),
  async (req, res) => {
    const datos = esquemaRuta.parse(req.body);
    await validarCobrador(datos.cobradorId);
    const clienteIds = await resolverClientesRuta(
      datos.localidadIds,
      datos.clienteIds,
      datos.incluirClientesLocalidades,
    );
    const ruta = await prisma.ruta.create({
      data: {
        nombre: datos.nombre,
        diaSemana: datos.diaSemana,
        notas: datos.notas,
        cobradorId: datos.cobradorId,
        localidades: {
          create: datos.localidadIds.map((localidadId, indice) => ({
            localidadId,
            orden: indice + 1,
          })),
        },
        clientes: {
          create: clienteIds.map((clienteId, indice) => ({
            clienteId,
            orden: indice + 1,
          })),
        },
      },
      include: {
        localidades: { include: { localidad: true } },
        clientes: true,
      },
    });
    res.status(201).json(ruta);
  },
);

rutasCobranza.get(
  "/directorio-cobranza",
  permitirPermiso("RUTAS_OPERAR"),
  async (req, res) => {
    const datos = await obtenerDirectorioCobranza(req.usuario!);
    res.json({ datos, generadoEn: new Date() });
  },
);

rutasCobranza.get(
  "/:id/clientes-extraordinarios",
  rateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
  permitirPermiso("RUTAS_OPERAR"),
  async (req, res) => {
    const buscar = z.string().trim().min(3).max(80).parse(req.query.buscar);
    const datos = await buscarClientesExtraordinarios(
      String(req.params.id),
      buscar,
      req.usuario!,
    );
    res.json({ datos });
  },
);

rutasCobranza.patch(
  "/:id",
  permitirPermiso("RUTAS_CONFIGURAR"),
  async (req, res) => {
    const datos = esquemaRuta
      .partial()
      .extend({ activa: z.boolean().optional() })
      .parse(req.body);
    if (datos.cobradorId) await validarCobrador(datos.cobradorId);
    const clienteIds = datos.localidadIds
      ? await resolverClientesRuta(
          datos.localidadIds,
          datos.clienteIds ?? [],
          datos.incluirClientesLocalidades !== false,
        )
      : datos.clienteIds;
    const ruta = await prisma.$transaction(async (tx) => {
      if (datos.localidadIds) {
        await tx.rutaLocalidad.deleteMany({
          where: { rutaId: String(req.params.id) },
        });
      }
      if (clienteIds) {
        await tx.rutaCliente.deleteMany({
          where: { rutaId: String(req.params.id) },
        });
      }
      return tx.ruta.update({
        where: { id: String(req.params.id) },
        data: {
          nombre: datos.nombre,
          diaSemana: datos.diaSemana,
          notas: datos.notas,
          cobradorId: datos.cobradorId,
          activa: datos.activa,
          ...(datos.localidadIds
            ? {
                localidades: {
                  create: datos.localidadIds.map((localidadId, indice) => ({
                    localidadId,
                    orden: indice + 1,
                  })),
                },
              }
            : {}),
          ...(clienteIds
            ? {
                clientes: {
                  create: clienteIds.map((clienteId, indice) => ({
                    clienteId,
                    orden: indice + 1,
                  })),
                },
              }
            : {}),
        },
      });
    });
    res.json(ruta);
  },
);

rutasCobranza.get(
  "/:id/jornada",
  permitirPermiso("RUTAS_OPERAR"),
  async (req, res) => {
    const fecha = z.coerce.date().default(new Date()).parse(req.query.fecha);
    res.json(
      await obtenerJornadaRuta(String(req.params.id), fecha, req.usuario!),
    );
  },
);

async function resolverClientesRuta(
  localidadIds: string[],
  clienteIds: string[],
  incluirClientesLocalidades: boolean,
) {
  if (!incluirClientesLocalidades) return [...new Set(clienteIds)];
  const clientes = await prisma.cliente.findMany({
    where: { activo: true, localidadId: { in: localidadIds } },
    select: { id: true },
    orderBy: { nombreCompleto: "asc" },
  });
  return combinarClientesRuta(
    clientes.map(({ id }) => id),
    clienteIds,
  );
}

rutasCobranza.get(
  "/:id/historial",
  permitirPermiso("RUTAS_HISTORIAL"),
  async (req, res) => {
    const rango = z
      .object({
        desde: z.coerce.date().default(subMonths(new Date(), 3)),
        hasta: z.coerce.date().default(new Date()),
      })
      .parse(req.query);
    const rutaId = String(req.params.id);
    await prisma.$transaction((tx) =>
      asegurarRutaAsignada(tx, req.usuario!, rutaId),
    );
    const [visitas, asignaciones] = await Promise.all([
      prisma.visitaCobranza.findMany({
        where: {
          rutaId,
          fechaProgramada: { gte: rango.desde, lte: rango.hasta },
        },
        include: {
          cliente: {
            select: { id: true, nombreCompleto: true, numeroTarjeta: true },
          },
          usuario: { select: { nombre: true } },
          abonos: { where: { anuladoEn: null } },
        },
        orderBy: { fechaProgramada: "desc" },
        take: 500,
      }),
      prisma.rutaCliente.findMany({
        where: { rutaId, activo: true },
        include: {
          cliente: {
            include: {
              saldo: true,
              abonos: {
                where: { anuladoEn: null },
                orderBy: { fechaAbono: "desc" },
                take: 1,
              },
            },
          },
        },
        orderBy: { orden: "asc" },
      }),
    ]);
    const resumen = visitas.reduce<Record<string, number>>(
      (acumulado, visita) => {
        const clave = visita.resultado ?? "PENDIENTE";
        acumulado[clave] = (acumulado[clave] ?? 0) + 1;
        return acumulado;
      },
      {},
    );
    res.json({
      rango,
      resumen,
      resumenFueraDeRuta: {
        total: visitas.filter((visita) => visita.fueraDeRuta).length,
        cobradas: visitas.filter(
          (visita) => visita.fueraDeRuta && visita.resultado === "PAGO",
        ).length,
      },
      visitas,
      clientes: asignaciones.map(({ cliente, orden }) => ({
        id: cliente.id,
        nombreCompleto: cliente.nombreCompleto,
        numeroTarjeta: cliente.numeroTarjeta,
        orden,
        saldo: cliente.saldo,
        ultimoAbono: cliente.abonos[0] ?? null,
        diasDesdeUltimoAbono: cliente.abonos[0]
          ? differenceInCalendarDays(new Date(), cliente.abonos[0].fechaAbono)
          : null,
      })),
    });
  },
);

async function validarCobrador(cobradorId: string) {
  const cobrador = await prisma.usuario.findFirst({
    where: { id: cobradorId, activo: true, rol: RolUsuario.COBRADOR },
    select: { id: true },
  });
  if (!cobrador)
    throw new ErrorAplicacion(
      "COBRADOR_INVALIDO",
      "Seleccione un cobrador activo para la ruta.",
      422,
    );
}
