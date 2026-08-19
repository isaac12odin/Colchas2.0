import { StyleSheet, Text, View } from "react-native";

import { colores, type usarTema } from "../../tema";
import { dinero } from "../../utilidades/formato";

interface Propiedades {
  visitados: number;
  totalClientes: number;
  totalPorCobrar: number;
  es: boolean;
  tema: ReturnType<typeof usarTema>;
}

export function ResumenJornada({
  visitados,
  totalClientes,
  totalPorCobrar,
  es,
  tema,
}: Propiedades) {
  return (
    <View
      style={[
        estilos.contenedor,
        { backgroundColor: tema.panel, borderColor: tema.borde },
      ]}
    >
      <Dato
        valor={`${visitados}/${totalClientes}`}
        etiqueta={es ? "visitados" : "visited"}
        color={tema.texto}
      />
      <View style={[estilos.separador, { backgroundColor: tema.borde }]} />
      <Dato
        valor={dinero.format(totalPorCobrar)}
        etiqueta={es ? "cuotas previstas" : "expected installments"}
        color={tema.texto}
      />
    </View>
  );
}

function Dato({
  valor,
  etiqueta,
  color,
}: {
  valor: string;
  etiqueta: string;
  color: string;
}) {
  return (
    <View>
      <Text style={[estilos.numero, { color }]}>{valor}</Text>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    margin: 13,
    marginBottom: 2,
    padding: 13,
    borderWidth: 1,
    borderRadius: 13,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  numero: { fontWeight: "900", fontSize: 16 },
  etiqueta: { color: colores.gris, fontSize: 10, marginTop: 2 },
  separador: { width: 1, height: 34 },
});
