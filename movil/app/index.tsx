import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { usarSesion } from "@/src/sesion";
import { colores, usarTema } from "@/src/tema";

export default function IniciarSesion() {
  const { usuario, cargando, iniciar, idioma, alternarIdioma } = usarSesion();
  const tema = usarTema();
  const es = idioma === "es";
  const [correo, establecerCorreo] = useState("");
  const [contrasena, establecerContrasena] = useState("");
  const [codigoMfa, establecerCodigoMfa] = useState("");
  const [mfaRequerido, establecerMfaRequerido] = useState(false);
  const [enviando, establecerEnviando] = useState(false);
  const [error, establecerError] = useState("");
  if (process.env.EXPO_PUBLIC_E2E_SQLCIPHER === "SI")
    return <Redirect href="/verificacion-offline" />;
  if (cargando)
    return (
      <View style={[estilos.centro, { backgroundColor: tema.fondo }]}>
        <ActivityIndicator color={colores.azul} />
      </View>
    );
  if (usuario) return <Redirect href="/(app)" />;
  async function enviar() {
    establecerEnviando(true);
    establecerError("");
    try {
      establecerMfaRequerido(
        await iniciar(correo, contrasena, codigoMfa || undefined),
      );
    } catch (e) {
      establecerError(
        e instanceof Error
          ? e.message
          : es
            ? "No fue posible ingresar."
            : "Unable to sign in.",
      );
    } finally {
      establecerEnviando(false);
    }
  }
  return (
    <SafeAreaView style={[estilos.pagina, { backgroundColor: tema.fondo }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={estilos.contenido}
      >
        <Image
          source={require("../assets/vektra-logo-compact.png")}
          resizeMode="contain"
          style={estilos.logo}
          accessibilityLabel="Vektra · Precision in Motion"
        />
        <Text style={estilos.subtitulo}>
          {es
            ? "PRECISION IN MOTION · Cobranza e inventario, aun sin señal."
            : "Collections and inventory, even offline."}
        </Text>
        <View
          style={[
            estilos.panel,
            { backgroundColor: tema.panel, borderColor: tema.borde },
          ]}
        >
          <Text style={[estilos.encabezado, { color: tema.texto }]}>
            {es ? "Iniciar sesión" : "Sign in"}
          </Text>
          <Text style={[estilos.etiqueta, { color: tema.texto }]}>
            {es ? "Correo" : "Email"}
          </Text>
          <TextInput
            style={[
              estilos.campo,
              { color: tema.texto, borderColor: tema.borde },
            ]}
            value={correo}
            onChangeText={establecerCorreo}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Text style={[estilos.etiqueta, { color: tema.texto }]}>
            {es ? "Contraseña" : "Password"}
          </Text>
          <TextInput
            style={[
              estilos.campo,
              { color: tema.texto, borderColor: tema.borde },
            ]}
            value={contrasena}
            onChangeText={establecerContrasena}
            secureTextEntry
          />
          {mfaRequerido ? (
            <>
              <Text style={[estilos.etiqueta, { color: tema.texto }]}>
                Código del autenticador
              </Text>
              <TextInput
                style={[
                  estilos.campo,
                  {
                    color: tema.texto,
                    borderColor: tema.borde,
                    textAlign: "center",
                    letterSpacing: 8,
                  },
                ]}
                value={codigoMfa}
                onChangeText={(valor) =>
                  establecerCodigoMfa(valor.replace(/\D/g, "").slice(0, 6))
                }
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                maxLength={6}
              />
            </>
          ) : null}
          {error ? <Text style={estilos.error}>{error}</Text> : null}
          <Pressable onPress={enviar} disabled={enviando} style={estilos.boton}>
            <Text style={estilos.botonTexto}>
              {enviando ? "…" : es ? "Entrar" : "Sign in"}
            </Text>
            <Ionicons name="arrow-forward" color="white" size={18} />
          </Pressable>
          <Pressable onPress={alternarIdioma}>
            <Text style={estilos.idioma}>
              {es ? "Use in English" : "Usar en español"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pagina: { flex: 1 },
  contenido: { flex: 1, justifyContent: "center", padding: 24 },
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  logo: { width: 235, height: 150, alignSelf: "center" },
  subtitulo: {
    fontSize: 16,
    color: colores.gris,
    marginTop: 6,
    marginBottom: 28,
  },
  panel: { borderWidth: 1, borderRadius: 18, padding: 20 },
  encabezado: { fontSize: 22, fontWeight: "700", marginBottom: 22 },
  etiqueta: { fontSize: 13, fontWeight: "600", marginBottom: 7 },
  campo: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 13,
    marginBottom: 16,
  },
  error: { color: colores.rojo, marginBottom: 12 },
  boton: {
    height: 50,
    borderRadius: 10,
    backgroundColor: colores.azul,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  botonTexto: { color: "white", fontWeight: "700", fontSize: 16 },
  idioma: {
    color: colores.azul,
    fontWeight: "600",
    textAlign: "center",
    paddingTop: 18,
  },
});
