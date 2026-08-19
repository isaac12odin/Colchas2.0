const base = process.env.NEXT_PUBLIC_API_URL ?? "/api";

function csrfDesdeCookie() {
  if (typeof document === "undefined") return "";
  return decodeURIComponent(
    document.cookie
      .split("; ")
      .find((valor) => valor.startsWith("csrf_token="))
      ?.split("=")[1] ?? "",
  );
}

export class ErrorApi extends Error {
  constructor(
    mensaje: string,
    public codigo: string,
    public estado: number,
  ) {
    super(mensaje);
  }
}

export async function api<T>(
  ruta: string,
  opciones: RequestInit = {},
  reintentar = true,
): Promise<T> {
  const metodo = opciones.method?.toUpperCase() ?? "GET";
  const respuesta = await fetch(`${base}${ruta}`, {
    ...opciones,
    credentials: "include",
    headers: {
      ...(opciones.body ? { "Content-Type": "application/json" } : {}),
      ...(!["GET", "HEAD"].includes(metodo)
        ? { "X-CSRF-Token": csrfDesdeCookie() }
        : {}),
      ...opciones.headers,
    },
  });
  if (respuesta.status === 401 && reintentar && !ruta.startsWith("/auth/")) {
    const renovada = await fetch(`${base}/auth/renovar`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfDesdeCookie(),
      },
      body: "{}",
    });
    if (renovada.ok) return api<T>(ruta, opciones, false);
  }
  if (!respuesta.ok) {
    const cuerpo = await respuesta
      .json()
      .catch(() => ({
        error: {
          mensaje: "No se pudo completar la solicitud.",
          codigo: "ERROR_RED",
        },
      }));
    throw new ErrorApi(
      cuerpo.error?.mensaje ?? "Ocurrio un error.",
      cuerpo.error?.codigo ?? "ERROR",
      respuesta.status,
    );
  }
  if (respuesta.status === 204) return undefined as T;
  return respuesta.json() as Promise<T>;
}
