import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { api } from "@/src/api";
import { usarSesion } from "@/src/sesion";
import { colores, usarTema } from "@/src/tema";

export default function CambiarContrasena() {
  const tema = usarTema();
  const { idioma, salir } = usarSesion();
  const es = idioma === "es";
  const [actual, establecerActual] = useState("");
  const [nueva, establecerNueva] = useState("");
  const [confirmacion, establecerConfirmacion] = useState("");
  const [enviando, establecerEnviando] = useState(false);
  const claveValida = nueva.length >= 6;
  async function guardar() {
    if (!claveValida || nueva !== confirmacion)
      return Alert.alert(
        es ? "Revisa la contraseña" : "Check your password",
        es
          ? "Usa al menos 6 caracteres y confirma la misma contraseña."
          : "Use at least 6 characters and enter the same confirmation.",
      );
    establecerEnviando(true);
    try {
      await api("/auth/cambiar-contrasena", {
        method: "POST",
        body: JSON.stringify({
          contrasenaActual: actual,
          nuevaContrasena: nueva,
        }),
      });
      Alert.alert(
        es ? "Cuenta protegida" : "Account secured",
        es
          ? "Inicia sesión de nuevo con tu contraseña definitiva."
          : "Sign in again with your permanent password.",
        [{ text: es ? "Continuar" : "Continue", onPress: () => void salir() }],
      );
    } catch (error) {
      Alert.alert(
        es ? "No se pudo cambiar" : "Unable to change password",
        error instanceof Error ? error.message : "Error",
      );
    } finally {
      establecerEnviando(false);
    }
  }
  return (
    <>
      <Stack.Screen
        options={{
          title: "Protege tu cuenta",
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <KeyboardAvoidingView
        style={[estilos.pagina, { backgroundColor: tema.fondo }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={estilos.contenido}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          <View
            style={[
              estilos.panel,
              { backgroundColor: tema.panel, borderColor: tema.borde },
            ]}
          >
            <View style={estilos.icono}>
              <Ionicons
                name="shield-checkmark"
                color={colores.azul}
                size={30}
              />
            </View>
            <Text style={[estilos.titulo, { color: tema.texto }]}>
              {es ? "Cambiar contraseña" : "Change password"}
            </Text>
            <Text style={estilos.detalle}>
              {es
                ? "Puedes cambiar tu contraseña cuando lo necesites."
                : "You can change your password whenever needed."}
            </Text>
            <Text style={estilos.etiqueta}>
              {es ? "Contraseña actual" : "Current password"}
            </Text>
            <TextInput
              secureTextEntry
              value={actual}
              onChangeText={establecerActual}
              style={[
                estilos.campo,
                { borderColor: tema.borde, color: tema.texto },
              ]}
            />
            <Text style={estilos.etiqueta}>
              {es ? "Nueva contraseña" : "New password"}
            </Text>
            <TextInput
              secureTextEntry
              value={nueva}
              onChangeText={establecerNueva}
              style={[
                estilos.campo,
                { borderColor: tema.borde, color: tema.texto },
              ]}
            />
            <View style={estilos.requisitos}>
              <View style={estilos.requisito}>
                <Ionicons
                  name={claveValida ? "checkmark-circle" : "ellipse-outline"}
                  color={claveValida ? colores.verde : colores.gris}
                  size={14}
                />
                <Text style={estilos.requisitoTexto}>
                  {es ? "Mínimo 6 caracteres" : "At least 6 characters"}
                </Text>
              </View>
            </View>
            <Text style={estilos.etiqueta}>
              {es ? "Confirmar contraseña" : "Confirm password"}
            </Text>
            <TextInput
              secureTextEntry
              value={confirmacion}
              onChangeText={establecerConfirmacion}
              style={[
                estilos.campo,
                { borderColor: tema.borde, color: tema.texto },
              ]}
            />
            <Pressable
              disabled={enviando}
              onPress={() => void guardar()}
              style={[estilos.boton, enviando && { opacity: 0.5 }]}
            >
              {enviando ? (
                <ActivityIndicator color="white" />
              ) : (
                <Ionicons name="lock-closed" color="white" size={18} />
              )}
              <Text style={estilos.botonTexto}>
                {es ? "Guardar y volver a entrar" : "Save and sign in again"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const estilos = StyleSheet.create({
  pagina: { flex: 1 },
  contenido: { flexGrow: 1, justifyContent: "center", padding: 18 },
  panel: { borderWidth: 1, borderRadius: 18, padding: 21 },
  icono: {
    width: 55,
    height: 55,
    borderRadius: 15,
    backgroundColor: colores.azulClaro,
    alignItems: "center",
    justifyContent: "center",
  },
  titulo: { fontSize: 23, fontWeight: "900", marginTop: 17 },
  detalle: { color: colores.gris, fontSize: 12, lineHeight: 18, marginTop: 7 },
  etiqueta: {
    color: colores.gris,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 15,
    marginBottom: 6,
  },
  campo: {
    borderWidth: 1,
    borderRadius: 10,
    height: 47,
    paddingHorizontal: 11,
  },
  requisitos: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  requisito: { flexDirection: "row", alignItems: "center", gap: 3 },
  requisitoTexto: { color: colores.gris, fontSize: 9 },
  boton: {
    height: 51,
    borderRadius: 11,
    backgroundColor: colores.azul,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 21,
  },
  botonTexto: { color: "white", fontWeight: "800" },
});
