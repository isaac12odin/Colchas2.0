import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { usarDisenoResponsivo } from "../../componentes/ui";
import { espaciado, radios, tactilMinimo, type usarTema } from "../../tema";
import type { ClienteJornada } from "../../tipos";
import { dinero } from "../../utilidades/formato";
import { cuotaEsperada } from "./dominioJornada";

type Tema = ReturnType<typeof usarTema>;

interface Propiedades {
  cliente: ClienteJornada;
  es: boolean;
  tema: Tema;
  guardando: boolean;
  alCobrar: () => void;
  alVender: () => void;
  alEntregar: () => void;
  alNoPagar: () => void;
  alAusente: () => void;
}

export function AccionesCliente({
  cliente,
  es,
  tema,
  guardando,
  alCobrar,
  alVender,
  alEntregar,
  alNoPagar,
  alAusente,
}: Propiedades) {
  const cuota = cuotaEsperada(cliente);
  const diseno = usarDisenoResponsivo();
  const pedidos = cliente.pedidos.length;

  return (
    <View style={estilos.contenedor}>
      {Number(cliente.saldo?.saldoActual ?? 0) > 0 && (
        <Pressable
          disabled={guardando}
          style={({ pressed }) => [
            estilos.principal,
            { backgroundColor: tema.primario },
            (pressed || guardando) && estilos.pulsado,
          ]}
          onPress={alCobrar}
          accessibilityRole="button"
          accessibilityLabel={es ? "Registrar abono" : "Record payment"}
          accessibilityHint={
            cuota
              ? `${es ? "Cuota sugerida" : "Suggested amount"}: ${dinero.format(cuota)}`
              : undefined
          }
          accessibilityState={{ disabled: guardando }}
        >
          <View
            style={[
              estilos.iconoPrincipal,
              {
                backgroundColor: tema.oscuro
                  ? "rgba(0,0,0,.18)"
                  : "rgba(255,255,255,.2)",
              },
            ]}
          >
            <Ionicons name="cash" color={tema.sobrePrimario} size={25} />
          </View>
          <View style={estilos.expandir}>
            <Text
              style={[estilos.tituloPrincipal, { color: tema.sobrePrimario }]}
            >
              {es ? "Registrar abono" : "Record payment"}
            </Text>
            <Text
              style={[estilos.detallePrincipal, { color: tema.sobrePrimario }]}
            >
              {cuota
                ? `${es ? "Cuota sugerida" : "Suggested"} ${dinero.format(cuota)}`
                : es
                  ? "Captura monto y método"
                  : "Enter amount and method"}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            color={tema.sobrePrimario}
            size={22}
          />
        </Pressable>
      )}

      <View
        style={[estilos.dosColumnas, diseno.compacto && estilos.unaColumna]}
      >
        <Accion
          icono="cart"
          color={tema.primario}
          fondoIcono={tema.primarioSuave}
          titulo={es ? "Nueva venta" : "New sale"}
          tema={tema}
          deshabilitada={guardando}
          alPulsar={alVender}
        />
        <Accion
          icono="cube"
          color={tema.advertencia}
          fondoIcono={tema.advertenciaSuave}
          titulo={es ? "Entregar pedido" : "Deliver order"}
          contador={pedidos}
          deshabilitada={!pedidos || guardando}
          tema={tema}
          alPulsar={alEntregar}
        />
      </View>

      <Text style={[estilos.etiqueta, { color: tema.textoSecundario }]}>
        {es ? "Si hoy no hubo cobro" : "If no payment was made today"}
      </Text>
      <View
        style={[estilos.dosColumnas, diseno.compacto && estilos.unaColumna]}
      >
        <Resultado
          icono="close-circle-outline"
          color={tema.peligro}
          fondoIcono={tema.peligroSuave}
          texto={es ? "No pagó" : "No payment"}
          tema={tema}
          deshabilitado={guardando}
          alPulsar={alNoPagar}
        />
        <Resultado
          icono="home-outline"
          color={tema.textoSecundario}
          fondoIcono={tema.campoDeshabilitado}
          texto={es ? "No se encontró" : "Absent"}
          tema={tema}
          deshabilitado={guardando}
          alPulsar={alAusente}
        />
      </View>
    </View>
  );
}

