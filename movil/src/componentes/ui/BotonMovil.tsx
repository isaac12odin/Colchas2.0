import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { radios, tactilMinimo, usarTema } from "../../tema";

type Variante = "primario" | "secundario" | "texto" | "peligro";

export function BotonMovil({
  texto,
  alPulsar,
  icono,
  variante = "primario",
  cargando = false,
  deshabilitado = false,
  expandido = true,
  estilo,
  etiquetaAccesible,
}: {
  texto: string;
  alPulsar: () => void;
  icono?: keyof typeof Ionicons.glyphMap;
  variante?: Variante;
  cargando?: boolean;
  deshabilitado?: boolean;
  expandido?: boolean;
  estilo?: StyleProp<ViewStyle>;
  etiquetaAccesible?: string;
}) {
  const tema = usarTema();
  const bloqueado = cargando || deshabilitado;
  const esSolido = variante === "primario" || variante === "peligro";
  const fondo =
    variante === "primario"
      ? tema.primario
      : variante === "peligro"
        ? tema.peligro
        : "transparent";
  const textoColor =
    variante === "primario"
      ? tema.sobrePrimario
      : variante === "peligro"
        ? "#ffffff"
        : tema.primario;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiquetaAccesible ?? texto}
      accessibilityState={{ disabled: bloqueado, busy: cargando }}
      disabled={bloqueado}
      onPress={alPulsar}
      style={({ pressed }) => [
        estilos.base,
        expandido && estilos.expandido,
        variante !== "texto" && estilos.conBorde,
        {
          backgroundColor: fondo,
          borderColor: variante === "peligro" ? tema.peligro : tema.primario,
          opacity: bloqueado ? 0.45 : pressed ? 0.78 : 1,
        },
        estilo,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={textoColor} />
      ) : icono ? (
        <Ionicons name={icono} size={20} color={textoColor} />
      ) : null}
      <Text style={[estilos.texto, { color: textoColor }]} numberOfLines={2}>
        {texto}
      </Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: tactilMinimo + 4,
    borderRadius: radios.boton,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  expandido: { width: "100%" },
  conBorde: { borderWidth: 1 },
  texto: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    textAlign: "center",
    flexShrink: 1,
  },
});
