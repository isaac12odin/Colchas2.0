import { useEffect, useRef } from "react";

import { suscribirCambioDatos } from "./eventosDatos";

interface OpcionesDatosVivos {
  intervaloMs?: number;
}

/**
 * Mantiene fresca la consulta visible sin obligar a recargar toda la página.
 * Actualiza después de una mutación, al recuperar foco, al volver a estar en
 * línea y periódicamente mientras la pestaña se encuentra visible.
 */
export function usarDatosVivos(
  actualizar: () => void | Promise<unknown>,
  { intervaloMs = 30_000 }: OpcionesDatosVivos = {},
) {
  const referencia = useRef(actualizar);
  referencia.current = actualizar;

  useEffect(() => {
    let ejecutando = false;
    let pendiente = false;

    const ejecutar = async () => {
      if (document.visibilityState === "hidden") return;
      if (ejecutando) {
        pendiente = true;
        return;
      }
      ejecutando = true;
      try {
        await referencia.current();
      } finally {
        ejecutando = false;
        if (pendiente) {
          pendiente = false;
          void ejecutar();
        }
      }
    };
    const alMostrar = () => {
      if (document.visibilityState === "visible") void ejecutar();
    };
    const cancelarCambio = suscribirCambioDatos(() => void ejecutar());
    window.addEventListener("focus", ejecutar);
    window.addEventListener("online", ejecutar);
    document.addEventListener("visibilitychange", alMostrar);
    const intervalo = window.setInterval(() => void ejecutar(), intervaloMs);

    return () => {
      cancelarCambio();
      window.removeEventListener("focus", ejecutar);
      window.removeEventListener("online", ejecutar);
      document.removeEventListener("visibilitychange", alMostrar);
      window.clearInterval(intervalo);
    };
  }, [intervaloMs]);
}
