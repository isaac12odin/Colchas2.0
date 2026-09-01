import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ProveedorSesion } from "@/src/sesion";
import { ProveedorTema } from "@/src/ProveedorTema";
import { usarTema } from "@/src/tema";

export default function DisposicionRaiz() {
  return (
    <SafeAreaProvider>
      <ProveedorTema>
        <ProveedorSesion>
          <ContenidoRaiz />
        </ProveedorSesion>
      </ProveedorTema>
    </SafeAreaProvider>
  );
}

function ContenidoRaiz() {
  const tema = usarTema();
  return (
    <>
      <StatusBar style={tema.barraEstado} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: tema.fondo },
        }}
      />
    </>
  );
}
