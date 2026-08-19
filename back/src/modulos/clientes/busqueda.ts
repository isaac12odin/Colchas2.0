export interface ClienteBuscable {
  nombreCompleto: string;
  telefono: string;
  direccion: string;
  numeroTarjeta?: string | null;
  localidad?: { nombre: string; estado: string } | null;
}

export function normalizarBusqueda(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * La dirección y el teléfono permanecen cifrados en PostgreSQL. La búsqueda
 * se ejecuta sólo después de descifrarlos para un rol autorizado.
 */
export function coincideCliente(cliente: ClienteBuscable, buscar: string) {
  const termino = normalizarBusqueda(buscar);
  if (!termino) return true;
  return normalizarBusqueda(
    [
      cliente.nombreCompleto,
      cliente.telefono,
      cliente.direccion,
      cliente.numeroTarjeta,
      cliente.localidad?.nombre,
      cliente.localidad?.estado,
    ]
      .filter(Boolean)
      .join(" "),
  ).includes(termino);
}
