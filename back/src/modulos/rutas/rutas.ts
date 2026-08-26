import { Router } from "express";
import {
  DiaSemana,
  MotivoNoCobro,
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
import { dineroPositivo } from "../../compartido/dinero.js";
import { obtenerResumenesCarteraClientes } from "../cobranza/resumenesCartera.js";
import { rutasDocumentos } from "./documentos/rutasDocumentos.js";

export const rutasCobranza = Router();
rutasCobranza.use(autenticar);
rutasCobranza.use(rutasDocumentos);

export const esquemaRuta = z.object({
  nombre: z.string().trim().min(3).max(120),
  diaSemana: z.nativeEnum(DiaSemana),
  notas: z.string().max(1000).optional(),
  cobradorId: z.string().uuid().nullable().optional(),
  localidadIds: z.array(z.string().uuid()).min(1),
  clienteIds: z.array(z.string().uuid()).max(2_000).default([]),
  incluirClientesLocalidades: z.boolean().default(false),
});

rutasCobranza.get("/", permitirPermiso("RUTAS_HISTORIAL"), async (req, res) => {
  const datos = await prisma.ruta.findMany({
    where: { activa: true, ...filtroRutasDelActor(req.usuario!) },
    include: {
      cobrador: { select: { id: true, nombre: true, correo: true } },
      localidades: {
        orderBy: { orden: "asc" },
        include: { localidad: true },
      },
      clientes: {
        where: { activo: true },
        orderBy: { orden: "asc" },
        include: {
          cliente: {
            select: {
              id: true,
              nombreCompleto: true,
              numeroTarjeta: true,
              localidadId: true,
              localidad: true,
              saldo: true,
            },
          },
        },
      },
      _count: { select: { clientes: true, visitas: true } },
    },
    orderBy: [{ diaSemana: "asc" }, { nombre: "asc" }],
  });
  res.json({ datos });
});

const esquemaRegistroVisitaWeb = z
  .object({
    clienteId: z.string().uuid(),
    fechaProgramada: z.coerce.date(),
    fechaVisita: z.coerce.date().default(() => new Date()),
    resultado: z.nativeEnum(ResultadoVisita),
    motivoNoCobro: z.nativeEnum(MotivoNoCobro).nullable().optional(),
    promesaPagoFecha: z.coerce.date().nullable().optional(),
    promesaPagoMonto: dineroPositivo.nullable().optional(),
    notas: z.string().trim().max(1000).optional(),
    abono: esquemaAbono
      .omit({ clienteId: true, visitaId: true, idOperacionMovil: true })
      .optional(),
  })
  .superRefine((datos, contexto) => {
    if (datos.resultado === ResultadoVisita.PAGO && !datos.abono)
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["abono"],
        message: "Indique cuánto dinero recibió.",
      });
    const esResultadoSinCobro = (
      [
        ResultadoVisita.NO_PAGO,
        ResultadoVisita.AUSENTE,
        ResultadoVisita.REPROGRAMADO,
      ] as ResultadoVisita[]
    ).includes(datos.resultado);
    if (!esResultadoSinCobro) return;
    if (!datos.motivoNoCobro)
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["motivoNoCobro"],
        message: "Indique por qué no se realizó el cobro.",
      });
    if (!datos.promesaPagoFecha)
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["promesaPagoFecha"],
        message: "Indique la fecha del siguiente compromiso o intento.",
      });
    if (!datos.promesaPagoMonto)
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["promesaPagoMonto"],
        message: "Indique el monto del siguiente compromiso.",
      });
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
        const visitaExistente = await tx.visitaCobranza.findUnique({
          where: {
            rutaId_clienteId_fechaProgramada: {
              rutaId,
              clienteId: datos.clienteId,
              fechaProgramada: datos.fechaProgramada,
            },
          },
          select: { id: true },
        });
        if (visitaExistente)
          throw new ErrorAplicacion(
            "VISITA_YA_REGISTRADA",
            "Esta visita ya fue registrada. No se creó una segunda captura.",
            409,
          );
        const fueraDeRuta = !asignacion?.activo;
        const visita = await tx.visitaCobranza.create({
          data: {
            rutaId,
            clienteId: datos.clienteId,
            usuarioId: req.usuario!.id,
            fechaProgramada: datos.fechaProgramada,
            fechaVisita: datos.fechaVisita,
            resultado: datos.resultado,
            motivoNoCobro: datos.motivoNoCobro,
            promesaPagoFecha: datos.promesaPagoFecha,
            promesaPagoMonto: datos.promesaPagoMonto,
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
    if (datos.cobradorId) await validarCobrador(datos.cobradorId);
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
        cobradorId: datos.cobradorId ?? null,
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
  "/clientes-con-saldo",
  permitirPermiso("RUTAS_CONFIGURAR"),
  async (_req, res) => {
    const clientes = await prisma.cliente.findMany({
      where: {
        activo: true,
        saldo: { is: { saldoActual: { gt: 0 } } },
      },
      select: {
        id: true,
        nombreCompleto: true,
        numeroTarjeta: true,
        localidadId: true,
        localidad: true,
        saldo: true,
        evaluacionesRiesgo: {
          orderBy: { calculadaEn: "desc" },
          take: 1,
          select: { nivel: true },
        },
      },
      orderBy: [
        { localidad: { estado: "asc" } },
        { localidad: { nombre: "asc" } },
        { nombreCompleto: "asc" },
      ],
      take: 2_000,
    });
    const estadosCuenta = await obtenerResumenesCarteraClientes(
      clientes.map((cliente) => cliente.id),
    );
    res.json({
      datos: clientes.map((cliente) => ({
        ...cliente,
        estadoCuenta: estadosCuenta.get(cliente.id),
      })),
    });
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
    let localidadesParaClientes = datos.localidadIds;
    if (datos.clienteIds && !localidadesParaClientes) {
      const localidadesActuales = await prisma.rutaLocalidad.findMany({
        where: { rutaId: String(req.params.id) },
        orderBy: { orden: "asc" },
        select: { localidadId: true },
      });
      localidadesParaClientes = localidadesActuales.map(
        ({ localidadId }) => localidadId,
      );
    }
    const clienteIds = localidadesParaClientes
      ? await resolverClientesRuta(
          localidadesParaClientes,
          datos.clienteIds ?? [],
          datos.incluirClientesLocalidades ?? false,
        )
      : undefined;
    const ruta = await prisma.$transaction(async (tx) => {
      await tx.ruta.findUniqueOrThrow({
        where: { id: String(req.params.id) },
        select: { id: true },
      });
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
    const fecha = z.coerce
      .date()
      .default(() => new Date())
      .parse(req.query.fecha);
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
  const elegidos = [...new Set(clienteIds)];
  if (elegidos.length) {
    const validos = await prisma.cliente.findMany({
      where: {
        id: { in: elegidos },
        activo: true,
        localidadId: { in: localidadIds },
        saldo: { is: { saldoActual: { gt: 0 } } },
      },
      select: { id: true },
    });
    if (validos.length !== elegidos.length)
      throw new ErrorAplicacion(
        "CLIENTES_RUTA_INVALIDOS",
        "Seleccione únicamente clientas activas, de las localidades elegidas y con saldo pendiente.",
        422,
      );
  }
  if (!incluirClientesLocalidades) {
    if (!elegidos.length)
      throw new ErrorAplicacion(
        "CLIENTES_RUTA_REQUERIDOS",
        "Seleccione al menos una clienta con saldo y defina su orden de cobranza.",
        422,
      );
    return elegidos;
  }
  const clientes = await prisma.cliente.findMany({
    where: {
      activo: true,
      localidadId: { in: localidadIds },
      saldo: { is: { saldoActual: { gt: 0 } } },
    },
    select: { id: true },
    orderBy: { nombreCompleto: "asc" },
  });
  const resueltos = combinarClientesRuta(
    elegidos,
    clientes.map(({ id }) => id),
  );
  if (!resueltos.length)
    throw new ErrorAplicacion(
      "CLIENTES_RUTA_REQUERIDOS",
      "No hay clientas con saldo pendiente en las localidades elegidas.",
      422,
    );
  return resueltos;
}

rutasCobranza.get(
  "/:id/historial",
  permitirPermiso("RUTAS_HISTORIAL"),
  async (req, res) => {
    const rango = z
      .object({
        desde: z.coerce.date().default(subMonths(new Date(), 3)),
        hasta: z.coerce.date().default(() => new Date()),
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
