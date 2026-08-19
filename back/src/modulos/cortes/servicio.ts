import { createHmac } from "node:crypto";
import { MetodoPago, Prisma, RolUsuario } from "@prisma/client";
import { prisma } from "../../infraestructura/prisma.js";
import { entorno } from "../../configuracion/entorno.js";
import { ErrorAplicacion } from "../../compartido/errores.js";
import {
  fechaMexicoISO,
  fechaOperativa,
  rangoDiaMexico,
} from "../../compartido/fechas.js";
import { bloquearJornada } from "./integridad.js";

export interface DeclaracionCorte {
  efectivo: number;
  transferencia: number;
  tarjeta: number;
  otro: number;
}

function acumular(
  acumulado: Record<MetodoPago, number>,
  metodo: MetodoPago | null,
  monto: number,
) {
  acumulado[metodo ?? "OTRO"] += monto;
}

type ClienteConsultaCorte = Pick<
  Prisma.TransactionClient,
  "usuario" | "abono" | "venta" | "pedidoVenta" | "devolucion" | "corteCaja"
>;

async function calcularCorteConCliente(
  cliente: ClienteConsultaCorte,
  usuarioOperadorId: string,
  fecha: string,
) {
  const { desde, hasta } = rangoDiaMexico(fecha);
  const [operador, abonos, ventas, entregas, devoluciones, existente] =
    await Promise.all([
      cliente.usuario.findFirst({
        where: {
          id: usuarioOperadorId,
          activo: true,
          rol: { in: [RolUsuario.COBRADOR, RolUsuario.ADMINISTRADOR] },
        },
        select: { id: true, nombre: true, rol: true },
      }),
      cliente.abono.findMany({
        where: {
          usuarioId: usuarioOperadorId,
          anuladoEn: null,
          fechaAbono: { gte: desde, lte: hasta },
        },
        select: { monto: true, metodo: true },
      }),
      cliente.venta.findMany({
        where: {
          usuarioId: usuarioOperadorId,
          tipo: { in: ["CONTADO", "PUBLICO"] },
          // Una venta cancelada sigue representando dinero recibido; su
          // devolución se resta por separado para que el corte conserve ambos movimientos.
          estado: { in: ["CONFIRMADA", "CANCELADA"] },
          fechaVenta: { gte: desde, lte: hasta },
        },
        select: { total: true, metodoPago: true },
      }),
      cliente.pedidoVenta.count({
        where: {
          entregadoPorId: usuarioOperadorId,
          entregadoEn: { gte: desde, lte: hasta },
        },
      }),
      cliente.devolucion.findMany({
        where: {
          usuarioOperadorId,
          estado: "REGISTRADA",
          montoReembolsado: { gt: 0 },
          creadoEn: { gte: desde, lte: hasta },
        },
        select: { montoReembolsado: true, metodoReembolso: true },
      }),
      cliente.corteCaja.findUnique({
        where: {
          usuarioOperadorId_fechaOperativa: {
            usuarioOperadorId,
            fechaOperativa: fechaOperativa(fecha),
          },
        },
      }),
    ]);
  if (!operador)
    throw new ErrorAplicacion(
      "OPERADOR_INVALIDO",
      "Seleccione un cobrador activo.",
      422,
    );

  const importes: Record<MetodoPago, number> = {
    EFECTIVO: 0,
    TRANSFERENCIA: 0,
    TARJETA: 0,
    OTRO: 0,
  };
  abonos.forEach((abono) =>
    acumular(importes, abono.metodo, Number(abono.monto)),
  );
  ventas.forEach((venta) =>
    acumular(importes, venta.metodoPago, Number(venta.total)),
  );
  devoluciones.forEach((devolucion) =>
    acumular(
      importes,
      devolucion.metodoReembolso,
      -Number(devolucion.montoReembolsado),
    ),
  );
  for (const metodo of Object.values(MetodoPago))
    importes[metodo] = Number(importes[metodo].toFixed(2));

  return {
    fecha,
    operador,
    cerrado: existente,
    sistema: {
      efectivo: importes.EFECTIVO,
      transferencia: importes.TRANSFERENCIA,
      tarjeta: importes.TARJETA,
      otro: importes.OTRO,
      total: Number(
        Object.values(importes)
          .reduce((a, b) => a + b, 0)
          .toFixed(2),
      ),
    },
    abonos: {
      cantidad: abonos.length,
      total: Number(
        abonos
          .reduce((suma, abono) => suma + Number(abono.monto), 0)
          .toFixed(2),
      ),
    },
    ventasContado: {
      cantidad: ventas.length,
      total: Number(
        ventas
          .reduce((suma, venta) => suma + Number(venta.total), 0)
          .toFixed(2),
      ),
    },
    entregas: { cantidad: entregas },
    reembolsos: {
      cantidad: devoluciones.length,
      total: Number(
        devoluciones
          .reduce((suma, item) => suma + Number(item.montoReembolsado), 0)
          .toFixed(2),
      ),
    },
  };
}

