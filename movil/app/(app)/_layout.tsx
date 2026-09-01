import { Redirect, Stack, useSegments } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { usarSesion } from "@/src/sesion";
import { colores, usarTema } from "@/src/tema";
import {
  debeForzarCambioContrasena,
  puedeAccederRutaMovil,
} from "@/src/permisos";

export default function DisposicionProtegida() {
  const { usuario, cargando, idioma } = usarSesion();
  const tema = usarTema();
  const es = idioma === "es";
  const segmentos = useSegments();
  if (cargando)
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: tema.fondo,
        }}
      >
        <ActivityIndicator color={colores.azul} />
      </View>
    );
  if (!usuario) return <Redirect href="/" />;
  if (debeForzarCambioContrasena(usuario.debeCambiarContrasena, segmentos))
    return <Redirect href="/(app)/cambiar-contrasena" />;
  if (!puedeAccederRutaMovil(usuario.rol, segmentos))
    return <Redirect href="/(app)" />;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: tema.panel },
        headerTintColor: tema.texto,
        headerShadowVisible: false,
        headerTitleStyle: { fontSize: 17, fontWeight: "800" },
        contentStyle: { backgroundColor: tema.fondo },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="rutas" options={{ title: es ? "Rutas" : "Routes" }} />
      <Stack.Screen
        name="ruta/[id]"
        options={{ title: es ? "Jornada" : "Workday" }}
      />
      <Stack.Screen
        name="venta"
        options={{
          title: es ? "Nueva venta" : "New sale",
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="inventario"
        options={{ title: es ? "Inventario" : "Inventory" }}
      />
      <Stack.Screen
        name="pedidos"
        options={{ title: es ? "Pedidos" : "Orders" }}
      />
      <Stack.Screen
        name="pendientes"
        options={{ title: es ? "Sincronización" : "Synchronization" }}
      />
      <Stack.Screen
        name="resumen"
        options={{ title: es ? "Resumen" : "Overview" }}
      />
      <Stack.Screen
        name="capacitacion"
        options={{ title: es ? "Capacitación" : "Training" }}
      />
      <Stack.Screen
        name="perfil"
        options={{ title: es ? "Mi cuenta" : "My account" }}
      />
      <Stack.Screen
        name="cambiar-contrasena"
        options={{ title: es ? "Cambiar contraseña" : "Change password" }}
      />
    </Stack>
  );
}
