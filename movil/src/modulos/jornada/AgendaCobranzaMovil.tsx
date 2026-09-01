import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { api, esFalloRealRed } from "../../api";
import { guardarCache, leerCache } from "../../almacenLocal";
import { EstadoMovil, usarDisenoResponsivo } from "../../componentes/ui";
import { espaciado, radios, type usarTema } from "../../tema";
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

type Tema = ReturnType<typeof usarTema>;

export function AgendaCobranzaMovil({ es, tema }: { es: boolean; tema: Tema }) {
  const diseno = usarDisenoResponsivo();
  const [agenda, establecerAgenda] = useState<AgendaCobranza | null>(null);
  const [offline, establecerOffline] = useState(false);
  const [errorCarga, establecerErrorCarga] = useState("");
  const cargar = useCallback(async () => {
    try {
      const respuesta = await api<AgendaCobranza>("/abonos/agenda");
      establecerAgenda(respuesta);
      await guardarCache("agenda_cobranza", respuesta);
      establecerOffline(false);
      establecerErrorCarga("");
    } catch (error) {
      if (esFalloRealRed(error)) {
        establecerAgenda(await leerCache<AgendaCobranza>("agenda_cobranza"));
        establecerOffline(true);
        establecerErrorCarga("");
      } else {
        establecerAgenda(null);
        establecerOffline(false);
        establecerErrorCarga(
          error instanceof Error
            ? error.message
            : es
              ? "El servidor rechazó la agenda."
              : "The server rejected the schedule request.",
        );
      }
    }
  }, [es]);
  usarDatosVivosMovil(cargar, 30_000);

  if (!agenda)
    return errorCarga ? <EstadoMovil tipo="error" texto={errorCarga} /> : null;

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
        <View style={estilos.encabezadoTexto}>
          <Text style={[estilos.titulo, { color: tema.texto }]}>
            {es ? "Agenda de cobranza" : "Collection schedule"}
          </Text>
          <Text style={[estilos.periodo, { color: tema.textoSecundario }]}>
            {agenda.semana.inicio} · {agenda.semana.fin}
            {offline ? ` · ${es ? "copia guardada" : "saved copy"}` : ""}
          </Text>
        </View>
        <View
          style={[
            estilos.iconoCalendario,
            { backgroundColor: tema.primarioSuave },
          ]}
        >
          <Ionicons name="calendar" size={22} color={tema.primario} />
        </View>
      </View>

      <View style={estilos.metricas}>
        <Metrica
          etiqueta={es ? "Cobrar hoy" : "Due today"}
          valor={`${agenda.hoy.cantidad}`}
          detalle={`${agenda.hoy.cuotas} ${es ? "abonos" : "payments"} · ${dinero.format(agenda.hoy.total)}`}
          color={tema.exito}
          fondo={tema.exitoSuave}
          tema={tema}
          amplia={diseno.compacto}
        />
        <Metrica
          etiqueta={es ? "Esta semana" : "This week"}
          valor={`${agenda.semana.cantidad}`}
          detalle={`${agenda.semana.cuotas} ${es ? "abonos" : "payments"} · ${dinero.format(agenda.semana.total)}`}
          color={tema.primario}
          fondo={tema.primarioSuave}
          tema={tema}
          amplia={diseno.compacto}
        />
        <Metrica
          etiqueta={es ? "Atrasados" : "Overdue"}
          valor={`${agenda.vencidos.cantidad}`}
          detalle={`${agenda.vencidos.cuotas} ${es ? "abonos" : "payments"} · ${dinero.format(agenda.vencidos.total)}`}
          color={agenda.vencidos.cantidad ? tema.peligro : tema.textoSecundario}
          fondo={
            agenda.vencidos.cantidad
              ? tema.peligroSuave
              : tema.campoDeshabilitado
          }
          tema={tema}
          amplia={diseno.compacto}
        />
      </View>

      <View style={[estilos.cobrado, { backgroundColor: tema.exitoSuave }]}>
        <Ionicons name="checkmark-circle" size={20} color={tema.exito} />
        <Text style={[estilos.cobradoTexto, { color: tema.exito }]}>
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
              style={[
                estilos.pendiente,
                { borderColor: tema.borde, backgroundColor: tema.campo },
              ]}
            >
              <View style={estilos.pendienteTexto}>
                <Text
                  numberOfLines={1}
                  style={[estilos.cliente, { color: tema.texto }]}
                >
                  {item.cliente.nombreCompleto}
                </Text>
                <Text style={[estilos.cuota, { color: tema.textoSecundario }]}>
                  {item.venta.folio} · {es ? "Abono" : "Payment"} {item.numero}{" "}
                  · {item.fecha}
                </Text>
              </View>
              <View style={estilos.importeBloque}>
                <Text
                  style={[
                    estilos.estado,
                    {
                      color: item.vencido ? tema.peligro : tema.exito,
                      backgroundColor: item.vencido
                        ? tema.peligroSuave
                        : tema.exitoSuave,
                    },
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
            <View
              key={dia.fecha}
              style={[
                estilos.dia,
                { backgroundColor: tema.campo, borderColor: tema.borde },
              ]}
            >
              <Text style={[estilos.diaFecha, { color: tema.textoSecundario }]}>
                {new Date(`${dia.fecha}T12:00:00`).toLocaleDateString(
                  es ? "es-MX" : "en-US",
                  { weekday: "short", day: "numeric" },
                )}
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
  fondo,
  tema,
  amplia,
}: {
  etiqueta: string;
  valor: string;
  detalle: string;
  color: string;
  fondo: string;
  tema: Tema;
  amplia: boolean;
}) {
  return (
    <View
      style={[
        estilos.metrica,
        amplia && estilos.metricaAmplia,
        { backgroundColor: fondo },
      ]}
    >
      <Text style={[estilos.metricaEtiqueta, { color: tema.textoSecundario }]}>
        {etiqueta}
      </Text>
      <Text style={[estilos.metricaValor, { color }]}>{valor}</Text>
      <Text style={[estilos.metricaDetalle, { color: tema.textoSecundario }]}>
        {detalle}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    borderWidth: 1,
    borderRadius: radios.tarjeta,
    padding: espaciado.md,
    gap: espaciado.md,
  },
  encabezado: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: espaciado.sm,
  },
  encabezadoTexto: { flex: 1, minWidth: 0 },
  iconoCalendario: {
    width: 48,
    height: 48,
    borderRadius: radios.campo,
    alignItems: "center",
    justifyContent: "center",
  },
  titulo: { fontSize: 18, fontWeight: "900" },
  periodo: { fontSize: 13, lineHeight: 18, marginTop: 3 },
  metricas: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  metrica: {
    flexGrow: 1,
    flexBasis: "46%",
    minWidth: 118,
    borderRadius: radios.campo,
    padding: 11,
  },
  metricaAmplia: { flexBasis: "100%" },
  metricaEtiqueta: { fontSize: 12, lineHeight: 16, fontWeight: "800" },
  metricaValor: {
    fontSize: 26,
    lineHeight: 31,
    fontWeight: "900",
    marginTop: 1,
  },
  metricaDetalle: { fontSize: 12, lineHeight: 17 },
  cobrado: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    padding: 11,
    borderRadius: radios.campo,
  },
  cobradoTexto: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: "700" },
  pendientes: { gap: 8 },
  seccionTitulo: { fontSize: 14, fontWeight: "900" },
  pendiente: {
    borderWidth: 1,
    borderRadius: radios.campo,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pendienteTexto: { flex: 1, minWidth: 0 },
  cliente: { fontSize: 14, lineHeight: 19, fontWeight: "800" },
  cuota: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  importeBloque: { alignItems: "flex-end" },
  estado: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radios.pastilla,
  },
  importe: { fontSize: 14, fontWeight: "900", marginTop: 4 },
  dias: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  dia: {
    borderWidth: 1,
    borderRadius: radios.campo,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 112,
    flexGrow: 1,
  },
  diaFecha: { fontSize: 12, lineHeight: 17, textTransform: "capitalize" },
  diaTotal: { fontSize: 13, lineHeight: 18, fontWeight: "800", marginTop: 2 },
});
