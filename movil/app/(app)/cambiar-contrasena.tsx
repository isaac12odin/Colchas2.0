import { useEffect, useState } from "react";
import { Alert, BackHandler, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";

import { api } from "@/src/api";
import {
  BotonMovil,
  CampoMovil,
  PantallaMovil,
  TarjetaMovil,
} from "@/src/componentes/ui";
import { usarSesion } from "@/src/sesion";
import { usarTema } from "@/src/tema";
import { generarContrasenaSegura } from "@/src/utilidades/contrasenaSegura";

export default function CambiarContrasena() {
  const tema = usarTema();
  const { idioma, salir, usuario } = usarSesion();
  const es = idioma === "es";
  const cambioObligatorio = Boolean(usuario?.debeCambiarContrasena);
  const [actual, establecerActual] = useState("");
  const [nueva, establecerNueva] = useState("");
  const [confirmacion, establecerConfirmacion] = useState("");
  const [error, establecerError] = useState<string>();
  const [enviando, establecerEnviando] = useState(false);
  const [generando, establecerGenerando] = useState(false);
  const claveValida = nueva.length >= 6;
  const coincide = nueva.length > 0 && nueva === confirmacion;

  useEffect(() => {
    if (!cambioObligatorio) return;
    const suscripcion = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true,
    );
    return () => suscripcion.remove();
  }, [cambioObligatorio]);

  async function generar() {
    establecerGenerando(true);
    establecerError(undefined);
    try {
      const clave = await generarContrasenaSegura();
      establecerNueva(clave);
      establecerConfirmacion(clave);
    } catch {
      establecerError(
        es
          ? "No fue posible generar la clave en este equipo. Puedes escribir una manualmente."
          : "A password could not be generated on this device. You can enter one manually.",
      );
    } finally {
      establecerGenerando(false);
    }
  }

  async function guardar() {
    establecerError(undefined);
    if (actual.length < 6) {
      establecerError(
        es ? "Escribe tu contraseña actual." : "Enter your current password.",
      );
      return;
    }
    if (!claveValida) {
      establecerError(
        es
          ? "La nueva contraseña debe tener al menos 6 caracteres."
          : "The new password must contain at least 6 characters.",
      );
      return;
    }
    if (!coincide) {
      establecerError(
        es
          ? "Las contraseñas nuevas no coinciden."
          : "The new passwords do not match.",
      );
      return;
    }
    if (actual === nueva) {
      establecerError(
        es
          ? "La contraseña nueva debe ser distinta de la actual."
          : "The new password must differ from the current one.",
      );
      return;
    }

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
          ? "La contraseña cambió correctamente. Vuelve a entrar con tu nueva clave."
          : "Your password was changed. Sign in again with your new password.",
        [{ text: es ? "Continuar" : "Continue", onPress: () => void salir() }],
        { cancelable: false },
      );
    } catch (fallo) {
      establecerError(
        fallo instanceof Error
          ? fallo.message
          : es
            ? "No fue posible cambiar la contraseña."
            : "The password could not be changed.",
      );
    } finally {
      establecerEnviando(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: es ? "Cambiar contraseña" : "Change password",
          headerBackVisible: !cambioObligatorio,
          gestureEnabled: !cambioObligatorio,
        }}
      />
      <PantallaMovil conTeclado estiloContenido={estilos.contenido}>
        <View style={[estilos.icono, { backgroundColor: tema.primarioSuave }]}>
          <Ionicons name="shield-checkmark" color={tema.primario} size={30} />
        </View>
        <Text style={[estilos.titulo, { color: tema.texto }]}>
          {es ? "Protege tu acceso" : "Protect your access"}
        </Text>
        <Text style={[estilos.detalle, { color: tema.textoSecundario }]}>
          {cambioObligatorio
            ? es
              ? "Tu clave actual es temporal. Debes crear una propia antes de entrar a ventas, cobranza o inventario. Al terminar volverás a iniciar sesión."
              : "Your current password is temporary. Create your own before opening sales, collections, or inventory. You will sign in again afterward."
            : es
              ? "Puedes escribir tu propia clave o generar una segura. Los ojos permiten comprobarla antes de guardar."
              : "Enter your own password or generate a secure one. Use the eye icons to verify it before saving."}
        </Text>

        <TarjetaMovil estilo={estilos.formulario} elevada>
          <CampoMovil
            etiqueta={es ? "Contraseña actual" : "Current password"}
            valor={actual}
            alCambiar={establecerActual}
            contrasena
            requerido
            autoCapitalize="none"
            icono="lock-closed-outline"
          />

          <View style={estilos.generador}>
            <Text
              style={[estilos.generadorTexto, { color: tema.textoSecundario }]}
            >
              {es
                ? "¿Quieres una clave difícil de adivinar?"
                : "Want a hard-to-guess password?"}
            </Text>
            <BotonMovil
              texto={es ? "Generar clave segura" : "Generate secure password"}
              icono="sparkles-outline"
              variante="secundario"
              cargando={generando}
              expandido={false}
              alPulsar={() => void generar()}
            />
          </View>

          <CampoMovil
            etiqueta={es ? "Nueva contraseña" : "New password"}
            ayuda={
              es
                ? "Mínimo 6 caracteres. El generador crea una clave de 20."
                : "At least 6 characters. The generator creates a 20-character password."
            }
            valor={nueva}
            alCambiar={establecerNueva}
            contrasena
            requerido
            autoCapitalize="none"
            icono="key-outline"
          />
          <CampoMovil
            etiqueta={es ? "Confirmar contraseña" : "Confirm password"}
            error={
              confirmacion.length > 0 && !coincide
                ? es
                  ? "Todavía no coincide."
                  : "It does not match yet."
                : undefined
            }
            valor={confirmacion}
            alCambiar={establecerConfirmacion}
            contrasena
            requerido
            autoCapitalize="none"
            icono="checkmark-circle-outline"
            alEnviar={() => void guardar()}
          />

          {error ? (
            <View
              accessibilityLiveRegion="assertive"
              style={[estilos.error, { backgroundColor: tema.peligroSuave }]}
            >
              <Ionicons name="alert-circle" color={tema.peligro} size={20} />
              <Text style={[estilos.errorTexto, { color: tema.peligro }]}>
                {error}
              </Text>
            </View>
          ) : null}

          <BotonMovil
            texto={es ? "Guardar contraseña" : "Save password"}
            icono="lock-closed"
            cargando={enviando}
            alPulsar={() => void guardar()}
          />
        </TarjetaMovil>
      </PantallaMovil>
    </>
  );
}

const estilos = StyleSheet.create({
  contenido: { maxWidth: 620, width: "100%", justifyContent: "center" },
  icono: {
    width: 58,
    height: 58,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  titulo: { fontSize: 26, lineHeight: 32, fontWeight: "900", marginTop: 16 },
  detalle: { fontSize: 14, lineHeight: 21, marginTop: 6 },
  formulario: { gap: 17, marginTop: 20 },
  generador: { gap: 9, alignItems: "flex-start" },
  generadorTexto: { fontSize: 13, lineHeight: 18 },
  error: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  errorTexto: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: "700" },
});
