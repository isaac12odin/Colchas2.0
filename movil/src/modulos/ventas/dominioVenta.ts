import type { Jornada, ProductoMovil } from "../../tipos";
import { redondearMoneda } from "../../utilidades/dinero";

export type TipoVenta = "CREDITO" | "CONTADO";
export type Periodicidad = "SEMANAL" | "QUINCENAL" | "MENSUAL";
export type PasoVenta = "PRODUCTOS" | "CONFIRMAR";

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
  const anticipoNumero = redondearMoneda(Number(anticipo || 0));
  return {
    total,
    anticipoNumero,
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
  numeroTarjeta: string;
  cuota: string;
  primerVencimiento: string;
}) {
  if (!entrada.carrito.length) return "PRODUCTO" as const;
  if (entrada.anticipo < 0 || entrada.anticipo > entrada.total) {
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
        (!(Number(entrada.cuota) > 0) ||
          !/^\d{4}-\d{2}-\d{2}$/.test(entrada.primerVencimiento))))
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
}) {
  const total = redondearMoneda(
    entrada.carrito.reduce(
      (suma, linea) => suma + Number(linea.precioVenta) * linea.cantidad,
      0,
    ),
  );
  const requiereFinanciamiento =
    entrada.tipo === "CREDITO" && total - entrada.anticipo > 0;
  const datos: Record<string, unknown> = {
    clienteId: entrada.clienteId ?? null,
    tipo: entrada.tipo,
    descuento: 0,
    anticipo: entrada.tipo === "CREDITO" ? entrada.anticipo : 0,
    numeroTarjeta: requiereFinanciamiento
      ? entrada.numeroTarjeta.trim()
      : undefined,
    metodoAnticipo: "EFECTIVO",
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
      montoCuota: Number(entrada.cuota),
      primerVencimiento: new Date(
        `${entrada.primerVencimiento}T12:00:00`,
      ).toISOString(),
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
          }
        : cliente,
    ),
  };
}
