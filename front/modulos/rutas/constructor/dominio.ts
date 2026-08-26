import type { ClienteRuta, CriterioOrdenRuta } from "./tipos";

export function moverEnOrden(
  ids: readonly string[],
  origen: number,
  destino: number,
) {
  if (
    origen < 0 ||
    destino < 0 ||
    origen >= ids.length ||
    destino >= ids.length ||
    origen === destino
  )
    return [...ids];
  const copia = [...ids];
  const [movido] = copia.splice(origen, 1);
  copia.splice(destino, 0, movido!);
  return copia;
}

export function ordenarSugerido(
  ids: readonly string[],
  clientes: ReadonlyMap<string, ClienteRuta>,
  criterio: CriterioOrdenRuta,
) {
  return [...ids].sort((a, b) => {
    const clienteA = clientes.get(a);
    const clienteB = clientes.get(b);
    if (!clienteA || !clienteB) return 0;
    if (criterio === "VENCIDOS") {
      const diferencia =
        clienteB.estadoCuenta.vencido - clienteA.estadoCuenta.vencido;
      if (diferencia) return diferencia;
    }
    return `${clienteA.localidad.estado} ${clienteA.localidad.nombre} ${clienteA.nombreCompleto}`.localeCompare(
      `${clienteB.localidad.estado} ${clienteB.localidad.nombre} ${clienteB.nombreCompleto}`,
      "es-MX",
    );
  });
}

export function totalesRuta(
  ids: readonly string[],
  clientes: ReadonlyMap<string, ClienteRuta>,
) {
  return ids.reduce(
    (totales, id) => {
      const estado = clientes.get(id)?.estadoCuenta;
      if (!estado) return totales;
      totales.saldo += estado.saldoTotal;
      totales.vencido += estado.vencido;
      totales.cobrarHoy += estado.cobrarHoy;
      return totales;
    },
    { saldo: 0, vencido: 0, cobrarHoy: 0 },
  );
}
