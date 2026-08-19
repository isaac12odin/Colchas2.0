import type { Jornada, PedidoMovil } from "../../tipos";
import type { Periodicidad, TipoVenta } from "../ventas/dominioVenta";

export const siguienteEstado: Record<string, string> = {
  PENDIENTE_PEDIR: "PEDIDO_PROVEEDOR",
  PEDIDO_PROVEEDOR: "RECIBIDO_ALMACEN",
  RECIBIDO_ALMACEN: "LISTO_ENTREGA",
};

export function totalPedido(pedido: PedidoMovil) {
  return pedido.items.reduce(
    (suma, item) => suma + Number(item.precioEstimado) * item.cantidad,
    0,
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

export function validarEntrega(
  total: number,
  tipo: TipoVenta,
  anticipo: number,
  cuota: string,
  fecha: string,
  numeroTarjeta: string,
) {
  if (anticipo < 0 || anticipo > total) return "ANTICIPO" as const;
  if (
    tipo === "CREDITO" &&
    total - anticipo > 0 &&
    numeroTarjeta.trim().length < 3
  )
    return "TARJETA" as const;
  if (
    tipo === "CREDITO" &&
    total - anticipo > 0 &&
    (!(Number(cuota) > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha))
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
  proveedores: Array<{ itemPedidoId: string; proveedorId: string }>;
}) {
  const datos: Record<string, unknown> = {
    pedidoId: entrada.pedidoId,
    tipo: entrada.tipo,
    anticipo: entrada.tipo === "CREDITO" ? entrada.anticipo : 0,
    numeroTarjeta:
      entrada.tipo === "CREDITO" && entrada.total - entrada.anticipo > 0
        ? entrada.numeroTarjeta.trim()
        : undefined,
    metodoAnticipo: "EFECTIVO",
    fechaEntrega: entrada.fechaEntrega,
    proveedores: entrada.proveedores,
  };
  if (entrada.tipo === "CREDITO" && entrada.total - entrada.anticipo > 0) {
    datos.plan = {
      periodicidad: entrada.periodicidad,
      montoCuota: Number(entrada.cuota),
      primerVencimiento: new Date(`${entrada.fecha}T12:00:00`).toISOString(),
    };
  }
  return datos;
}

export function proyectarEntregaEnJornada(
  jornada: Jornada,
  clienteId: string,
  pedidoId: string,
  montoFinanciado: number,
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
                Number(cliente.saldo?.saldoActual ?? 0) + montoFinanciado,
              ),
            },
          }
        : cliente,
    ),
  };
}
