import { StyleSheet, Text, View } from "react-native";

import { usarTema } from "../../tema";

export function ProgresoPasos({
  pasos,
  actual,
}: {
  pasos: string[];
  actual: number;
}) {
  const tema = usarTema();
  return (
    <View style={estilos.contenedor} accessibilityRole="progressbar">
      <Text style={[estilos.texto, { color: tema.textoSecundario }]}>
        {pasos[actual - 1]} · {actual}/{pasos.length}
      </Text>
      <View
        style={[estilos.pista, { backgroundColor: tema.campoDeshabilitado }]}
      >
        <View
          style={[
            estilos.avance,
            {
              backgroundColor: tema.primario,
              width: `${Math.max(0, Math.min(100, (actual / pasos.length) * 100))}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: 7 },
  texto: { fontSize: 12, lineHeight: 17, fontWeight: "800" },
  pista: { height: 5, borderRadius: 999, overflow: "hidden" },
  avance: { height: "100%", borderRadius: 999 },
});
