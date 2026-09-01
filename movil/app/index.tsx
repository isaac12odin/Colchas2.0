import { useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";

import {
  BotonMovil,
  CampoMovil,
  EstadoMovil,
  PantallaMovil,
  TarjetaMovil,
  usarDisenoResponsivo,
} from "@/src/componentes/ui";
import { usarSesion } from "@/src/sesion";
import { usarTema } from "@/src/tema";

export default function IniciarSesion() {
  const { usuario, cargando, iniciar, idioma, alternarIdioma } = usarSesion();
  const tema = usarTema();
  const diseno = usarDisenoResponsivo();
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
        <ActivityIndicator color={tema.primario} />
      </View>
    );
  if (usuario)
    return (
      <Redirect
        href={
          usuario.debeCambiarContrasena ? "/(app)/cambiar-contrasena" : "/(app)"
        }
      />
    );

  async function enviar() {
    if (!correo.trim() || !contrasena) {
      establecerError(
        es
          ? "Escribe tu correo y contraseña para continuar."
          : "Enter your email and password to continue.",
      );
      return;
    }
    establecerEnviando(true);
    establecerError("");
    try {
      establecerMfaRequerido(
        await iniciar(correo.trim(), contrasena, codigoMfa || undefined),
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
    <PantallaMovil
      incluirSuperior
      conTeclado
      estiloContenido={estilos.contenido}
    >
      <View style={[estilos.columna, diseno.tableta && estilos.columnaTableta]}>
        <View style={estilos.identidad}>
          <Image
            source={require("../assets/vektra-logo-compact.png")}
            resizeMode="contain"
            style={[estilos.logo, diseno.compacto && estilos.logoCompacto]}
            accessibilityLabel="Vektra · Precision in Motion"
          />
          <Text style={[estilos.subtitulo, { color: tema.textoSecundario }]}>
            {es
              ? "Cobranza, ventas e inventario; incluso sin señal."
              : "Collections, sales, and inventory—even offline."}
          </Text>
        </View>

        <TarjetaMovil elevada estilo={estilos.panel}>
          <Text style={[estilos.encabezado, { color: tema.texto }]}>
            {es ? "Bienvenido" : "Welcome"}
          </Text>
          <Text style={[estilos.detalle, { color: tema.textoSecundario }]}>
            {es
              ? "Ingresa para continuar con tu operación."
              : "Sign in to continue your operation."}
          </Text>
          <View style={estilos.formulario}>
            <CampoMovil
              etiqueta={es ? "Correo" : "Email"}
              valor={correo}
              alCambiar={establecerCorreo}
              placeholder="nombre@empresa.com"
              icono="mail-outline"
              autoCapitalize="none"
              teclado="email-address"
              requerido
            />
            <CampoMovil
              etiqueta={es ? "Contraseña" : "Password"}
              valor={contrasena}
              alCambiar={establecerContrasena}
              placeholder={es ? "Escribe tu contraseña" : "Enter your password"}
              icono="lock-closed-outline"
              contrasena
              requerido
              alEnviar={() => void enviar()}
            />
            {mfaRequerido ? (
              <CampoMovil
                etiqueta={es ? "Código del autenticador" : "Authenticator code"}
                valor={codigoMfa}
                alCambiar={(valor) =>
                  establecerCodigoMfa(valor.replace(/\D/g, "").slice(0, 6))
                }
                teclado="number-pad"
                placeholder="000000"
                icono="keypad-outline"
                maxLength={6}
                requerido
              />
            ) : null}
            {error ? <EstadoMovil tipo="error" texto={error} /> : null}
            <BotonMovil
              texto={es ? "Entrar" : "Sign in"}
              icono="arrow-forward"
              cargando={enviando}
              alPulsar={() => void enviar()}
            />
            <BotonMovil
              texto={es ? "Use in English" : "Usar en español"}
              variante="texto"
              alPulsar={alternarIdioma}
            />
          </View>
        </TarjetaMovil>
        <Text style={[estilos.pie, { color: tema.textoTenue }]}>
          {es
            ? "Tus movimientos sin conexión permanecen cifrados en este equipo."
            : "Your offline work remains encrypted on this device."}
        </Text>
      </View>
    </PantallaMovil>
  );
}

const estilos = StyleSheet.create({
  contenido: { flexGrow: 1, justifyContent: "center", paddingVertical: 20 },
  columna: { width: "100%", gap: 18 },
  columnaTableta: { maxWidth: 500, alignSelf: "center" },
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  identidad: { alignItems: "center" },
  logo: { width: 210, height: 118 },
  logoCompacto: { width: 170, height: 88 },
  subtitulo: {
    maxWidth: 380,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 4,
  },
  panel: { padding: 20 },
  encabezado: { fontSize: 25, lineHeight: 31, fontWeight: "900" },
  detalle: { fontSize: 13, lineHeight: 19, marginTop: 5 },
  formulario: { gap: 15, marginTop: 20 },
  pie: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: 12,
  },
});
