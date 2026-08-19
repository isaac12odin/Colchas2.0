const SUFIJO_BASE_PRUEBAS = "_test";

function nombreBase(url: URL) {
  return decodeURIComponent(url.pathname.replace(/^\//, ""));
}

/**
 * Resuelve una URL exclusiva de E2E. Si no se declara E2E_DATABASE_URL,
 * deriva una base hermana de DATABASE_URL agregando el sufijo `_test`.
 */
export function resolverUrlBasePruebas(entorno = process.env) {
  const origen = entorno.E2E_DATABASE_URL ?? entorno.DATABASE_URL;
  if (!origen)
    throw new Error(
      "Configure DATABASE_URL o E2E_DATABASE_URL para preparar las pruebas E2E.",
    );

  const url = new URL(origen);
  const actual = nombreBase(url);
  if (!actual) throw new Error("La URL de PostgreSQL no contiene una base.");

  if (!entorno.E2E_DATABASE_URL && !actual.endsWith(SUFIJO_BASE_PRUEBAS)) {
    url.pathname = `/${encodeURIComponent(`${actual}${SUFIJO_BASE_PRUEBAS}`)}`;
  }
  asegurarUrlBasePruebas(url.toString());
  return url.toString();
}

/** Bloqueo redundante para impedir que Vitest toque la base operativa. */
export function asegurarUrlBasePruebas(valor: string) {
  const url = new URL(valor);
  const base = nombreBase(url);
  if (!base.endsWith(SUFIJO_BASE_PRUEBAS))
    throw new Error(
      `La suite E2E exige una base terminada en ${SUFIJO_BASE_PRUEBAS}; recibió "${base}".`,
    );
  if (!/^[A-Za-z0-9_-]+$/.test(base))
    throw new Error(
      "El nombre de la base E2E contiene caracteres no permitidos.",
    );
  return { url, base };
}
