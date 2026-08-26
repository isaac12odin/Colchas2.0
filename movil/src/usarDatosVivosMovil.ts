import { useCallback, useRef } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";

import { suscribirDatosMoviles } from "./eventosDatosMovil";

/**
 * Ejecuta una lectura al entrar a la pantalla y vuelve a confirmarla cuando la
 * app recupera foco, cambia la cola offline o transcurre el intervalo activo.
 */
export function usarDatosVivosMovil(
  actualizar: () => void | Promise<unknown>,
  intervaloMs = 30_000,
) {
  const referencia = useRef(actualizar);
  referencia.current = actualizar;

  useFocusEffect(
    useCallback(() => {
      let activa = true;
      let ejecutando = false;
      let pendiente = false;

      const ejecutar = async () => {
        if (!activa || AppState.currentState !== "active") return;
        if (ejecutando) {
          pendiente = true;
          return;
        }
        ejecutando = true;
        try {
          await referencia.current();
        } catch {
          // Cada pantalla conserva o presenta su último estado; el coordinador
          // evita que un refresco periódico fallido cause un rechazo global.
        } finally {
          ejecutando = false;
          if (pendiente && activa) {
            pendiente = false;
            void ejecutar();
          }
        }
      };
      const cancelarDatos = suscribirDatosMoviles(() => void ejecutar());
      const estado = AppState.addEventListener("change", (nuevo) => {
        if (nuevo === "active") void ejecutar();
      });
      const intervalo = setInterval(() => void ejecutar(), intervaloMs);
      void ejecutar();

      return () => {
        activa = false;
        cancelarDatos();
        estado.remove();
        clearInterval(intervalo);
      };
    }, [intervaloMs]),
  );
}
