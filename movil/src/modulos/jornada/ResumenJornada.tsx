import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { espaciado, radios, type usarTema } from "../../tema";
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
  const { width, fontScale } = useWindowDimensions();
  const apilar = width < 350 || fontScale >= 1.45;
  const porcentaje =
    totalClientes > 0
      ? Math.min(
          100,
          Math.max(0, Math.round((visitados / totalClientes) * 100)),
        )
      : 0;

  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLabel={
        es
          ? `Progreso de jornada: ${visitados} de ${totalClientes} clientes visitados, ${porcentaje} por ciento. Cuotas previstas: ${dinero.format(totalPorCobrar)}.`
          : `Route progress: ${visitados} of ${totalClientes} customers visited, ${porcentaje} percent. Expected installments: ${dinero.format(totalPorCobrar)}.`
      }
      style={[
        estilos.contenedor,
        { backgroundColor: tema.panel, borderColor: tema.borde },
      ]}
    >
      <View style={estilos.encabezado}>
        <View
          style={[
            estilos.iconoEncabezado,
            { backgroundColor: tema.primarioSuave },
          ]}
        >
          <Ionicons name="navigate-outline" color={tema.primario} size={20} />
        </View>
        <View style={estilos.titulos}>
          <Text style={[estilos.titulo, { color: tema.texto }]}>
            {es ? "Progreso de jornada" : "Route progress"}
          </Text>
          <Text style={[estilos.detalle, { color: tema.textoSecundario }]}>
            {totalClientes > 0
              ? es
                ? `${porcentaje}% completado`
                : `${porcentaje}% completed`
              : es
                ? "Sin clientes asignados"
                : "No assigned customers"}
          </Text>
        </View>
      </View>

      <View
        style={[estilos.pista, { backgroundColor: tema.campoDeshabilitado }]}
      >
        <View
          style={[
            estilos.avance,
            { width: `${porcentaje}%`, backgroundColor: tema.primario },
          ]}
        />
      </View>

      <View style={[estilos.datos, apilar && estilos.datosApilados]}>
        <Dato
          valor={`${visitados}/${totalClientes}`}
          etiqueta={es ? "Clientes visitados" : "Customers visited"}
          icono="people-outline"
          tema={tema}
        />
        <View
          style={[
            apilar ? estilos.separadorHorizontal : estilos.separadorVertical,
            { backgroundColor: tema.borde },
          ]}
        />
        <Dato
          valor={dinero.format(totalPorCobrar)}
          etiqueta={es ? "Cuotas previstas" : "Expected installments"}
          icono="cash-outline"
          tema={tema}
        />
      </View>
    </View>
  );
}

function Dato({
  valor,
  etiqueta,
  icono,
  tema,
}: {
  valor: string;
  etiqueta: string;
  icono: keyof typeof Ionicons.glyphMap;
  tema: ReturnType<typeof usarTema>;
}) {
  return (
    <View style={estilos.dato}>
      <Ionicons name={icono} color={tema.textoSecundario} size={19} />
      <View style={estilos.contenidoDato}>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          numberOfLines={1}
          style={[estilos.numero, { color: tema.texto }]}
        >
          {valor}
        </Text>
        <Text style={[estilos.etiqueta, { color: tema.textoSecundario }]}>
          {etiqueta}
        </Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    marginHorizontal: 13,
    marginTop: 13,
    marginBottom: 3,
    padding: espaciado.md,
    borderWidth: 1,
    borderRadius: radios.tarjeta,
    gap: espaciado.sm,
  },
  encabezado: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconoEncabezado: {
    width: 42,
    height: 42,
    borderRadius: radios.campo,
    alignItems: "center",
    justifyContent: "center",
  },
  titulos: { minWidth: 0, flex: 1 },
  titulo: { fontSize: 15, lineHeight: 20, fontWeight: "900" },
  detalle: { marginTop: 1, fontSize: 12, lineHeight: 17, fontWeight: "600" },
  pista: { height: 8, overflow: "hidden", borderRadius: radios.pastilla },
  avance: { height: "100%", borderRadius: radios.pastilla },
  datos: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: espaciado.sm,
  },
  datosApilados: { flexDirection: "column" },
  dato: {
    minWidth: 0,
    minHeight: 58,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  contenidoDato: { minWidth: 0, flex: 1 },
  numero: { fontWeight: "900", fontSize: 17, lineHeight: 22 },
  etiqueta: { fontSize: 12, lineHeight: 17, marginTop: 1, fontWeight: "600" },
  separadorVertical: { width: 1, alignSelf: "stretch" },
  separadorHorizontal: { height: 1, width: "100%" },
});
