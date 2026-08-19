import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
  const requisitos = [
    nueva.length >= 12,
    /[a-z]/.test(nueva),
    /[A-Z]/.test(nueva),
    /\d/.test(nueva),
    /[^A-Za-z0-9]/.test(nueva),
  ];
  async function guardar() {
    if (!requisitos.every(Boolean) || nueva !== confirmacion)
      return Alert.alert(
        es ? "Revisa la contraseña" : "Check your password",
        es
          ? "Cumple todos los requisitos y confirma la misma contraseña."
          : "Meet all requirements and enter the same confirmation.",
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
    <KeyboardAvoidingView
      style={[estilos.pagina, { backgroundColor: tema.fondo }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          estilos.panel,
          { backgroundColor: tema.panel, borderColor: tema.borde },
        ]}
      >
        <View style={estilos.icono}>
          <Ionicons name="shield-checkmark" color={colores.azul} size={30} />
        </View>
        <Text style={[estilos.titulo, { color: tema.texto }]}>
          {es
            ? "Crea tu contraseña definitiva"
            : "Create your permanent password"}
        </Text>
        <Text style={estilos.detalle}>
          {es
            ? "La contraseña temporal solo sirve para el primer acceso. Nadie podrá operar hasta que la cambies."
            : "The temporary password is only for first access. No one can operate until you change it."}
        </Text>
        <Text style={estilos.etiqueta}>
          {es ? "Contraseña temporal" : "Temporary password"}
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
          {[
            es ? "12 caracteres" : "12 characters",
            es ? "minúscula" : "lowercase",
            es ? "mayúscula" : "uppercase",
            es ? "número" : "number",
            es ? "símbolo" : "symbol",
          ].map((texto, indice) => (
            <View key={texto} style={estilos.requisito}>
              <Ionicons
                name={
                  requisitos[indice] ? "checkmark-circle" : "ellipse-outline"
                }
                color={requisitos[indice] ? colores.verde : colores.gris}
                size={14}
              />
              <Text style={estilos.requisitoTexto}>{texto}</Text>
            </View>
          ))}
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
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  pagina: { flex: 1, justifyContent: "center", padding: 18 },
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
