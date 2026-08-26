import { endOfDay, startOfDay } from "date-fns";

import { descifrarCampo } from "../../../compartido/cifrado.js";
import { ErrorAplicacion } from "../../../compartido/errores.js";
import { prisma } from "../../../infraestructura/prisma.js";
import {
  asegurarRutaAsignada,
  type ActorDatos,
} from "../../../seguridad/alcanceDatos.js";
import { obtenerResumenesCarteraClientes } from "../../cobranza/resumenesCartera.js";
import type { ClienteDocumentoRuta, DatosDocumentoRuta } from "./tipos.js";

const seleccionarCliente = {
  id: true,
  nombreCompleto: true,
  numeroTarjeta: true,
  telefonoCifrado: true,
  direccionCifrada: true,
  localidad: { select: { nombre: true, estado: true } },
} as const;

export async function obtenerDatosDocumentoRuta(
  rutaId: string,
  fecha: Date,
  actor: ActorDatos,
): Promise<DatosDocumentoRuta> {
  await prisma.$transaction((tx) => asegurarRutaAsignada(tx, actor, rutaId));
  const [ruta, visitas] = await Promise.all([
    prisma.ruta.findFirst({
      where: {
        id: rutaId,
        ...(actor.rol === "COBRADOR" ? { cobradorId: actor.id } : {}),
      },
      select: {
        id: true,
        nombre: true,
        cobrador: { select: { nombre: true } },
        localidades: {
          orderBy: { orden: "asc" },
          select: { localidad: { select: { nombre: true, estado: true } } },
        },
        clientes: {
          where: { activo: true },
          orderBy: { orden: "asc" },
          select: { orden: true, cliente: { select: seleccionarCliente } },
        },
      },
    }),
    prisma.visitaCobranza.findMany({
      where: {
        rutaId,
        fechaProgramada: { gte: startOfDay(fecha), lte: endOfDay(fecha) },
      },
      include: {
        cliente: { select: seleccionarCliente },
        abonos: {
          where: { anuladoEn: null },
          select: { monto: true },
        },
      },
      orderBy: { creadoEn: "asc" },
    }),
  ]);
  if (!ruta)
    throw new ErrorAplicacion(
      "RUTA_NO_ENCONTRADA",
      "No se encontró la ruta.",
      404,
    );

  const visitasPorCliente = new Map(
    visitas.map((visita) => [visita.clienteId, visita]),
  );
  const asignados = new Set(ruta.clientes.map(({ cliente }) => cliente.id));
  const filas = [
    ...ruta.clientes.map(({ cliente, orden }) => ({
      cliente,
      orden,
      visita: visitasPorCliente.get(cliente.id),
      fueraDeRuta: false,
    })),
    ...visitas
      .filter((visita) => !asignados.has(visita.clienteId))
      .map((visita, indice) => ({
        cliente: visita.cliente,
        orden: ruta.clientes.length + indice + 1,
        visita,
        fueraDeRuta: true,
      })),
  ];
  const estados = await obtenerResumenesCarteraClientes(
    filas.map(({ cliente }) => cliente.id),
    fecha,
  );

  const clientes = filas.map<ClienteDocumentoRuta>(
    ({ cliente, orden, visita, fueraDeRuta }) => {
      const estado = estados.get(cliente.id);
      const montoRecibido =
        visita?.abonos.reduce(
          (total, abono) => total + Number(abono.monto),
          0,
        ) ?? 0;
      const cobrarHoy = estado?.cobrarHoy ?? 0;
      return {
        orden,
        nombreCompleto: cliente.nombreCompleto,
        numeroTarjeta: cliente.numeroTarjeta,
        localidad: `${cliente.localidad.nombre}, ${cliente.localidad.estado}`,
        direccion: descifrarCampo(cliente.direccionCifrada),
        telefono: descifrarCampo(cliente.telefonoCifrado),
        saldo: estado?.saldoTotal ?? 0,
        abonoAcordado: estado?.abonoPeriodico ?? 0,
        vencido: estado?.vencido ?? 0,
        cobrarHoy,
        diasRetardo: estado?.diasRetardoActual ?? 0,
        resultado: visita?.resultado ?? null,
        montoRecibido,
        diferencia: Math.max(cobrarHoy - montoRecibido, 0),
        motivoNoCobro: visita?.motivoNoCobro ?? null,
        promesaPagoFecha: visita?.promesaPagoFecha ?? null,
        promesaPagoMonto: visita?.promesaPagoMonto
          ? Number(visita.promesaPagoMonto)
          : null,
        fueraDeRuta,
      };
    },
  );

  return {
    rutaId: ruta.id,
    nombre: ruta.nombre,
    fecha,
    cobrador: ruta.cobrador?.nombre ?? "Sin cobrador asignado",
    localidades: ruta.localidades.map(
      ({ localidad }) => `${localidad.nombre}, ${localidad.estado}`,
    ),
    clientes,
    totales: clientes.reduce(
      (total, cliente) => ({
        saldo: total.saldo + cliente.saldo,
        vencido: total.vencido + cliente.vencido,
        cobrarHoy: total.cobrarHoy + cliente.cobrarHoy,
        recibido: total.recibido + cliente.montoRecibido,
        diferencia: total.diferencia + cliente.diferencia,
      }),
      { saldo: 0, vencido: 0, cobrarHoy: 0, recibido: 0, diferencia: 0 },
    ),
  };
}
