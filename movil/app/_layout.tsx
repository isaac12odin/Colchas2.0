import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ProveedorSesion } from "@/src/sesion";

export default function DisposicionRaiz() {
  return (
    <ProveedorSesion>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </ProveedorSesion>
  );
}
