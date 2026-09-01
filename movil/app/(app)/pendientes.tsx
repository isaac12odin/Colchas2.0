import { useCallback, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { obtenerConectividad, sincronizarPendientes } from "@/src/api";
import {
  leerHistorialOperaciones,
  obtenerEstadoCola,
  verificarIntegridadOperaciones,
  type OperacionGuardada,
} from "@/src/almacenLocal";
import {
  BotonMovil,
  EstadoMovil,
  TarjetaMovil,
  usarDisenoResponsivo,
} from "@/src/componentes/ui";
import { usarSesion } from "@/src/sesion";
import { radios, usarTema } from "@/src/tema";
import { usarDatosVivosMovil } from "@/src/usarDatosVivosMovil";

const iconos = {
  VISITA: "location" as const,
  ABONO: "cash" as const,
  VENTA: "cart" as const,
  ENTREGA: "cube" as const,
};
const etiquetas: Record<string, string> = {
  VISITA: "Visita",
  ABONO: "Abono",
  VENTA: "Venta",
  ENTREGA: "Entrega",
};

export default function Pendientes() {
  const router = useRouter();
  const tema = usarTema();
  const diseno = usarDisenoResponsivo();
  const insets = useSafeAreaInsets();
  const { idioma } = usarSesion();
  const es = idioma === "es";
  const [operaciones, establecerOperaciones] = useState<OperacionGuardada[]>(
    [],
  );
  const [estado, establecerEstado] = useState({
    pendientes: 0,
    errores: 0,
    rechazadas: 0,
    sincronizadas: 0,
    enviando: 0,
    porEnviar: 0,
    ultimaSincronizacion: null as string | null,
  });
  const [integridad, establecerIntegridad] = useState(true);
  const [conectada, establecerConectada] = useState(false);
  const [enviando, establecerEnviando] = useState(false);
  const ancho = diseno.anchoContenido - diseno.margen * 2;

  const cargar = useCallback(async () => {
    const [estadoLocal, historial, revision, red] = await Promise.all([
      obtenerEstadoCola(),
      leerHistorialOperaciones(80),
      verificarIntegridadOperaciones(),
      obtenerConectividad().catch(() => ({ conectada: false })),
    ]);
    establecerEstado(estadoLocal);
    establecerOperaciones(historial);
    establecerIntegridad(revision.valida);
    establecerConectada(red.conectada);
  }, []);
  usarDatosVivosMovil(cargar, 15_000);

  async function sincronizar() {
    if (!conectada || enviando || !integridad) return;
    establecerEnviando(true);
    try {
      const resultado = await sincronizarPendientes();
      Alert.alert(
        es ? "Sincronización terminada" : "Synchronization complete",
        es
          ? `${resultado.exitosas} confirmadas · ${resultado.fallidas} requieren atención`
          : `${resultado.exitosas} confirmed · ${resultado.fallidas} require attention`,
      );
    } catch (error) {
      Alert.alert(
        es ? "No se pudo sincronizar" : "Unable to synchronize",
        error instanceof Error
          ? error.message
          : es
            ? "Tus datos siguen guardados."
            : "Your data remains saved.",
      );
    } finally {
      await cargar();
      establecerEnviando(false);
    }
  }

  return (
    <View style={[estilos.pagina, { backgroundColor: tema.fondo }]}>
      <FlatList
        data={operaciones}
        keyExtractor={(operacion) => operacion.id}
        contentContainerStyle={[
          estilos.lista,
          {
            paddingHorizontal: diseno.margen,
            paddingBottom: Math.max(insets.bottom, 16) + 24,
          },
        ]}
        ListHeaderComponent={
          <View style={[estilos.ancho, { width: ancho }]}>
            <EstadoMovil
              tipo={integridad ? "exito" : "error"}
              texto={
                integridad
                  ? es
                    ? "Bitácora local íntegra: está cifrada y cualquier alteración queda detectable."
                    : "Local ledger verified: it is encrypted and any alteration is detectable."
                  : es
                    ? "La revisión de integridad falló. No sincronices; solicita revisión administrativa."
                    : "The integrity check failed. Do not sync; request administrative review."
              }
            />

            <View style={estilos.red}>
              <View
                style={[
                  estilos.redIcono,
                  {
                    backgroundColor: conectada
                      ? tema.exitoSuave
                      : tema.advertenciaSuave,
                  },
                ]}
              >
                <Ionicons
                  name={conectada ? "cloud-done" : "cloud-offline"}
                  color={conectada ? tema.exito : tema.advertencia}
                  size={22}
                />
              </View>
              <View style={estilos.expandir}>
                <Text style={[estilos.redTitulo, { color: tema.texto }]}>
                  {conectada
                    ? es
                      ? "Servidor disponible"
                      : "Server available"
                    : es
                      ? "Trabajando sin conexión"
                      : "Working offline"}
                </Text>
                <Text
                  style={[estilos.redDetalle, { color: tema.textoSecundario }]}
                >
                  {estado.ultimaSincronizacion
                    ? `${es ? "Última confirmación" : "Last confirmation"}: ${new Date(
                        estado.ultimaSincronizacion,
                      ).toLocaleString(es ? "es-MX" : "en-US")}`
                    : es
                      ? "Este equipo todavía no ha sincronizado."
                      : "This device has not synchronized yet."}
                </Text>
              </View>
            </View>

            <View>
              <Text style={[estilos.titulo, { color: tema.texto }]}>
                {estado.porEnviar
                  ? `${estado.porEnviar} ${es ? "movimientos por confirmar" : "movements to confirm"}`
                  : es
                    ? "Todo está confirmado"
                    : "Everything is confirmed"}
              </Text>
              <Text style={[estilos.detalle, { color: tema.textoSecundario }]}>
                {es
                  ? "Puedes cerrar la aplicación o perder señal: los movimientos permanecen protegidos en este equipo."
                  : "You can close the app or lose signal: movements remain protected on this device."}
              </Text>
            </View>

            <View style={estilos.resumen}>
              {[
                {
                  valor: estado.pendientes,
                  etiqueta: es ? "Pendientes" : "Pending",
                  tipo: "normal",
                },
                {
                  valor: estado.errores,
                  etiqueta: es ? "Atención" : "Attention",
                  tipo: "error",
                },
                {
                  valor: estado.sincronizadas,
                  etiqueta: es ? "Confirmadas" : "Confirmed",
                  tipo: "exito",
                },
                {
                  valor: estado.rechazadas,
                  etiqueta: es ? "Rechazadas" : "Rejected",
                  tipo: "error",
                },
              ].map((dato) => (
                <TarjetaMovil key={dato.etiqueta} estilo={estilos.dato}>
                  <Text
                    style={[
                      estilos.numero,
                      {
                        color:
                          dato.tipo === "error"
                            ? tema.peligro
                            : dato.tipo === "exito"
                              ? tema.exito
                              : tema.texto,
                      },
                    ]}
                  >
                    {dato.valor}
                  </Text>
                  <Text
                    style={[
                      estilos.datoEtiqueta,
                      { color: tema.textoSecundario },
                    ]}
                  >
                    {dato.etiqueta}
                  </Text>
                </TarjetaMovil>
              ))}
            </View>

            <BotonMovil
              texto={
                enviando
                  ? es
                    ? "Confirmando con servidor…"
                    : "Confirming with server…"
                  : !conectada && estado.porEnviar > 0
                    ? es
                      ? "Esperando conexión"
                      : "Waiting for connection"
                    : es
                      ? "Sincronizar ahora"
                      : "Synchronize now"
              }
              icono={conectada ? "cloud-upload" : "cloud-offline"}
              cargando={enviando}
              deshabilitado={!estado.porEnviar || !conectada || !integridad}
              alPulsar={() => void sincronizar()}
            />

            <Text style={[estilos.historialTitulo, { color: tema.texto }]}>
              {es ? "Bitácora de este dispositivo" : "This device's ledger"}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={[estilos.vacio, { width: ancho }]}>
            <Ionicons
              name="document-text-outline"
              size={34}
              color={tema.textoTenue}
            />
            <Text style={[estilos.vacioTexto, { color: tema.textoSecundario }]}>
              {es
                ? "Aún no hay movimientos en este equipo."
                : "There are no movements on this device yet."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[estilos.ancho, { width: ancho }]}>
            <Operacion
              operacion={item}
              es={es}
              tema={tema}
              alCorregir={() =>
                router.push(
                  item.tipo === "VENTA"
                    ? "/venta"
                    : item.tipo === "ENTREGA"
                      ? "/pedidos"
                      : "/rutas",
                )
              }
            />
          </View>
        )}
      />
    </View>
  );
}

