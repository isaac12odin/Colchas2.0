import { Prisma } from "@prisma/client";

import { descifrarCampo } from "../../compartido/cifrado.js";
import { ErrorAplicacion } from "../../compartido/errores.js";
import { prisma } from "../../infraestructura/prisma.js";
import { coincideCliente } from "../clientes/busqueda.js";
import {
  asegurarRutaAsignada,
  filtroClientesDelActor,
  type ActorDatos,
} from "../../seguridad/alcanceDatos.js";
import { obtenerResumenesCarteraClientes } from "../cobranza/resumenesCartera.js";

export const incluirClienteCobranza = Prisma.validator<Prisma.ClienteInclude>()(
  {
    localidad: true,
    saldo: true,
    pedidos: {
      where: { estado: { in: ["RECIBIDO_ALMACEN", "LISTO_ENTREGA"] } },
      include: { items: true },
    },
    ventas: {
      where: { estado: "CONFIRMADA", planPago: { isNot: null } },
      include: {
        planPago: {
          include: {
            cuotas: {
              where: { estado: { in: ["PENDIENTE", "PARCIAL", "VENCIDA"] } },
              orderBy: { fechaVence: "asc" },
              take: 1,
            },
          },
        },
      },
    },
    abonos: {
      where: { anuladoEn: null },
      orderBy: { fechaAbono: "desc" },
      take: 1,
    },
    evaluacionesRiesgo: { orderBy: { calculadaEn: "desc" }, take: 1 },
  },
);

type ClienteCobranza = Prisma.ClienteGetPayload<{
  include: typeof incluirClienteCobranza;
}>;

export function presentarClienteCobranza(
  cliente: ClienteCobranza,
  opciones: { orden: number; visita?: unknown; fueraDeRuta: boolean },
) {
  const { telefonoCifrado, direccionCifrada, ...publico } = cliente;
  return {
    ...publico,
    telefono: descifrarCampo(telefonoCifrado),
    direccion: descifrarCampo(direccionCifrada),
    orden: opciones.orden,
    visita: opciones.visita ?? null,
    fueraDeRuta: opciones.fueraDeRuta,
  };
}

function presentarClienteDirectorio(cliente: ClienteCobranza, orden: number) {
  const { telefonoCifrado, direccionCifrada, ...publico } = cliente;
  return {
    ...publico,
    telefono: descifrarCampo(telefonoCifrado),
    direccion: descifrarCampo(direccionCifrada),
    orden,
    visita: null,
    fueraDeRuta: true,
  };
}

export async function obtenerJornadaRuta(
  rutaId: string,
  fecha: Date,
  actor: ActorDatos,
) {
  await prisma.$transaction((tx) => asegurarRutaAsignada(tx, actor, rutaId));
  const ruta = await prisma.ruta.findFirst({
    where: {
      id: rutaId,
      ...(actor.rol === "COBRADOR" ? { cobradorId: actor.id } : {}),
    },
    include: {
      localidades: { orderBy: { orden: "asc" }, include: { localidad: true } },
      clientes: {
        where: { activo: true },
        orderBy: { orden: "asc" },
        include: { cliente: { include: incluirClienteCobranza } },
      },
    },
  });
  if (!ruta) {
    throw new ErrorAplicacion(
      "RUTA_NO_ENCONTRADA",
      "No se encontró la ruta.",
      404,
    );
  }

  const visitas = await prisma.visitaCobranza.findMany({
    where: { rutaId, fechaProgramada: fecha },
    include: {
      cliente: { include: incluirClienteCobranza },
      abonos: { where: { anuladoEn: null }, select: { monto: true } },
    },
  });
  const visitaPorCliente = new Map(
    visitas.map((visita) => [visita.clienteId, visita]),
  );
  const asignados = new Set(ruta.clientes.map(({ clienteId }) => clienteId));
  const clientesAsignados = ruta.clientes.map(({ cliente, orden }) =>
    presentarClienteCobranza(cliente, {
      orden,
      visita: visitaPorCliente.get(cliente.id),
      fueraDeRuta: false,
    }),
  );
  const extraordinarios = visitas
    .filter((visita) => !asignados.has(visita.clienteId))
    .map((visita, indice) =>
      presentarClienteCobranza(visita.cliente, {
        orden: clientesAsignados.length + indice + 1,
        visita,
        fueraDeRuta: true,
      }),
    );
  const todos = [...clientesAsignados, ...extraordinarios];
  const estadosCuenta = await obtenerResumenesCarteraClientes(
    todos.map((cliente) => cliente.id),
    fecha,
  );

  return {
    id: ruta.id,
    nombre: ruta.nombre,
    diaSemana: ruta.diaSemana,
    fecha,
    localidades: ruta.localidades.map(({ localidad, orden }) => ({
      ...localidad,
      orden,
    })),
    clientes: todos.map((cliente) => ({
      ...cliente,
      estadoCuenta: estadosCuenta.get(cliente.id),
    })),
  };
}

export async function buscarClientesExtraordinarios(
  rutaId: string,
  buscar: string,
  actor: ActorDatos,
) {
  await prisma.$transaction((tx) => asegurarRutaAsignada(tx, actor, rutaId));
  const clientes = await prisma.cliente.findMany({
    where: {
      activo: true,
      ...filtroClientesDelActor(actor),
      rutas: { none: { rutaId, activo: true } },
    },
    include: incluirClienteCobranza,
    orderBy: { nombreCompleto: "asc" },
    take: 5_000,
  });
  const encontrados = clientes
    .map((cliente, indice) => presentarClienteDirectorio(cliente, indice + 1))
    .filter((cliente) => coincideCliente(cliente, buscar))
    .slice(0, 20);
  const estadosCuenta = await obtenerResumenesCarteraClientes(
    encontrados.map((cliente) => cliente.id),
  );
  return encontrados.map((cliente) => ({
    ...cliente,
    estadoCuenta: estadosCuenta.get(cliente.id),
  }));
}

export async function obtenerDirectorioCobranza(actor: ActorDatos) {
  const clientes = await prisma.cliente.findMany({
    where: {
      activo: true,
      ...filtroClientesDelActor(actor),
      OR: [
        { saldo: { is: { saldoActual: { gt: 0 } } } },
        {
          pedidos: {
            some: { estado: { in: ["RECIBIDO_ALMACEN", "LISTO_ENTREGA"] } },
          },
        },
      ],
    },
    include: incluirClienteCobranza,
    orderBy: { nombreCompleto: "asc" },
    take: 2_000,
  });
  const directorio = clientes.map((cliente, indice) =>
    presentarClienteDirectorio(cliente, indice + 1),
  );
  const estadosCuenta = await obtenerResumenesCarteraClientes(
    directorio.map((cliente) => cliente.id),
  );
  return directorio.map((cliente) => ({
    ...cliente,
    estadoCuenta: estadosCuenta.get(cliente.id),
  }));
}