export function calcularCorte(usuarioOperadorId: string, fecha: string) {
  return calcularCorteConCliente(prisma, usuarioOperadorId, fecha);
}

export async function cerrarCorte(
  cerradoPorId: string,
  usuarioOperadorId: string,
  fecha: string,
  declaracion: DeclaracionCorte,
  firmaNombre: string,
  notas?: string,
) {
  if (fecha > fechaMexicoISO(new Date()))
    throw new ErrorAplicacion(
      "FECHA_FUTURA",
      "No se puede cerrar una jornada futura.",
      422,
    );
  return prisma.$transaction(
    async (tx) => {
      await bloquearJornada(tx, usuarioOperadorId, fecha);
      const calculo = await calcularCorteConCliente(
        tx,
        usuarioOperadorId,
        fecha,
      );
      if (calculo.cerrado)
        throw new ErrorAplicacion(
          "CORTE_YA_CERRADO",
          `La jornada ya se cerro con el folio ${calculo.cerrado.folio}.`,
          409,
        );
      const totalDeclarado = Object.values(declaracion).reduce(
        (a, b) => a + b,
        0,
      );
      const diferencia = Number(
        (totalDeclarado - calculo.sistema.total).toFixed(2),
      );
      const datosFirma = {
        usuarioOperadorId,
        cerradoPorId,
        fecha,
        sistema: calculo.sistema,
        declaracion,
        diferencia,
        firmaNombre,
        abonos: calculo.abonos,
        ventas: calculo.ventasContado,
        entregas: calculo.entregas,
        reembolsos: calculo.reembolsos,
      };
      const hashIntegridad = createHmac("sha256", entorno.JWT_ACCESS_SECRET)
        .update(JSON.stringify(datosFirma))
        .digest("hex");
      const corte = await tx.corteCaja.create({
        data: {
          folio: `CC-${fecha.replaceAll("-", "")}-${Date.now().toString(36).toUpperCase()}`,
          usuarioOperadorId,
          cerradoPorId,
          fechaOperativa: fechaOperativa(fecha),
          efectivoSistema: calculo.sistema.efectivo,
          transferenciaSistema: calculo.sistema.transferencia,
          tarjetaSistema: calculo.sistema.tarjeta,
          otroSistema: calculo.sistema.otro,
          efectivoDeclarado: declaracion.efectivo,
          transferenciaDeclarada: declaracion.transferencia,
          tarjetaDeclarada: declaracion.tarjeta,
          otroDeclarado: declaracion.otro,
          diferencia,
          cantidadAbonos: calculo.abonos.cantidad,
          totalVentasContado: calculo.ventasContado.total,
          cantidadVentasContado: calculo.ventasContado.cantidad,
          cantidadEntregas: calculo.entregas.cantidad,
          totalReembolsos: calculo.reembolsos.total,
          cantidadReembolsos: calculo.reembolsos.cantidad,
          firmaNombre,
          hashIntegridad,
          notas,
        },
        include: {
          usuarioOperador: { select: { nombre: true } },
          cerradoPor: { select: { nombre: true } },
        },
      });
      await tx.auditoria.create({
        data: {
          usuarioId: cerradoPorId,
          accion: "CERRAR_Y_FIRMAR",
          entidad: "CorteCaja",
          entidadId: corte.id,
          datosDespues: { folio: corte.folio, diferencia, hashIntegridad },
        },
      });
      return corte;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
  );
}
