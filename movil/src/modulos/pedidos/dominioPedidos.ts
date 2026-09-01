import type { Jornada, PedidoMovil } from "../../tipos";
import {
  parsearDineroCapturado,
  redondearMoneda,
} from "../../utilidades/dinero";
import {
  esFechaHoyOFutura,
  finDiaMexicoISO,
} from "../../utilidades/fechaLocal";
import {
  proyectarEstadoCuentaTrasCargo,
  type PlanCreditoProyectado,
} from "../../utilidades/proyeccionEstadoCuenta";
import type {
  MetodoPago,
  Periodicidad,
  TipoVenta,
} from "../ventas/dominioVenta";

export const siguienteEstado: Record<string, string> = {
  PENDIENTE_PEDIR: "PEDIDO_PROVEEDOR",
  PEDIDO_PROVEEDOR: "RECIBIDO_ALMACEN",
  RECIBIDO_ALMACEN: "LISTO_ENTREGA",
};

export function totalPedido(pedido: PedidoMovil) {
  return redondearMoneda(
    pedido.items.reduce(
      (suma, item) => suma + Number(item.precioEstimado) * item.cantidad,
      0,
    ),
  );
}

export function pedidosDelCliente(pedidos: PedidoMovil[], clienteId?: string) {
  if (!clienteId) return pedidos;
  return pedidos.filter(
    (pedido) =>
      pedido.clienteId === clienteId ||
      (pedido as PedidoMovil & { cliente?: { id?: string } }).cliente?.id ===
        clienteId,
  );
}

export interface BorradorNuevoPedido {
  clienteId: string;
  productoId: string;
  cantidad: string;
  fechaCompromiso: string;
  notas: string;
}

export function validarNuevoPedido(borrador: BorradorNuevoPedido) {
  if (!borrador.clienteId) return "CLIENTE" as const;
  if (!borrador.productoId) return "PRODUCTO" as const;
  const cantidad = Number(borrador.cantidad);
  if (!Number.isInteger(cantidad) || cantidad < 1) return "CANTIDAD" as const;
  if (borrador.fechaCompromiso && !esFechaHoyOFutura(borrador.fechaCompromiso))
    return "FECHA" as const;
  if (borrador.notas.trim().length > 1000) return "NOTAS" as const;
  return null;
}

export function crearDatosNuevoPedido(borrador: BorradorNuevoPedido) {
  return {
    clienteId: borrador.clienteId,
    items: [
      {
        productoId: borrador.productoId,
        cantidad: Number(borrador.cantidad),
      },
    ],
    ...(borrador.fechaCompromiso
      ? {
          fechaCompromiso: new Date(
            `${borrador.fechaCompromiso}T12:00:00`,
          ).toISOString(),
        }
      : {}),
    ...(borrador.notas.trim() ? { notas: borrador.notas.trim() } : {}),
  };
}

export function validarEntrega(
  total: number,
  tipo: TipoVenta,
  anticipo: number | null,
  cuota: string,
  fecha: string,
  numeroTarjeta: string,
) {
  if (anticipo === null || anticipo < 0 || anticipo > total)
    return "ANTICIPO" as const;
  if (
    tipo === "CREDITO" &&
    total - anticipo > 0 &&
    numeroTarjeta.trim().length < 3
  )
    return "TARJETA" as const;
  if (
    tipo === "CREDITO" &&
    total - anticipo > 0 &&
    (!((parsearDineroCapturado(cuota) ?? 0) > 0) || !esFechaHoyOFutura(fecha))
  ) {
    return "PLAN" as const;
  }
  return null;
}

export function crearDatosEntrega(entrada: {
  pedidoId: string;
  tipo: TipoVenta;
  anticipo: number;
  total: number;
  numeroTarjeta: string;
  periodicidad: Periodicidad;
  cuota: string;
  fecha: string;
  fechaEntrega: string;
  metodoAnticipo?: MetodoPago;
}) {
  const requiereFinanciamiento =
    entrada.tipo === "CREDITO" && entrada.total - entrada.anticipo > 0;
  const tipoNormalizado = requiereFinanciamiento ? "CREDITO" : "CONTADO";
  const montoCuota = requiereFinanciamiento
    ? parsearDineroCapturado(entrada.cuota)
    : null;
  if (requiereFinanciamiento && !(montoCuota && montoCuota > 0)) {
    throw new Error("CUOTA_INVALIDA");
  }
  const datos: Record<string, unknown> = {
    pedidoId: entrada.pedidoId,
    tipo: tipoNormalizado,
    anticipo: requiereFinanciamiento ? entrada.anticipo : 0,
    numeroTarjeta: requiereFinanciamiento
      ? entrada.numeroTarjeta.trim()
      : undefined,
    metodoAnticipo: entrada.metodoAnticipo ?? "EFECTIVO",
    fechaEntrega: entrada.fechaEntrega,
  };
  if (requiereFinanciamiento) {
    datos.plan = {
      periodicidad: entrada.periodicidad,
      montoCuota,
      primerVencimiento: finDiaMexicoISO(entrada.fecha),
    };
  }
  return datos;
}

export function proyectarEntregaEnJornada(
  jornada: Jornada,
  clienteId: string,
  pedidoId: string,
  montoFinanciado: number,
  plan?: PlanCreditoProyectado,
): Jornada {
  return {
    ...jornada,
    clientes: jornada.clientes.map((cliente) =>
      cliente.id === clienteId
        ? {
            ...cliente,
            pedidos: cliente.pedidos.filter((pedido) => pedido.id !== pedidoId),
            saldo: {
              saldoActual: String(
                redondearMoneda(
                  Number(cliente.saldo?.saldoActual ?? 0) + montoFinanciado,
                ),
              ),
            },
            estadoCuenta: proyectarEstadoCuentaTrasCargo(
              cliente.estadoCuenta,
              Number(cliente.saldo?.saldoActual ?? 0),
              montoFinanciado,
              plan,
            ),
          }
        : cliente,
    ),
  };
}
