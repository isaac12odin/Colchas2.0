export const EVENTO_SALDO_ACTUALIZADO = "nexo:saldo-actualizado";

export interface SaldoActualizado {
  clienteId: string;
  saldoNuevo: number;
  origen: "VENTA" | "ABONO" | "DEVOLUCION" | "ANULACION";
}

/** Notifica a las pantallas abiertas que deben descartar su saldo anterior. */
export function emitirSaldoActualizado(detalle: SaldoActualizado) {
  window.dispatchEvent(
    new CustomEvent<SaldoActualizado>(EVENTO_SALDO_ACTUALIZADO, {
      detail: detalle,
    }),
  );
}

export function suscribirSaldoActualizado(actualizar: () => void) {
  const alActualizar = () => actualizar();
  const alMostrar = () => {
    if (document.visibilityState === "visible") actualizar();
  };
  window.addEventListener(EVENTO_SALDO_ACTUALIZADO, alActualizar);
  window.addEventListener("focus", alActualizar);
  document.addEventListener("visibilitychange", alMostrar);
  return () => {
    window.removeEventListener(EVENTO_SALDO_ACTUALIZADO, alActualizar);
    window.removeEventListener("focus", alActualizar);
    document.removeEventListener("visibilitychange", alMostrar);
  };
}
