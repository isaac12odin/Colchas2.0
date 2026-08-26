"use client";

import { useEffect, useRef } from "react";

/**
 * Consume una acción de la URL una sola vez. Permite que un acceso rápido abra
 * el formulario correcto sin acoplar cada página al enrutador de Next.
 */
export function usarAccionInicial(
  manejar: (accion: string) => void,
  habilitado = true,
) {
  const manejarActual = useRef(manejar);
  manejarActual.current = manejar;

  useEffect(() => {
    if (!habilitado) return;
    const url = new URL(window.location.href);
    const accion = url.searchParams.get("accion");
    if (!accion) return;

    manejarActual.current(accion);
    url.searchParams.delete("accion");
    const consulta = url.searchParams.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${consulta ? `?${consulta}` : ""}${url.hash}`,
    );
  }, [habilitado]);
}
