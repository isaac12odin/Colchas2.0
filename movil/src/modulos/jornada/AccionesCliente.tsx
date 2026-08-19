import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colores, type usarTema } from "../../tema";
import type { ClienteJornada } from "../../tipos";
import { dinero } from "../../utilidades/formato";
import { cuotaEsperada } from "./dominioJornada";

interface Propiedades {
  cliente: ClienteJornada;
  es: boolean;
  tema: ReturnType<typeof usarTema>;
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
  ...acciones
}: Propiedades) {
  const cuota = cuotaEsperada(cliente);
  return (
    <View style={estilos.contenedor}>
      {Number(cliente.saldo?.saldoActual ?? 0) > 0 && (
        <Pressable style={estilos.principal} onPress={acciones.alCobrar}>
          <View style={estilos.iconoPrincipal}>
            <Ionicons name="cash" color="white" size={24} />
          </View>
          <View style={estilos.expandir}>
            <Text style={estilos.tituloPrincipal}>
              {es ? "Registrar abono" : "Record payment"}
            </Text>
            <Text style={estilos.detallePrincipal}>
              {cuota
                ? `${es ? "Cuota sugerida" : "Suggested"} ${dinero.format(cuota)}`
                : es
                  ? "Captura monto y método"
                  : "Enter amount and method"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" color="white" size={20} />
        </Pressable>
      )}

      <View style={estilos.dosColumnas}>
        <Accion
          icono="cart"
          color={colores.azul}
          titulo={es ? "Nueva venta" : "New sale"}
          tema={tema}
          alPulsar={acciones.alVender}
        />
        <Accion
          icono="cube"
          color="#6929c4"
          titulo={es ? "Entregar" : "Deliver"}
          contador={cliente.pedidos.length}
          deshabilitada={!cliente.pedidos.length}
          tema={tema}
          alPulsar={acciones.alEntregar}
        />
      </View>

      <Text style={estilos.etiqueta}>
        {es ? "Si no hubo cobro" : "If no payment was made"}
      </Text>
      <View style={estilos.dosColumnas}>
        <Resultado
          icono="close-circle-outline"
          color={colores.rojo}
          texto={es ? "No pagó" : "No payment"}
          tema={tema}
          deshabilitado={acciones.guardando}
          alPulsar={acciones.alNoPagar}
        />
        <Resultado
          icono="home-outline"
          color={colores.gris}
          texto={es ? "Ausente" : "Absent"}
          tema={tema}
          deshabilitado={acciones.guardando}
          alPulsar={acciones.alAusente}
        />
      </View>
    </View>
  );
}

function Accion({
  icono,
  color,
  titulo,
  contador,
  deshabilitada,
  tema,
  alPulsar,
}: {
  icono: "cart" | "cube";
  color: string;
  titulo: string;
  contador?: number;
  deshabilitada?: boolean;
  tema: ReturnType<typeof usarTema>;
  alPulsar: () => void;
}) {
  return (
    <Pressable
      disabled={deshabilitada}
      onPress={alPulsar}
      style={[
        estilos.accion,
        { borderColor: tema.borde },
        deshabilitada && estilos.deshabilitada,
      ]}
    >
      <Ionicons name={icono} color={color} size={23} />
      <Text style={[estilos.tituloAccion, { color: tema.texto }]}>
        {titulo}
      </Text>
      {contador !== undefined && (
        <Text style={estilos.contador}>{contador}</Text>
      )}
    </Pressable>
  );
}

function Resultado({
  icono,
  color,
  texto,
  tema,
  deshabilitado,
  alPulsar,
}: {
  icono: "close-circle-outline" | "home-outline";
  color: string;
  texto: string;
  tema: ReturnType<typeof usarTema>;
  deshabilitado: boolean;
  alPulsar: () => void;
}) {
  return (
    <Pressable
      disabled={deshabilitado}
      style={[estilos.resultado, { borderColor: tema.borde }]}
      onPress={alPulsar}
    >
      <Ionicons name={icono} color={color} size={20} />
      <Text style={[estilos.resultadoTexto, { color: tema.texto }]}>
        {texto}
      </Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  contenedor: { marginTop: 20 },
  expandir: { flex: 1 },
  principal: {
    backgroundColor: colores.azul,
    minHeight: 72,
    borderRadius: 14,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  iconoPrincipal: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  tituloPrincipal: { color: "white", fontWeight: "900", fontSize: 16 },
  detallePrincipal: { color: "#d0e2ff", fontSize: 11, marginTop: 3 },
  dosColumnas: { flexDirection: "row", gap: 9, marginTop: 10 },
  accion: {
    flex: 1,
    minHeight: 78,
    borderWidth: 1,
    borderRadius: 13,
    padding: 12,
    justifyContent: "center",
  },
  deshabilitada: { opacity: 0.42 },
  tituloAccion: { fontWeight: "800", fontSize: 13, marginTop: 8 },
  contador: {
    position: "absolute",
    right: 10,
    top: 10,
    color: "#6929c4",
    backgroundColor: "#f6f2ff",
    borderRadius: 9,
    minWidth: 18,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "800",
  },
  etiqueta: {
    color: colores.gris,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 17,
  },
  resultado: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  resultadoTexto: { fontWeight: "700", fontSize: 12 },
});
