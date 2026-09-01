import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ContextoTema, type ModoTema } from "./tema";

const CLAVE_MODO = "preferencia_modo_tema";
const modosValidos: readonly ModoTema[] = ["SISTEMA", "CLARO", "OSCURO"];

export function ProveedorTema({ children }: { children: React.ReactNode }) {
  const [modo, cambiarModo] = useState<ModoTema>("SISTEMA");

  useEffect(() => {
    let activo = true;
    void SecureStore.getItemAsync(CLAVE_MODO).then((guardado) => {
      if (activo && modosValidos.includes(guardado as ModoTema)) {
        cambiarModo(guardado as ModoTema);
      }
    });
    return () => {
      activo = false;
    };
  }, []);

  const establecerModo = useCallback(async (siguiente: ModoTema) => {
    cambiarModo(siguiente);
    await SecureStore.setItemAsync(CLAVE_MODO, siguiente, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }, []);

  const valor = useMemo(
    () => ({ modo, establecerModo }),
    [establecerModo, modo],
  );
  return (
    <ContextoTema.Provider value={valor}>{children}</ContextoTema.Provider>
  );
}
