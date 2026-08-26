import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { api } from "../../api";
import { guardarCache, leerCache } from "../../almacenLocal";
import { colores, type usarTema } from "../../tema";
import { usarDatosVivosMovil } from "../../usarDatosVivosMovil";
import { dinero } from "../../utilidades/formato";

interface ResumenAgenda {
  cantidad: number;
  cuotas: number;
  total: number;
}

interface ItemAgenda {
  cuotaId: string;
  fecha: string;
  numero: number;
  pendiente: number;
  venta: { id: string; folio: string };
  cliente: {
    id: string;
    nombreCompleto: string;
    numeroTarjeta: string | null;
  };
}

interface AgendaCobranza {
  hoy: ResumenAgenda & { fecha: string; items: ItemAgenda[] };
  semana: ResumenAgenda & {
    inicio: string;
    fin: string;
    dias: Array<ResumenAgenda & { fecha: string }>;
  };
  vencidos: ResumenAgenda & { items: ItemAgenda[] };
  cobrado: {
    hoy: { cantidad: number; total: number };
    semana: { cantidad: number; total: number };
  };
}

export function AgendaCobranzaMovil({
  es,
  tema,
}: {
  es: boolean;
  tema: ReturnType<typeof usarTema>;
}) {
  const [agenda, establecerAgenda] = useState<AgendaCobranza | null>(null);
  const [offline, establecerOffline] = useState(false);
  const cargar = useCallback(async () => {
    try {
      const respuesta = await api<AgendaCobranza>("/abonos/agenda");
      establecerAgenda(respuesta);
      await guardarCache("agenda_cobranza", respuesta);
      establecerOffline(false);
    } catch {
      establecerAgenda(await leerCache<AgendaCobranza>("agenda_cobranza"));
      establecerOffline(true);
    }
  }, []);
  usarDatosVivosMovil(cargar, 30_000);
  if (!agenda) return null;
  const prioritarios = [
    ...agenda.vencidos.items.map((item) => ({ ...item, vencido: true })),
    ...agenda.hoy.items.map((item) => ({ ...item, vencido: false })),
  ].slice(0, 6);

  return (
    <View
      style={[
        estilos.contenedor,
        { backgroundColor: tema.panel, borderColor: tema.borde },
      ]}
    >
      <View style={estilos.encabezado}>
        <View>
          <Text style={[estilos.titulo, { color: tema.texto }]}>
            {es ? "Agenda de cobranza" : "Collection schedule"}
          </Text>
          <Text style={estilos.periodo}>
            {agenda.semana.inicio} · {agenda.semana.fin}
            {offline ? ` · ${es ? "copia guardada" : "saved copy"}` : ""}
          </Text>
        </View>
        <Ionicons name="calendar" size={22} color={colores.azul} />
      </View>

      <View style={estilos.metricas}>
        <Metrica
          etiqueta={es ? "Cobrar hoy" : "Due today"}
          valor={`${agenda.hoy.cantidad}`}
          detalle={`${agenda.hoy.cuotas} ${es ? "abonos" : "payments"} · ${dinero.format(agenda.hoy.total)}`}
          color="#0e6027"
        />
        <Metrica
          etiqueta={es ? "Esta semana" : "This week"}
          valor={`${agenda.semana.cantidad}`}
          detalle={`${agenda.semana.cuotas} ${es ? "abonos" : "payments"} · ${dinero.format(agenda.semana.total)}`}
          color="#0043ce"
        />
        <Metrica
          etiqueta={es ? "Atrasados" : "Overdue"}
          valor={`${agenda.vencidos.cantidad}`}
          detalle={`${agenda.vencidos.cuotas} ${es ? "abonos" : "payments"} · ${dinero.format(agenda.vencidos.total)}`}
          color={agenda.vencidos.cantidad ? "#a2191f" : "#525252"}
        />
      </View>

      <View style={estilos.cobrado}>
        <Ionicons name="checkmark-circle" size={18} color={colores.verde} />
        <Text style={estilos.cobradoTexto}>
          {es ? "Hoy ya registraste" : "Recorded today"}:{" "}
          {agenda.cobrado.hoy.cantidad} {es ? "abonos" : "payments"} ·{" "}
          {dinero.format(agenda.cobrado.hoy.total)}
        </Text>
      </View>

      {prioritarios.length > 0 && (
        <View style={estilos.pendientes}>
          <Text style={[estilos.seccionTitulo, { color: tema.texto }]}>
            {es ? "Cobros prioritarios" : "Priority collections"}
          </Text>
          {prioritarios.map((item) => (
            <View
              key={item.cuotaId}
              style={[estilos.pendiente, { borderColor: tema.borde }]}
            >
              <View style={estilos.pendienteTexto}>
                <Text
                  numberOfLines={1}
                  style={[estilos.cliente, { color: tema.texto }]}
                >
                  {item.cliente.nombreCompleto}
                </Text>
                <Text style={estilos.cuota}>
                  {item.venta.folio} · {es ? "Abono" : "Payment"} {item.numero}{" "}
                  · {item.fecha}
                </Text>
              </View>
              <View style={estilos.importeBloque}>
                <Text
                  style={[
                    estilos.estado,
                    { color: item.vencido ? "#a2191f" : "#0e6027" },
                  ]}
                >
                  {item.vencido
                    ? es
                      ? "Vencido"
                      : "Overdue"
                    : es
                      ? "Hoy"
                      : "Today"}
                </Text>
                <Text style={[estilos.importe, { color: tema.texto }]}>
                  {dinero.format(item.pendiente)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {agenda.semana.dias.length > 0 && (
        <View style={estilos.dias}>
          {agenda.semana.dias.map((dia) => (
            <View key={dia.fecha} style={estilos.dia}>
              <Text style={estilos.diaFecha}>
                {new Date(`${dia.fecha}T12:00:00`).toLocaleDateString("es-MX", {
                  weekday: "short",
                  day: "numeric",
                })}
              </Text>
              <Text style={[estilos.diaTotal, { color: tema.texto }]}>
                {dia.cantidad} · {dinero.format(dia.total)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function Metrica({
  etiqueta,
  valor,
  detalle,
  color,
}: {
  etiqueta: string;
  valor: string;
  detalle: string;
  color: string;
}) {
  return (
    <View style={estilos.metrica}>
      <Text style={estilos.metricaEtiqueta}>{etiqueta}</Text>
      <Text style={[estilos.metricaValor, { color }]}>{valor}</Text>
      <Text style={estilos.metricaDetalle}>{detalle}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { borderWidth: 1, borderRadius: 8, padding: 15, gap: 13 },
  encabezado: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titulo: { fontSize: 17, fontWeight: "900" },
  periodo: { color: colores.gris, fontSize: 10, marginTop: 3 },
  metricas: { flexDirection: "row", gap: 8 },
  metrica: { flex: 1, minWidth: 0 },
  metricaEtiqueta: { color: colores.gris, fontSize: 9, fontWeight: "800" },
  metricaValor: { fontSize: 24, fontWeight: "900", marginTop: 2 },
  metricaDetalle: { color: colores.gris, fontSize: 9, lineHeight: 13 },
  cobrado: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#defbe6",
    padding: 10,
    borderRadius: 7,
  },
  cobradoTexto: { flex: 1, color: "#0e6027", fontSize: 11, fontWeight: "700" },
  pendientes: { gap: 7 },
  seccionTitulo: { fontSize: 12, fontWeight: "900" },
  pendiente: {
    borderTopWidth: 1,
    paddingTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pendienteTexto: { flex: 1, minWidth: 0 },
  cliente: { fontSize: 11, fontWeight: "800" },
  cuota: { color: colores.gris, fontSize: 9, marginTop: 2 },
  importeBloque: { alignItems: "flex-end" },
  estado: { fontSize: 8, fontWeight: "900", textTransform: "uppercase" },
  importe: { fontSize: 11, fontWeight: "900", marginTop: 2 },
  dias: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  dia: {
    borderLeftWidth: 2,
    borderLeftColor: colores.azul,
    paddingLeft: 7,
    minWidth: 80,
  },
  diaFecha: { color: colores.gris, fontSize: 9, textTransform: "capitalize" },
  diaTotal: { fontSize: 10, fontWeight: "800", marginTop: 2 },
});
