/**
 * El costo es información contable. Este presentador permite reutilizar la
 * misma política cuando una venta aparece en historial, cliente o cobranza.
 */
export function ocultarCostosDeVenta<
  T extends {
    detalles: Array<{
      costoUnitario: unknown;
      producto: ({ precioCompra: unknown } & Record<string, unknown>) | null;
    }>;
  },
>(venta: T) {
  return {
    ...venta,
    detalles: venta.detalles.map(
      ({ costoUnitario: _costoUnitario, producto, ...detalle }) => {
        if (!producto) return { ...detalle, producto };
        const { precioCompra: _precioCompra, ...productoSinCosto } = producto;
        return { ...detalle, producto: productoSinCosto };
      },
    ),
  };
}
