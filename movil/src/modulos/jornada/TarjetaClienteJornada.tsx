import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { radios, type usarTema } from "../../tema";
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
  const saldo = Number(cliente.saldo?.saldoActual ?? 0);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${cliente.nombreCompleto}. ${cliente.telefono}. ${es ? "Saldo" : "Balance"} ${dinero.format(saldo)}`}
      onPress={alAbrir}
      style={({ pressed }) => [
        estilos.tarjeta,
        {
          backgroundColor: tema.panel,
          borderColor: tema.borde,
          borderLeftColor: cliente.visita ? tema.exito : tema.borde,
          borderLeftWidth: cliente.visita ? 4 : 1,
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <View
        style={[
          estilos.orden,
          {
            backgroundColor: cliente.visita
              ? tema.exitoSuave
              : tema.primarioSuave,
          },
        ]}
      >
        {cliente.visita ? (
          <Ionicons name="checkmark" color={tema.exito} size={19} />
        ) : (
          <Text style={[estilos.ordenTexto, { color: tema.primario }]}>
            {cliente.orden}
          </Text>
        )}
      </View>
      <View style={estilos.datos}>
        <Text style={[estilos.nombre, { color: tema.texto }]} numberOfLines={2}>
          {cliente.nombreCompleto}
        </Text>
        <Text
          style={[estilos.contacto, { color: tema.textoSecundario }]}
          numberOfLines={2}
        >
          {cliente.telefono}
          {cliente.numeroTarjeta
            ? ` · ${es ? "Tarjeta" : "Card"} ${cliente.numeroTarjeta}`
            : ""}
        </Text>
        <Text
          style={[estilos.direccion, { color: tema.textoSecundario }]}
          numberOfLines={2}
        >
          {cliente.fueraDeRuta
            ? `${es ? "Fuera de ruta" : "Outside route"} · ${cliente.localidad?.nombre ?? ""} · ${cliente.direccion}`
            : `${cliente.localidad?.nombre ?? ""} · ${cliente.direccion}`}
        </Text>
        <Insignias
          cliente={cliente}
          esperada={esperada}
          nivel={nivel}
          es={es}
          tema={tema}
        />
      </View>
      <View style={estilos.saldoContenedor}>
        <Text style={[estilos.saldo, { color: tema.texto }]} numberOfLines={1}>
          {dinero.format(saldo)}
        </Text>
        <Text style={[estilos.saldoEtiqueta, { color: tema.textoTenue }]}>
          {es ? "saldo" : "balance"}
        </Text>
        <Ionicons name="chevron-forward" color={tema.textoTenue} size={19} />
      </View>
    </Pressable>
  );
}

function Insignias({
  cliente,
  esperada,
  nivel,
  es,
  tema,
}: {
  cliente: ClienteJornada;
  esperada: number;
  nivel?: string;
  es: boolean;
  tema: ReturnType<typeof usarTema>;
}) {
  return (
    <View style={estilos.insignias}>
      {esperada > 0 ? (
        <Insignia
          texto={
            cliente.estadoCuenta?.vencido
              ? `${es ? "Vencido" : "Overdue"} ${dinero.format(cliente.estadoCuenta.vencido)}`
              : `${es ? "Hoy" : "Today"} ${dinero.format(esperada)}`
          }
          color={cliente.estadoCuenta?.vencido ? tema.peligro : tema.exito}
          fondo={
            cliente.estadoCuenta?.vencido ? tema.peligroSuave : tema.exitoSuave
          }
        />
      ) : null}
      {esperada === 0 && cliente.estadoCuenta?.proximoVencimiento ? (
        <Insignia
          texto={`${es ? "Próximo" : "Next"} ${cliente.estadoCuenta.proximoVencimiento.slice(5)} · ${dinero.format(cliente.estadoCuenta.abonoPeriodico)}`}
          color={tema.primario}
          fondo={tema.primarioSuave}
        />
      ) : null}
      {cliente.pedidos.length > 0 ? (
        <Insignia
          texto={`${cliente.pedidos.length} ${es ? "por entregar" : "to deliver"}`}
          color={tema.primario}
          fondo={tema.primarioSuave}
        />
      ) : null}
      {nivel && nivel !== "BAJO" ? (
        <Insignia
          texto={`${es ? "Riesgo" : "Risk"} ${nivel}`}
          color={tema.advertencia}
          fondo={tema.advertenciaSuave}
        />
      ) : null}
      {cliente.fueraDeRuta ? (
        <Insignia
          texto={es ? "EXTRAORDINARIA" : "EXTRA"}
          color={tema.primario}
          fondo={tema.primarioSuave}
        />
      ) : null}
    </View>
  );
}

function Insignia({
  texto,
  color,
  fondo,
}: {
  texto: string;
  color: string;
  fondo: string;
}) {
  return (
    <Text style={[estilos.insignia, { color, backgroundColor: fondo }]}>
      {texto}
    </Text>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    borderWidth: 1,
    borderRadius: radios.tarjeta,
    minHeight: 120,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  orden: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  ordenTexto: { fontWeight: "900", fontSize: 14 },
  datos: { flex: 1, minWidth: 0 },
  nombre: { fontWeight: "900", fontSize: 15, lineHeight: 20 },
  contacto: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  direccion: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  insignias: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 8 },
  insignia: {
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
  },
  saldoContenedor: { alignItems: "flex-end", gap: 2, maxWidth: 96 },
  saldo: { fontWeight: "900", fontSize: 13, lineHeight: 18 },
  saldoEtiqueta: { fontSize: 11, lineHeight: 15, marginBottom: 4 },
});