function Operacion({
  operacion,
  es,
  tema,
  alCorregir,
}: {
  operacion: OperacionGuardada;
  es: boolean;
  tema: ReturnType<typeof usarTema>;
  alCorregir: () => void;
}) {
  const confirmada = operacion.estado === "SINCRONIZADA";
  const conError =
    operacion.estado === "ERROR" || operacion.estado === "RECHAZADA";
  const color = confirmada
    ? tema.exito
    : conError
      ? tema.peligro
      : tema.advertencia;
  const fondo = confirmada
    ? tema.exitoSuave
    : conError
      ? tema.peligroSuave
      : tema.advertenciaSuave;
  return (
    <TarjetaMovil estilo={estilos.operacion}>
      <View
        style={[
          estilos.operacionIcono,
          { backgroundColor: tema.primarioSuave },
        ]}
      >
        <Ionicons
          name={iconos[operacion.tipo]}
          color={tema.primario}
          size={21}
        />
      </View>
      <View style={estilos.expandir}>
        <Text style={[estilos.operacionTipo, { color: tema.texto }]}>
          {es ? etiquetas[operacion.tipo] : operacion.tipo} · #
          {operacion.secuencia}
        </Text>
        <Text style={[estilos.operacionFecha, { color: tema.textoSecundario }]}>
          {new Date(operacion.creadoEn).toLocaleString(es ? "es-MX" : "en-US")}{" "}
          · {operacion.hashIntegridad.slice(0, 10).toUpperCase()}
        </Text>
        {operacion.ultimoError ? (
          <View
            style={[estilos.errorCaja, { backgroundColor: tema.peligroSuave }]}
          >
            <Text style={[estilos.error, { color: tema.peligro }]}>
              {operacion.codigoError ? `${operacion.codigoError}: ` : ""}
              {operacion.ultimoError}
            </Text>
          </View>
        ) : null}
        {operacion.estado === "RECHAZADA" ? (
          <BotonMovil
            texto={
              es
                ? `Corregir con nueva captura · ${operacion.id.slice(-8).toUpperCase()}`
                : `Correct with a new entry · ${operacion.id.slice(-8).toUpperCase()}`
            }
            icono="create-outline"
            variante="secundario"
            alPulsar={alCorregir}
            estilo={estilos.corregir}
          />
        ) : null}
      </View>
      <View style={[estilos.estado, { backgroundColor: fondo }]}>
        <Text style={[estilos.estadoTexto, { color }]}>
          {confirmada
            ? es
              ? "Confirmada"
              : "Confirmed"
            : operacion.estado.toLocaleLowerCase()}
        </Text>
      </View>
    </TarjetaMovil>
  );
}

