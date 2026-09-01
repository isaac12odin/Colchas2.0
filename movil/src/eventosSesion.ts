import { DeviceEventEmitter } from "react-native";

export const EVENTO_SESION_REVOCADA = "nexo:sesion-revocada";

export interface RevocacionSesionMovil {
  motivo: "REFRESCO_RECHAZADO" | "SIN_TOKEN_DE_REFRESCO";
  ocurridoEn: number;
}

/**
 * Informa a la raíz de React que el servidor rechazó definitivamente la
 * sesión. No elimina la base local ni la bitácora SQLCipher pendiente.
 */
export function notificarSesionRevocada(
  motivo: RevocacionSesionMovil["motivo"],
) {
  DeviceEventEmitter.emit(EVENTO_SESION_REVOCADA, {
    motivo,
    ocurridoEn: Date.now(),
  } satisfies RevocacionSesionMovil);
}

/** API que ProveedorSesion debe consumir para cerrar toda la interfaz. */
export function suscribirSesionRevocada(
  atender: (evento: RevocacionSesionMovil) => void,
) {
  const suscripcion = DeviceEventEmitter.addListener(
    EVENTO_SESION_REVOCADA,
    atender,
  );
  return () => suscripcion.remove();
}
