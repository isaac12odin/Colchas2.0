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
  alAbrir: () => void;
}

export function TarjetaClienteJornada({
  cliente,
  es,
  tema,
  alAbrir,
}: Propiedades) {
  const esperada = cuotaEsperada(cliente);
  const nivel = cliente.evaluacionesRiesgo?.[0]?.nivel;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={alAbrir}
      style={[
        estilos.tarjeta,
        { backgroundColor: tema.panel, borderColor: tema.borde },
        cliente.visita && estilos.visitada,
      ]}
    >
      <View style={[estilos.orden, cliente.visita && estilos.ordenVisitado]}>
        {cliente.visita ? (
          <Ionicons name="checkmark" color={colores.verde} size={18} />
        ) : (
          <Text style={estilos.ordenTexto}>{cliente.orden}</Text>
        )}
      </View>
      <View style={estilos.datos}>
        <Text style={[estilos.nombre, { color: tema.texto }]}>
          {cliente.nombreCompleto}
        </Text>
        <Text style={estilos.direccion} numberOfLines={1}>
          {cliente.fueraDeRuta
            ? `${es ? "Fuera de ruta" : "Outside route"} · ${cliente.localidad?.nombre ?? ""}`
            : cliente.direccion}
        </Text>
        <Insignias
          cliente={cliente}
          esperada={esperada}
          nivel={nivel}
          es={es}
        />
      </View>
      <View style={estilos.saldoContenedor}>
        <Text style={[estilos.saldo, { color: tema.texto }]}>
          {dinero.format(Number(cliente.saldo?.saldoActual ?? 0))}
        </Text>
        <Text style={estilos.saldoEtiqueta}>{es ? "saldo" : "balance"}</Text>
        <Ionicons name="chevron-forward" color={colores.gris} size={17} />
      </View>
    </Pressable>
  );
}

function Insignias({
  cliente,
  esperada,
  nivel,
  es,
}: {
  cliente: ClienteJornada;
  esperada: number;
  nivel?: string;
  es: boolean;
}) {
  return (
    <View style={estilos.insignias}>
      {esperada > 0 && (
        <Text style={estilos.cuota}>
          {cliente.estadoCuenta?.vencido
            ? `${es ? "Vencido" : "Overdue"} ${dinero.format(cliente.estadoCuenta.vencido)}`
            : `${es ? "Hoy" : "Today"} ${dinero.format(esperada)}`}
        </Text>
      )}
      {esperada === 0 && cliente.estadoCuenta?.proximoVencimiento && (
        <Text style={estilos.proximo}>
          {es ? "Próximo" : "Next"}{" "}
          {cliente.estadoCuenta.proximoVencimiento.slice(5)} ·{" "}
          {dinero.format(cliente.estadoCuenta.abonoPeriodico)}
        </Text>
      )}
      {cliente.pedidos.length > 0 && (
        <Text style={estilos.entrega}>
          {cliente.pedidos.length} {es ? "por entregar" : "to deliver"}
        </Text>
      )}
      {nivel && nivel !== "BAJO" && (
        <Text style={estilos.riesgo}>
          {es ? "Riesgo" : "Risk"} {nivel}
        </Text>
      )}
      {cliente.fueraDeRuta && (
        <Text style={estilos.extraordinaria}>
          {es ? "EXTRAORDINARIA" : "EXTRA"}
        </Text>
      )}
    </View>
  );
}

const insignia = {
  borderRadius: 6,
  paddingHorizontal: 6,
  paddingVertical: 3,
  fontSize: 9,
  fontWeight: "800" as const,
};

const estilos = StyleSheet.create({
  tarjeta: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 92,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  visitada: { borderLeftWidth: 4, borderLeftColor: colores.verde },
  orden: {
    width: 37,
    height: 37,
    borderRadius: 19,
    backgroundColor: colores.azulClaro,
    alignItems: "center",
    justifyContent: "center",
  },
  ordenVisitado: { backgroundColor: "#defbe6" },
  ordenTexto: { color: colores.azul, fontWeight: "800" },
  datos: { flex: 1 },
  nombre: { fontWeight: "800", fontSize: 15 },
  direccion: { color: colores.gris, fontSize: 11, marginTop: 3 },
  insignias: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 7 },
  cuota: { color: "#0e6027", backgroundColor: "#defbe6", ...insignia },
  proximo: { color: "#0043ce", backgroundColor: "#edf5ff", ...insignia },
  entrega: { color: "#6929c4", backgroundColor: "#f6f2ff", ...insignia },
  riesgo: { color: "#8a3b12", backgroundColor: "#fff2e8", ...insignia },
  extraordinaria: { color: "#0043ce", backgroundColor: "#edf5ff", ...insignia },
  saldoContenedor: { alignItems: "flex-end", gap: 2 },
  saldo: { fontWeight: "800", fontSize: 13 },
  saldoEtiqueta: { color: colores.gris, fontSize: 9, marginBottom: 6 },
});
