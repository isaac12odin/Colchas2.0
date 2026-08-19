import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";

import { PasoProductosVenta } from "@/src/modulos/ventas/PasoProductosVenta";
import { ResumenVenta } from "@/src/modulos/ventas/ResumenVenta";
import { usarVentaCampo } from "@/src/modulos/ventas/usarVentaCampo";
import { usarSesion } from "@/src/sesion";
import { colores, usarTema } from "@/src/tema";

export default function VentaCampo() {
  const parametros = useLocalSearchParams<{
    clienteId?: string;
    cliente?: string;
    numeroTarjeta?: string;
    rutaId?: string;
    fecha?: string;
  }>();
  const tema = usarTema();
  const { idioma } = usarSesion();
  const es = idioma === "es";
  const control = usarVentaCampo(parametros, es);

  return (
    <KeyboardAvoidingView
      style={[estilos.pagina, { backgroundColor: tema.fondo }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={estilos.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={estilos.seguro}>
          <Ionicons name="shield-checkmark" color={colores.verde} size={18} />{" "}
          {es
            ? "Venta offline cifrada · sin duplicados al sincronizar"
            : "Encrypted offline sale · duplicate-safe sync"}
        </Text>
        <Text style={[estilos.cliente, { color: tema.texto }]}>
          {parametros.cliente ?? (es ? "Venta al público" : "Public sale")}
        </Text>
        {control.paso === "PRODUCTOS" ? (
          <PasoProductosVenta control={control} es={es} tema={tema} />
        ) : (
          <ResumenVenta control={control} es={es} tema={tema} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  pagina: { flex: 1 },
  contenido: { padding: 16, paddingBottom: 40 },
  seguro: {
    color: "#0e6027",
    backgroundColor: "#defbe6",
    padding: 11,
    borderRadius: 11,
    fontSize: 11,
    fontWeight: "700",
  },
  cliente: { fontSize: 22, fontWeight: "800", marginTop: 18, marginBottom: 13 },
});