function Accion({
  icono,
  color,
  fondoIcono,
  titulo,
  contador,
  deshabilitada,
  tema,
  alPulsar,
}: {
  icono: "cart" | "cube";
  color: string;
  fondoIcono: string;
  titulo: string;
  contador?: number;
  deshabilitada?: boolean;
  tema: Tema;
  alPulsar: () => void;
}) {
  return (
    <Pressable
      disabled={deshabilitada}
      onPress={alPulsar}
      style={({ pressed }) => [
        estilos.accion,
        { borderColor: tema.borde, backgroundColor: tema.panelElevado },
        pressed && { backgroundColor: tema.primarioSuave },
        deshabilitada && estilos.deshabilitada,
      ]}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: Boolean(deshabilitada) }}
    >
      <View style={[estilos.iconoAccion, { backgroundColor: fondoIcono }]}>
        <Ionicons name={icono} color={color} size={23} />
      </View>
      <Text style={[estilos.tituloAccion, { color: tema.texto }]}>
        {titulo}
      </Text>
      {contador !== undefined && (
        <Text
          style={[estilos.contador, { color, backgroundColor: fondoIcono }]}
        >
          {contador}
        </Text>
      )}
    </Pressable>
  );
}

function Resultado({
  icono,
  color,
  fondoIcono,
  texto,
  tema,
  deshabilitado,
  alPulsar,
}: {
  icono: "close-circle-outline" | "home-outline";
  color: string;
  fondoIcono: string;
  texto: string;
  tema: Tema;
  deshabilitado: boolean;
  alPulsar: () => void;
}) {
  return (
    <Pressable
      disabled={deshabilitado}
      style={({ pressed }) => [
        estilos.resultado,
        { borderColor: tema.borde, backgroundColor: tema.panelElevado },
        pressed && { backgroundColor: fondoIcono },
        deshabilitado && estilos.deshabilitada,
      ]}
      onPress={alPulsar}
      accessibilityRole="button"
      accessibilityLabel={texto}
      accessibilityState={{ disabled: deshabilitado }}
    >
      <View style={[estilos.iconoResultado, { backgroundColor: fondoIcono }]}>
        <Ionicons name={icono} color={color} size={21} />
      </View>
      <Text style={[estilos.resultadoTexto, { color: tema.texto }]}>
        {texto}
      </Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  contenedor: { marginTop: espaciado.lg },
  expandir: { flex: 1 },
  principal: {
    minHeight: 76,
    borderRadius: radios.tarjeta,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  pulsado: { opacity: 0.72 },
  iconoPrincipal: {
    width: 48,
    height: 48,
    borderRadius: radios.campo,
    alignItems: "center",
    justifyContent: "center",
  },
  tituloPrincipal: { fontWeight: "900", fontSize: 17, lineHeight: 22 },
  detallePrincipal: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
    opacity: 0.9,
  },
  dosColumnas: { flexDirection: "row", gap: 10, marginTop: 10 },
  unaColumna: { flexDirection: "column" },
  accion: {
    flex: 1,
    minHeight: 86,
    borderWidth: 1,
    borderRadius: radios.tarjeta,
    padding: 12,
    justifyContent: "center",
  },
  iconoAccion: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  deshabilitada: { opacity: 0.42 },
  tituloAccion: {
    fontWeight: "800",
    fontSize: 14,
    lineHeight: 19,
    marginTop: 8,
  },
  contador: {
    position: "absolute",
    right: 10,
    top: 10,
    borderRadius: radios.pastilla,
    minWidth: 24,
    minHeight: 24,
    paddingHorizontal: 6,
    paddingTop: 3,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "900",
  },
  etiqueta: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 18,
  },
  resultado: {
    flex: 1,
    minHeight: tactilMinimo + 6,
    borderWidth: 1,
    borderRadius: radios.campo,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  iconoResultado: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  resultadoTexto: { fontWeight: "800", fontSize: 14, lineHeight: 19 },
});
