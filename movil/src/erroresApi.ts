/**
 * Error normalizado de transporte o respuesta HTTP.
 *
 * `estado === 0` está reservado exclusivamente para un fallo de transporte:
 * sin red, DNS, TLS o tiempo de espera. Un rechazo HTTP siempre conserva su
 * código para impedir que 401, 403 o 5xx se disfracen como modo offline.
 */
export class ErrorApi extends Error {
  constructor(
    mensaje: string,
    public estado = 0,
  ) {
    super(mensaje);
    this.name = "ErrorApi";
  }
}

export function esFalloRealRed(error: unknown): error is ErrorApi {
  return error instanceof ErrorApi && error.estado === 0;
}

export function admiteRenovacionAutomatica(ruta: string) {
  return !["/auth/iniciar-sesion", "/auth/renovar", "/auth/cerrar-sesion"].some(
    (rutaExcluida) => ruta.startsWith(rutaExcluida),
  );
}

/** Sólo el rechazo explícito del refresh demuestra revocación definitiva. */
export function esRechazoDefinitivoRefresco(estadoHttp: number) {
  return estadoHttp === 401;
}
