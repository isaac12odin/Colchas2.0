import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  PantallaMovil,
  SelectorSegmentado,
  TarjetaMovil,
} from "@/src/componentes/ui";
import { usarSesion } from "@/src/sesion";
import {
  radios,
  tactilMinimo,
  usarPreferenciaTema,
  usarTema,
} from "@/src/tema";

export default function PerfilMovil() {
  const { usuario, idioma, alternarIdioma } = usarSesion();
  const tema = usarTema();
  const { modo, establecerModo } = usarPreferenciaTema();
  const es = idioma === "es";

  return (
    <PantallaMovil estiloContenido={estilos.contenido}>
      <View style={estilos.introduccion}>
        <View style={[estilos.avatar, { backgroundColor: tema.primarioSuave }]}>
          <Ionicons name="person" color={tema.primario} size={30} />
        </View>
        <View style={estilos.expandir}>
          <Text style={[estilos.nombre, { color: tema.texto }]}>
            {usuario?.nombre}
          </Text>
          <Text style={[estilos.correo, { color: tema.textoSecundario }]}>
            {usuario?.correo}
          </Text>
          <Text style={[estilos.rol, { color: tema.primario }]}>
            {usuario?.rol}
          </Text>
        </View>
      </View>

      <Text style={[estilos.seccion, { color: tema.textoSecundario }]}>
        {es ? "PREFERENCIAS Y SEGURIDAD" : "PREFERENCES AND SECURITY"}
      </Text>
      <TarjetaMovil estilo={estilos.lista}>
        <Accion
          icono="lock-closed-outline"
          titulo={es ? "Cambiar contraseña" : "Change password"}
          detalle={
            es
              ? "Actualiza tu clave de acceso de forma segura"
              : "Securely update your access password"
          }
          tema={tema}
          alPulsar={() => router.push("/(app)/cambiar-contrasena")}
        />
        <View style={[estilos.separador, { backgroundColor: tema.borde }]} />
        <Accion
          icono="language-outline"
          titulo={es ? "Idioma" : "Language"}
          detalle={
            es ? "Español · cambiar a inglés" : "English · switch to Spanish"
          }
          tema={tema}
          alPulsar={alternarIdioma}
        />
        <View style={[estilos.separador, { backgroundColor: tema.borde }]} />
        <View style={estilos.apariencia}>
          <View style={estilos.accion}>
            <View
              style={[
                estilos.accionIcono,
                { backgroundColor: tema.primarioSuave },
              ]}
            >
              <Ionicons
                name={tema.oscuro ? "moon" : "sunny"}
                color={tema.primario}
                size={21}
              />
            </View>
            <View style={estilos.expandir}>
              <Text style={[estilos.accionTitulo, { color: tema.texto }]}>
                {es ? "Apariencia del sistema" : "System appearance"}
              </Text>
              <Text
                style={[estilos.accionDetalle, { color: tema.textoSecundario }]}
              >
                {es
                  ? "Elige cómo quieres ver Vektra en este equipo."
                  : "Choose how Vektra should look on this device."}
              </Text>
            </View>
          </View>
          <SelectorSegmentado
            valor={modo}
            alCambiar={(siguiente) => void establecerModo(siguiente)}
            opciones={[
              { valor: "SISTEMA", texto: es ? "Sistema" : "System" },
              { valor: "CLARO", texto: es ? "Claro" : "Light" },
              { valor: "OSCURO", texto: es ? "Oscuro" : "Dark" },
            ]}
          />
        </View>
      </TarjetaMovil>

      <Text style={[estilos.nota, { color: tema.textoTenue }]}>
        {es
          ? "Por seguridad, los cambios de rol y permisos sólo se realizan desde la web por un administrador."
          : "For security, only an administrator can change roles and permissions from the web app."}
      </Text>
    </PantallaMovil>
  );
}

function Accion({
  icono,
  titulo,
  detalle,
  tema,
  alPulsar,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  titulo: string;
  detalle: string;
  tema: ReturnType<typeof usarTema>;
  alPulsar: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${titulo}. ${detalle}`}
      onPress={alPulsar}
      style={({ pressed }) => [estilos.accion, pressed && { opacity: 0.7 }]}
    >
      <View
        style={[estilos.accionIcono, { backgroundColor: tema.primarioSuave }]}
      >
        <Ionicons name={icono} color={tema.primario} size={21} />
      </View>
      <View style={estilos.expandir}>
        <Text style={[estilos.accionTitulo, { color: tema.texto }]}>
          {titulo}
        </Text>
        <Text style={[estilos.accionDetalle, { color: tema.textoSecundario }]}>
          {detalle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" color={tema.textoTenue} size={20} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  contenido: { paddingTop: 22 },
  introduccion: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  nombre: { fontSize: 21, lineHeight: 27, fontWeight: "900" },
  correo: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  rol: { fontSize: 12, lineHeight: 17, fontWeight: "900", marginTop: 4 },
  seccion: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 28,
    marginBottom: 9,
  },
  lista: { paddingVertical: 3, paddingHorizontal: 14 },
  accion: {
    minHeight: tactilMinimo + 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 11,
  },
  apariencia: { paddingVertical: 7, gap: 8 },
  accionIcono: {
    width: 43,
    height: 43,
    borderRadius: radios.campo,
    alignItems: "center",
    justifyContent: "center",
  },
  accionTitulo: { fontSize: 14, lineHeight: 19, fontWeight: "800" },
  accionDetalle: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  separador: { height: 1, marginLeft: 54 },
  nota: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 18,
    paddingHorizontal: 8,
  },
  expandir: { flex: 1, minWidth: 0 },
});
