import {
  Prisma,
  TipoMovimientoInventario,
  TipoMovimientoSaldo,
} from "@prisma/client";

import { redondearMoneda } from "../../compartido/dinero.js";
import { prisma } from "../../infraestructura/prisma.js";

type ClienteReconciliacion = Pick<
  Prisma.TransactionClient,
  "saldoCliente" | "producto"
>;

export interface DiferenciaReconciliacion {
  libro: "SALDO" | "INVENTARIO";
  entidadId: string;
  codigo:
    | "CADENA_INTERRUMPIDA"
    | "MOVIMIENTO_INCONSISTENTE"
    | "PROYECCION_DIFERENTE"
    | "LIBRO_SIN_ORIGEN";
  esperado: number;
  actual: number;
  movimientoId?: string;
}

const tiposCargo = new Set<TipoMovimientoSaldo>([
  TipoMovimientoSaldo.CARGO_VENTA,
  TipoMovimientoSaldo.AJUSTE_CARGO,
]);

const tiposEntrada = new Set<TipoMovimientoInventario>([
  TipoMovimientoInventario.ENTRADA_COMPRA,
  TipoMovimientoInventario.ENTRADA_DEVOLUCION,
  TipoMovimientoInventario.AJUSTE_POSITIVO,
  TipoMovimientoInventario.LIBERACION_RESERVA,
]);

export async function reconciliarProyecciones(
  cliente: ClienteReconciliacion = prisma,
) {
  const [saldos, productos] = await Promise.all([
    cliente.saldoCliente.findMany({
      include: {
        cliente: {
          select: {
            movimientosSaldo: {
              orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
            },
          },
        },
      },
      orderBy: { clienteId: "asc" },
    }),
    cliente.producto.findMany({
      select: {
        id: true,
        existencia: true,
        movimientos: {
          orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
        },
      },
      orderBy: { id: "asc" },
    }),
  ]);

  const diferencias: DiferenciaReconciliacion[] = [];
  for (const saldo of saldos) {
    let reconstruido = 0;
    for (const movimiento of saldo.cliente.movimientosSaldo) {
      if (Number(movimiento.saldoAnterior) !== reconstruido)
        diferencias.push({
          libro: "SALDO",
          entidadId: saldo.clienteId,
          codigo: "CADENA_INTERRUMPIDA",
          esperado: reconstruido,
          actual: Number(movimiento.saldoAnterior),
          movimientoId: movimiento.id,
        });
      const signo = tiposCargo.has(movimiento.tipo) ? 1 : -1;
      const siguiente = redondearMoneda(
        reconstruido + signo * Number(movimiento.monto),
      );
      if (Number(movimiento.saldoNuevo) !== siguiente)
        diferencias.push({
          libro: "SALDO",
          entidadId: saldo.clienteId,
          codigo: "MOVIMIENTO_INCONSISTENTE",
          esperado: siguiente,
          actual: Number(movimiento.saldoNuevo),
          movimientoId: movimiento.id,
        });
      reconstruido = siguiente;
    }
    if (Number(saldo.saldoActual) !== reconstruido)
      diferencias.push({
        libro: "SALDO",
        entidadId: saldo.clienteId,
        codigo: "PROYECCION_DIFERENTE",
        esperado: reconstruido,
        actual: Number(saldo.saldoActual),
      });
  }

  for (const producto of productos) {
    let reconstruida = 0;
    if (producto.movimientos[0]?.existenciaAntes !== 0)
      diferencias.push({
        libro: "INVENTARIO",
        entidadId: producto.id,
        codigo: "LIBRO_SIN_ORIGEN",
        esperado: 0,
        actual: producto.movimientos[0]?.existenciaAntes ?? producto.existencia,
        movimientoId: producto.movimientos[0]?.id,
      });
    for (const movimiento of producto.movimientos) {
      if (movimiento.existenciaAntes !== reconstruida)
        diferencias.push({
          libro: "INVENTARIO",
          entidadId: producto.id,
          codigo: "CADENA_INTERRUMPIDA",
          esperado: reconstruida,
          actual: movimiento.existenciaAntes,
          movimientoId: movimiento.id,
        });
      const signo = tiposEntrada.has(movimiento.tipo) ? 1 : -1;
      const siguiente = reconstruida + signo * movimiento.cantidad;
      if (movimiento.existenciaDespues !== siguiente)
        diferencias.push({
          libro: "INVENTARIO",
          entidadId: producto.id,
          codigo: "MOVIMIENTO_INCONSISTENTE",
          esperado: siguiente,
          actual: movimiento.existenciaDespues,
          movimientoId: movimiento.id,
        });
      reconstruida = siguiente;
    }
    if (producto.existencia !== reconstruida)
      diferencias.push({
        libro: "INVENTARIO",
        entidadId: producto.id,
        codigo: "PROYECCION_DIFERENTE",
        esperado: reconstruida,
        actual: producto.existencia,
      });
  }

  return {
    estado: diferencias.length
      ? ("DIFERENCIAS" as const)
      : ("INTEGRO" as const),
    generadoEn: new Date(),
    revisados: { clientes: saldos.length, productos: productos.length },
    diferencias,
  };
}
