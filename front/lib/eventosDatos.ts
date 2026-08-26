export const EVENTO_DATOS_CAMBIARON = "nexo:datos-cambiaron";

export interface CambioDatos {
  metodo: string;
  ruta: string;
  ocurridoEn: number;
}

export function notificarCambioDatos(cambio: Omit<CambioDatos, "ocurridoEn">) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<CambioDatos>(EVENTO_DATOS_CAMBIARON, {
      detail: { ...cambio, ocurridoEn: Date.now() },
    }),
  );
}

export function suscribirCambioDatos(actualizar: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const alCambiar = () => actualizar();
  window.addEventListener(EVENTO_DATOS_CAMBIARON, alCambiar);
  return () => window.removeEventListener(EVENTO_DATOS_CAMBIARON, alCambiar);
}
