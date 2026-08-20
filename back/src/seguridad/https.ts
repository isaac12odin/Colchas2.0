/**
 * Las rutas de salud no transportan datos de negocio y deben poder consultarse
 * dentro de la red privada del contenedor antes de que el proxy TLS esté listo.
 */
export function esRutaSalud(ruta: string): boolean {
  return ruta === "/salud" || ruta.startsWith("/salud/");
}

export function requiereHttps(entrada: {
  produccion: boolean;
  conexionSegura: boolean;
  ruta: string;
}): boolean {
  return (
    entrada.produccion &&
    !entrada.conexionSegura &&
    !esRutaSalud(entrada.ruta)
  );
}
