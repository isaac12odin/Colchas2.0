import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { radios, tactilMinimo, usarTema } from "../../tema";

export function SelectorSegmentado<T extends string>({
  etiqueta,
  opciones,
  valor,
  alCambiar,
}: {
  etiqueta?: string;
  opciones: Array<{ valor: T; texto: string }>;
  valor: T;
  alCambiar: (valor: T) => void;
}) {
  const tema = usarTema();
  const { width, fontScale } = useWindowDimensions();
  const ajustarEnDosFilas =
    opciones.length > 2 && (width < 380 || fontScale > 1.2);
  return (
    <View style={estilos.grupo} accessibilityRole="radiogroup">
      {etiqueta ? (
        <Text style={[estilos.etiqueta, { color: tema.textoSecundario }]}>
          {etiqueta}
        </Text>
      ) : null}
      <View
        style={[
          estilos.contenedor,
          ajustarEnDosFilas && estilos.contenedorEnDosFilas,
          { backgroundColor: tema.campoDeshabilitado, borderColor: tema.borde },
        ]}
      >
        {opciones.map((opcion) => {
          const activa = opcion.valor === valor;
          return (
            <Pressable
              key={opcion.valor}
              accessibilityRole="radio"
              accessibilityLabel={opcion.texto}
              accessibilityState={{ checked: activa }}
              onPress={() => alCambiar(opcion.valor)}
              style={({ pressed }) => [
                estilos.opcion,
                ajustarEnDosFilas && estilos.opcionEnDosFilas,
                activa && {
                  backgroundColor: tema.primario,
                  borderColor: tema.primario,
                },
                pressed && { opacity: 0.78 },
              ]}
            >
              <Text
                style={[
                  estilos.texto,
                  { color: activa ? tema.sobrePrimario : tema.textoSecundario },
                ]}
                numberOfLines={2}
              >
                {opcion.texto}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: 6 },
  etiqueta: { fontSize: 13, lineHeight: 18, fontWeight: "700" },
  contenedor: {
    borderWidth: 1,
    borderRadius: radios.boton,
    padding: 3,
    flexDirection: "row",
    gap: 3,
  },
  contenedorEnDosFilas: { flexWrap: "wrap" },
  opcion: {
    flex: 1,
    minHeight: tactilMinimo,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    paddingVertical: 7,
  },
  opcionEnDosFilas: { flexBasis: "47%" },
  texto: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "800",
    textAlign: "center",
  },
});
