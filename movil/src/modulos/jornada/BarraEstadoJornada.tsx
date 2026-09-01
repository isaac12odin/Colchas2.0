import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { radios, tactilMinimo, usarTema } from "../../tema";

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
  const tema = usarTema();
  const estado = offline
    ? {
        fondo: tema.advertenciaSuave,
        color: tema.advertencia,
        borde: tema.advertencia,
        icono: "cloud-offline-outline" as const,
        texto: es
          ? "Sin señal · la jornada cifrada sigue disponible"
          : "Offline · the encrypted route remains available",
      }
    : pendientes > 0
      ? {
          fondo: tema.primarioSuave,
          color: tema.primario,
          borde: tema.primario,
          icono: "sync-outline" as const,
          texto: es
            ? `${pendientes} ${pendientes === 1 ? "movimiento protegido pendiente" : "movimientos protegidos pendientes"}`
            : `${pendientes} protected ${pendientes === 1 ? "movement" : "movements"} pending`,
        }
      : {
          fondo: tema.exitoSuave,
          color: tema.exito,
          borde: tema.exito,
          icono: "shield-checkmark-outline" as const,
          texto: es
            ? "Jornada actualizada y disponible sin conexión"
            : "Route updated and available offline",
        };

  return (
    <View
      accessibilityRole="summary"
      style={[
        estilos.barra,
        { backgroundColor: estado.fondo, borderColor: estado.borde },
      ]}
    >
      <View style={[estilos.icono, { borderColor: estado.color }]}>
        <Ionicons name={estado.icono} color={estado.color} size={22} />
      </View>
      <Text style={[estilos.texto, { color: estado.color }]}>
        {estado.texto}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          es
            ? `Ver operaciones pendientes. ${pendientes} pendientes`
            : `View pending operations. ${pendientes} pending`
        }
        accessibilityHint={
          es
            ? "Abre la bitácora de sincronización"
            : "Opens the synchronization log"
        }
        onPress={alVerPendientes}
        style={({ pressed }) => [
          estilos.pendientes,
          {
            backgroundColor: tema.panel,
            borderColor: estado.color,
            opacity: pressed ? 0.72 : 1,
          },
        ]}
      >
        <Text style={[estilos.numero, { color: estado.color }]}>
          {pendientes}
        </Text>
        <Ionicons name="chevron-forward" color={estado.color} size={16} />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: {
    minHeight: 72,
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  icono: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  texto: {
    minWidth: 0,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
  },
  pendientes: {
    minWidth: 60,
    minHeight: tactilMinimo,
    borderRadius: radios.pastilla,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  numero: { fontSize: 14, lineHeight: 19, fontWeight: "900" },
});