const estilos = StyleSheet.create({
  pagina: { flex: 1 },
  lista: { gap: 10, alignItems: "center", paddingTop: 16 },
  ancho: { alignSelf: "center", gap: 14 },
  red: { flexDirection: "row", alignItems: "center", gap: 11 },
  redIcono: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  redTitulo: { fontSize: 14, lineHeight: 19, fontWeight: "900" },
  redDetalle: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  titulo: { fontSize: 25, lineHeight: 31, fontWeight: "900" },
  detalle: { fontSize: 13, lineHeight: 20, marginTop: 5 },
  resumen: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  dato: { flexGrow: 1, flexBasis: 125, alignItems: "center", padding: 12 },
  numero: { fontSize: 22, lineHeight: 28, fontWeight: "900" },
  datoEtiqueta: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
    textAlign: "center",
  },
  historialTitulo: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
    marginTop: 6,
  },
  operacion: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
  },
  operacionIcono: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  operacionTipo: { fontWeight: "900", fontSize: 14, lineHeight: 19 },
  operacionFecha: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  errorCaja: { borderRadius: radios.campo, padding: 9, marginTop: 8 },
  error: { fontSize: 12, lineHeight: 18, fontWeight: "700" },
  corregir: { marginTop: 9 },
  estado: {
    borderRadius: radios.pastilla,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  estadoTexto: {
    fontWeight: "900",
    fontSize: 11,
    lineHeight: 15,
    textTransform: "capitalize",
  },
  vacio: { alignItems: "center", gap: 9, paddingVertical: 36 },
  vacioTexto: { textAlign: "center", fontSize: 13, lineHeight: 19 },
  expandir: { flex: 1, minWidth: 0 },
});
