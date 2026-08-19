import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colores } from "../../tema";

interface Propiedades {
  offline: boolean;
  pendientes: number;
  es: boolean;
  alVerPendientes: () => void;
}

export function BarraEstadoJornada({
  offline,
  pendientes,
  es,
  alVerPendientes,
}: Propiedades) {
  const fondo = offline ? "#fff2e8" : "#defbe6";
  const color = offline ? "#8a3b12" : "#0e6027";
  return (
    <View style={[estilos.barra, { backgroundColor: fondo }]}>
      <Ionicons
        name={offline ? "cloud-offline" : "shield-checkmark"}
        color={color}
        size={17}
      />
      <Text style={[estilos.texto, { color }]}>
        {offline
          ? es
            ? "Sin señal · jornada cifrada disponible"
            : "Offline · encrypted route available"
          : es
            ? "Jornada actualizada y lista para trabajar offline"
            : "Route updated and ready offline"}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          es ? "Ver operaciones pendientes" : "View pending operations"
        }
        onPress={alVerPendientes}
        style={estilos.pendientes}
      >
        <Text style={estilos.numero}>{pendientes}</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    gap: 7,
  },
  texto: { flex: 1, fontSize: 11, fontWeight: "700" },
  pendientes: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colores.azul,
    alignItems: "center",
    justifyContent: "center",
  },
  numero: { color: "white", fontSize: 11, fontWeight: "800" },
});
