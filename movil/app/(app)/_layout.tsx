import { Redirect, Stack, useSegments } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { usarSesion } from "@/src/sesion";
import { colores, usarTema } from "@/src/tema";
import { puedeAccederRutaMovil } from "@/src/permisos";

export default function DisposicionProtegida() {
  const { usuario, cargando } = usarSesion();
  const tema = usarTema();
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
  if (
    usuario.debeCambiarContrasena &&
    !segmentos.includes("cambiar-contrasena")
  )
    return <Redirect href="/(app)/cambiar-contrasena" />;
  if (!puedeAccederRutaMovil(usuario.rol, segmentos))
    return <Redirect href="/(app)" />;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: tema.panel },
        headerTintColor: tema.texto,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: tema.fondo },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="cambiar-contrasena"
        options={{
          title: "Protege tu cuenta",
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen name="rutas" options={{ title: "Rutas" }} />
      <Stack.Screen name="ruta/[id]" options={{ title: "Jornada" }} />
      <Stack.Screen
        name="venta"
        options={{ title: "Venta en campo", presentation: "card" }}
      />
      <Stack.Screen name="inventario" options={{ title: "Inventario" }} />
      <Stack.Screen name="pedidos" options={{ title: "Pedidos" }} />
      <Stack.Screen name="pendientes" options={{ title: "Sincronización" }} />
      <Stack.Screen name="resumen" options={{ title: "Resumen" }} />
    </Stack>
  );
}
