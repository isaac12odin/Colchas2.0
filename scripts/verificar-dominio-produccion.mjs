const base = (
  process.env.NEXO_PRODUCTION_URL ?? "https://nexo.deadcode.cloud"
).replace(/\/$/, "");
if (!base.startsWith("https://"))
  throw new Error("NEXO_PRODUCTION_URL debe usar https://.");

const controlador = new AbortController();
const temporizador = setTimeout(() => controlador.abort(), 15_000);
const incumplimientos = [];
const exigir = (condicion, mensaje) => {
  if (!condicion) incumplimientos.push(mensaje);
};

async function consultar(ruta, opciones = {}) {
  try {
    return await fetch(`${base}${ruta}`, {
      signal: controlador.signal,
      ...opciones,
    });
  } catch (error) {
    incumplimientos.push(
      `${ruta || "/"} no pudo consultarse: ${error instanceof Error ? error.message : String(error)}.`,
    );
    return null;
  }
}

try {
  try {
    const http = await fetch(base.replace(/^https:/, "http:"), {
      redirect: "manual",
      signal: controlador.signal,
    });
    exigir(
      [301, 302, 307, 308].includes(http.status),
      "HTTP no redirige a HTTPS.",
    );
    exigir(
      http.headers.get("location")?.startsWith(base),
      "La redirección HTTP no apunta al dominio HTTPS esperado.",
    );
  } catch (error) {
    incumplimientos.push(
      `HTTP no pudo consultarse: ${error instanceof Error ? error.message : String(error)}.`,
    );
  }

  for (const ruta of ["/", "/capacitacion"]) {
    const respuesta = await consultar(ruta);
    if (!respuesta) continue;
    exigir(respuesta.ok, `${ruta} respondió ${respuesta.status}.`);
    const cabeceras = respuesta.headers;
    exigir(
      cabeceras.get("strict-transport-security")?.includes("max-age="),
      `${ruta} no contiene HSTS.`,
    );
    exigir(
      cabeceras
        .get("content-security-policy")
        ?.includes("frame-ancestors 'none'"),
      `${ruta} no contiene CSP anti-frame.`,
    );
    exigir(
      cabeceras.get("x-content-type-options") === "nosniff",
      `${ruta} no contiene nosniff.`,
    );
    exigir(
      Boolean(cabeceras.get("referrer-policy")),
      `${ruta} no contiene Referrer-Policy.`,
    );
    exigir(
      cabeceras.get("cache-control")?.includes("no-store"),
      `${ruta} permite caché de HTML operativo.`,
    );
  }

  const salud = await consultar("/salud/listo");
  if (salud) {
    exigir(salud.ok, `/salud/listo respondió ${salud.status}.`);
    try {
      const cuerpo = await salud.json();
      exigir(cuerpo.estado === "listo", "La API no reporta estado listo.");
    } catch {
      incumplimientos.push("/salud/listo no devolvió JSON válido.");
    }
  }

  if (incumplimientos.length) {
    const detalle = incumplimientos.map((mensaje) => `- ${mensaje}`).join("\n");
    throw new Error(
      `El dominio productivo no cumple ${incumplimientos.length} comprobaciones:\n${detalle}`,
    );
  }
  process.stdout.write(`Dominio productivo verificado: ${base}\n`);
} finally {
  clearTimeout(temporizador);
}
