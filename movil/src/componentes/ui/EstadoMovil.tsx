import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { radios, usarTema } from "../../tema";

export function EstadoMovil({
  tipo,
  texto,
}: {
  tipo: "informacion" | "exito" | "advertencia" | "error";
  texto: string;
}) {
  const tema = usarTema();
  const mapa = {
    informacion: {
      fondo: tema.primarioSuave,
      color: tema.primario,
      icono: "information-circle-outline" as const,
    },
    exito: {
      fondo: tema.exitoSuave,
      color: tema.exito,
      icono: "checkmark-circle-outline" as const,
    },
    advertencia: {
      fondo: tema.advertenciaSuave,
      color: tema.advertencia,
      icono: "warning-outline" as const,
    },
    error: {
      fondo: tema.peligroSuave,
      color: tema.peligro,
      icono: "alert-circle-outline" as const,
    },
  }[tipo];
  return (
    <View style={[estilos.base, { backgroundColor: mapa.fondo }]}>
      <Ionicons name={mapa.icono} color={mapa.color} size={20} />
      <Text style={[estilos.texto, { color: mapa.color }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  base: {
    borderRadius: radios.campo,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  texto: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "700" },
});
