import type { PedidoMovil, ProveedorMovil } from "../../tipos";

/**
 * Desacopla el catálogo sensible de proveedores de la consulta de pedidos.
 * Un fallo o un 403 de proveedores nunca debe ocultar pedidos que el rol sí
 * tiene permiso de consultar y entregar.
 */
export async function cargarPedidosPermitidos(entrada: {
  puedeConsultarProveedores: boolean;
  consultarPedidos: () => Promise<PedidoMovil[]>;
  consultarProveedores: () => Promise<ProveedorMovil[]>;
}) {
  const proveedores = entrada.puedeConsultarProveedores
    ? entrada.consultarProveedores()
    : Promise.resolve([] as ProveedorMovil[]);
  const [pedidosResultado, proveedoresResultado] = await Promise.allSettled([
    entrada.consultarPedidos(),
    proveedores,
  ]);

  if (pedidosResultado.status === "rejected") {
    throw pedidosResultado.reason;
  }
  if (proveedoresResultado.status === "rejected") {
    return {
      pedidos: pedidosResultado.value,
      proveedores: null,
      errorProveedores: proveedoresResultado.reason as unknown,
    };
  }
  return {
    pedidos: pedidosResultado.value,
    proveedores: proveedoresResultado.value,
  };
}
