import { DeviceEventEmitter } from "react-native";

export const EVENTO_DATOS_MOVILES = "nexo:datos-moviles-cambiaron";

export interface CambioDatosMoviles {
  origen: "SERVIDOR" | "COLA_LOCAL" | "SINCRONIZACION";
  ruta?: string;
  ocurridoEn: number;
}

export function notificarDatosMoviles(
  cambio: Omit<CambioDatosMoviles, "ocurridoEn">,
) {
  DeviceEventEmitter.emit(EVENTO_DATOS_MOVILES, {
    ...cambio,
    ocurridoEn: Date.now(),
  } satisfies CambioDatosMoviles);
}

export function suscribirDatosMoviles(actualizar: () => void) {
  const suscripcion = DeviceEventEmitter.addListener(
    EVENTO_DATOS_MOVILES,
    actualizar,
  );
  return () => suscripcion.remove();
}
