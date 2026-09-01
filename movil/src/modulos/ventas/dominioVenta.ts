import type { Jornada, ProductoMovil } from "../../tipos";
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

export type TipoVenta = "CREDITO" | "CONTADO";
export type Periodicidad = "SEMANAL" | "QUINCENAL" | "MENSUAL";
export type MetodoPago = "EFECTIVO" | "TRANSFERENCIA" | "TARJETA" | "OTRO";
export type PasoVenta = "PRODUCTOS" | "PAGO" | "CONFIRMAR";

export interface LineaCarrito extends ProductoMovil {
  cantidad: number;
}

export function filtrarCatalogo(catalogo: ProductoMovil[], busqueda: string) {
  const termino = busqueda.trim().toLowerCase();
  return catalogo
    .filter(
      (producto) =>
        producto.existencia > 0 &&
        (!termino ||
          `${producto.nombre} ${producto.marca} ${producto.sku} ${producto.codigoBarras ?? ""}`
            .toLowerCase()
            .includes(termino)),
    )
    .slice(0, 30);
}

export function cambiarCantidadCarrito(
  carrito: LineaCarrito[],
  producto: ProductoMovil,
  cambio: number,
) {
  const existente = carrito.find((linea) => linea.id === producto.id);
  const cantidad = Math.max(
    0,
    Math.min(producto.existencia, (existente?.cantidad ?? 0) + cambio),
  );
  if (!cantidad) return carrito.filter((linea) => linea.id !== producto.id);
  return existente
    ? carrito.map((linea) =>
        linea.id === producto.id ? { ...linea, cantidad } : linea,
      )
    : [...carrito, { ...producto, cantidad }];
}

export function calcularImportes(
  carrito: LineaCarrito[],
  tipo: TipoVenta,
  anticipo: string,
) {
  const total = redondearMoneda(
    carrito.reduce(
      (suma, linea) => suma + Number(linea.precioVenta) * linea.cantidad,
      0,
    ),
  );
  const anticipoParseado = parsearDineroCapturado(anticipo);
  const anticipoNumero = anticipoParseado ?? 0;
  return {
    total,
    anticipoNumero,
    anticipoValido: anticipoParseado !== null,
    financiado:
      tipo === "CREDITO"
        ? redondearMoneda(Math.max(0, total - anticipoNumero))
        : 0,
  };
}

export function validarVenta(entrada: {
  carrito: LineaCarrito[];
  tipo: TipoVenta;
  clienteId?: string;
  total: number;
  anticipo: number;
  anticipoValido?: boolean;
  numeroTarjeta: string;
  cuota: string;
  primerVencimiento: string;
}) {
  if (!entrada.carrito.length) return "PRODUCTO" as const;
  if (
    entrada.anticipoValido === false ||
    entrada.anticipo < 0 ||
    entrada.anticipo > entrada.total
  ) {
    return "ANTICIPO" as const;
  }
  if (
    entrada.tipo === "CREDITO" &&
    entrada.total - entrada.anticipo > 0 &&
    entrada.numeroTarjeta.trim().length < 3
  ) {
    return "TARJETA" as const;
  }
  if (
    entrada.tipo === "CREDITO" &&
    (!entrada.clienteId ||
      (entrada.total - entrada.anticipo > 0 &&
        (!((parsearDineroCapturado(entrada.cuota) ?? 0) > 0) ||
          !esFechaHoyOFutura(entrada.primerVencimiento))))
  ) {
    return "CREDITO" as const;
  }
  return null;
}

export function crearDatosVenta(entrada: {
  clienteId?: string;
  tipo: TipoVenta;
  anticipo: number;
  numeroTarjeta: string;
  carrito: LineaCarrito[];
  periodicidad: Periodicidad;
  cuota: string;
  primerVencimiento: string;
  fechaVenta: string;
  metodoAnticipo?: MetodoPago;
}) {
  const total = redondearMoneda(
    entrada.carrito.reduce(
      (suma, linea) => suma + Number(linea.precioVenta) * linea.cantidad,
      0,
    ),
  );
  const requiereFinanciamiento =
    entrada.tipo === "CREDITO" && total - entrada.anticipo > 0;
  const tipoNormalizado = requiereFinanciamiento
    ? "CREDITO"
    : entrada.clienteId
      ? "CONTADO"
      : "PUBLICO";
  const montoCuota = requiereFinanciamiento
    ? parsearDineroCapturado(entrada.cuota)
    : null;
  if (requiereFinanciamiento && !(montoCuota && montoCuota > 0)) {
    throw new Error("CUOTA_INVALIDA");
  }
  const datos: Record<string, unknown> = {
    clienteId: entrada.clienteId ?? null,
    tipo: tipoNormalizado,
    descuento: 0,
    anticipo: requiereFinanciamiento ? entrada.anticipo : 0,
    numeroTarjeta: requiereFinanciamiento
      ? entrada.numeroTarjeta.trim()
      : undefined,
    metodoAnticipo: entrada.metodoAnticipo ?? "EFECTIVO",
    fechaVenta: entrada.fechaVenta,
    notas: "Venta registrada en ruta desde el móvil",
    items: entrada.carrito.map((linea) => ({
      productoId: linea.id,
      cantidad: linea.cantidad,
      precioUnitario: Number(linea.precioVenta),
    })),
  };
  if (requiereFinanciamiento) {
    datos.plan = {
      periodicidad: entrada.periodicidad,
      montoCuota,
      primerVencimiento: finDiaMexicoISO(entrada.primerVencimiento),
    };
  }
  return datos;
}

export function descontarCatalogo(
  catalogo: ProductoMovil[],
  carrito: LineaCarrito[],
) {
  return catalogo.map((producto) => {
    const linea = carrito.find((item) => item.id === producto.id);
    return linea
      ? { ...producto, existencia: producto.existencia - linea.cantidad }
      : producto;
  });
}

export function proyectarSaldoVenta(
  jornada: Jornada,
  clienteId: string,
  financiado: number,
  plan?: PlanCreditoProyectado,
): Jornada {
  return {
    ...jornada,
    clientes: jornada.clientes.map((cliente) =>
      cliente.id === clienteId
        ? {
            ...cliente,
            saldo: {
              saldoActual: String(
                redondearMoneda(
                  Number(cliente.saldo?.saldoActual ?? 0) + financiado,
                ),
              ),
            },
            estadoCuenta: proyectarEstadoCuentaTrasCargo(
              cliente.estadoCuenta,
              Number(cliente.saldo?.saldoActual ?? 0),
              financiado,
              plan,
            ),
          }
        : cliente,
    ),
  };
}
