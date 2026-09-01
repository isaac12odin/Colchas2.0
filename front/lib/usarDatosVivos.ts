import { useEffect, useRef } from "react";

import {
  recursosParaPantalla,
  suscribirCambioDatos,
  type RecursoDatos,
} from "./eventosDatos";

interface OpcionesDatosVivos {
  /** Sondeo de respaldo. Las mutaciones y el foco actualizan antes. */
  intervaloMs?: number | false;
  /** Permite declarar dependencias cuando una pantalla mezcla recursos. */
  recursos?: readonly RecursoDatos[];
}

const INTERVALO_PREDETERMINADO_MS = 120_000;
const INTERVALO_MINIMO_MS = 60_000;

/**
 * Mantiene fresca la consulta visible sin obligar a recargar toda la página.
 * Actualiza después de una mutación, al recuperar foco, al volver a estar en
 * línea y periódicamente mientras la pestaña se encuentra visible.
 */
export function usarDatosVivos(
  actualizar: () => void | Promise<unknown>,
  {
    intervaloMs = INTERVALO_PREDETERMINADO_MS,
    recursos,
  }: OpcionesDatosVivos = {},
) {
  const referencia = useRef(actualizar);
  referencia.current = actualizar;
  const claveRecursos = recursos?.join("|") ?? "";

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
    const recursosObservados =
      recursos ?? recursosParaPantalla(window.location.pathname);
    const cancelarCambio = suscribirCambioDatos(
      () => void ejecutar(),
      recursosObservados,
    );
    window.addEventListener("focus", ejecutar);
    window.addEventListener("online", ejecutar);
    document.addEventListener("visibilitychange", alMostrar);
    const intervalo =
      intervaloMs === false
        ? null
        : window.setInterval(
            () => void ejecutar(),
            Math.max(intervaloMs, INTERVALO_MINIMO_MS),
          );

    return () => {
      cancelarCambio();
      window.removeEventListener("focus", ejecutar);
      window.removeEventListener("online", ejecutar);
      document.removeEventListener("visibilitychange", alMostrar);
      if (intervalo !== null) window.clearInterval(intervalo);
    };
    // La clave evita resuscripciones por arreglos equivalentes creados al renderizar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervaloMs, claveRecursos]);
}
