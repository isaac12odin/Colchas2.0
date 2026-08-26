import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  leerHistorialOperaciones,
  obtenerEstadoCola,
  verificarIntegridadOperaciones,
  type OperacionGuardada,
} from "@/src/almacenLocal";
import { obtenerConectividad, sincronizarPendientes } from "@/src/api";
import { colores, usarTema } from "@/src/tema";
import { usarSesion } from "@/src/sesion";
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
    establecerEnviando(true);
    try {
      const resultado = await sincronizarPendientes();
      Alert.alert(
        es ? "Sincronización terminada" : "Synchronization complete",
        es
          ? `${resultado.exitosas} confirmadas · ${resultado.fallidas} requieren atención`
          : `${resultado.exitosas} confirmed · ${resultado.fallidas} require attention`,
      );
      await cargar();
    } catch (error) {
      Alert.alert(
        es ? "No se pudo sincronizar" : "Unable to synchronize",
        error instanceof Error
          ? error.message
          : es
            ? "Tus datos siguen guardados."
            : "Your data remains saved.",
      );
      await cargar();
    } finally {
      establecerEnviando(false);
    }
  }

  return (
    <View style={[estilos.pagina, { backgroundColor: tema.fondo }]}>
      <FlatList
        data={operaciones}
        keyExtractor={(operacion) => operacion.id}
        contentContainerStyle={estilos.lista}
        ListHeaderComponent={
          <>
            <View
              style={[
                estilos.integridad,
                { backgroundColor: integridad ? "#defbe6" : "#fff1f1" },
              ]}
            >
              <Ionicons
                name={integridad ? "shield-checkmark" : "warning"}
                color={integridad ? colores.verde : colores.rojo}
                size={22}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    estilos.integridadTitulo,
                    { color: integridad ? "#0e6027" : colores.rojo },
                  ]}
                >
                  {integridad
                    ? es
                      ? "Bitácora local íntegra"
                      : "Local ledger integrity verified"
                    : es
                      ? "Revisión de integridad fallida"
                      : "Integrity check failed"}
                </Text>
                <Text style={estilos.integridadDetalle}>
                  {es
                    ? "Cifrada y encadenada: una alteración queda detectable."
                    : "Encrypted and chained: any alteration is detectable."}
                </Text>
              </View>
            </View>
            <View style={estilos.red}>
              <View
                style={[
                  estilos.punto,
                  { backgroundColor: conectada ? colores.verde : "#f1c21b" },
                ]}
              />
              <Text style={[estilos.redTexto, { color: tema.texto }]}>
                {conectada
                  ? es
                    ? "Con conexión"
                    : "Online"
                  : es
                    ? "Sin conexión"
                    : "Offline"}
              </Text>
              {estado.ultimaSincronizacion && (
                <Text style={estilos.ultima}>
                  {es ? "Última" : "Last"}{" "}
                  {new Date(estado.ultimaSincronizacion).toLocaleString(
                    es ? "es-MX" : "en-US",
                  )}
                </Text>
              )}
            </View>
            <Text style={[estilos.titulo, { color: tema.texto }]}>
              {estado.porEnviar
                ? `${estado.porEnviar} ${es ? "por confirmar" : "to confirm"}`
                : es
                  ? "Todo está confirmado"
                  : "Everything is confirmed"}
            </Text>
            <Text style={estilos.detalle}>
              {es
                ? "Puedes cerrar la aplicación o perder señal: la información permanece en este equipo."
                : "You can close the app or lose signal: information remains on this device."}
            </Text>
            <View
              style={[
                estilos.resumen,
                { backgroundColor: tema.panel, borderColor: tema.borde },
              ]}
            >
              {[
                {
                  valor: estado.pendientes,
                  etiqueta: es ? "Pendientes" : "Pending",
                },
                {
                  valor: estado.errores,
                  etiqueta: es ? "Atención" : "Attention",
                },
                {
                  valor: estado.sincronizadas,
                  etiqueta: es ? "Confirmadas" : "Confirmed",
                },
                {
                  valor: estado.rechazadas,
                  etiqueta: es ? "Rechazadas" : "Rejected",
                },
              ].map((dato) => (
                <View key={dato.etiqueta} style={estilos.dato}>
                  <Text style={[estilos.numero, { color: tema.texto }]}>
                    {dato.valor}
                  </Text>
                  <Text style={estilos.datoEtiqueta}>{dato.etiqueta}</Text>
                </View>
              ))}
            </View>
            <Pressable
              disabled={!estado.porEnviar || enviando || !integridad}
              onPress={() => void sincronizar()}
              style={[
                estilos.boton,
                (!estado.porEnviar || enviando || !integridad) && {
                  opacity: 0.43,
                },
              ]}
            >
              {enviando ? (
                <ActivityIndicator color="white" />
              ) : (
                <Ionicons name="cloud-upload" color="white" size={20} />
              )}
              <Text style={estilos.botonTexto}>
                {enviando
                  ? es
                    ? "Confirmando con servidor…"
                    : "Confirming with server…"
                  : es
                    ? "Sincronizar ahora"
                    : "Synchronize now"}
              </Text>
            </Pressable>
            <Text style={[estilos.historialTitulo, { color: tema.texto }]}>
              {es ? "Bitácora del dispositivo" : "Device ledger"}
            </Text>
          </>
        }
        ListEmptyComponent={
          <Text style={estilos.vacio}>
            {es
              ? "Aún no hay movimientos en este equipo."
              : "There are no movements on this device yet."}
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={[
              estilos.operacion,
              { backgroundColor: tema.panel, borderColor: tema.borde },
            ]}
          >
            <View style={estilos.operacionIcono}>
              <Ionicons
                name={iconos[item.tipo]}
                color={colores.azul}
                size={19}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[estilos.operacionTipo, { color: tema.texto }]}>
                {es ? etiquetas[item.tipo] : item.tipo} · #{item.secuencia}
              </Text>
              <Text style={estilos.operacionFecha}>
                {new Date(item.creadoEn).toLocaleString(es ? "es-MX" : "en-US")}{" "}
                · {item.hashIntegridad.slice(0, 10).toUpperCase()}
              </Text>
              {item.ultimoError && (
                <>
                  <Text style={estilos.error} numberOfLines={3}>
                    {item.codigoError ? `${item.codigoError}: ` : ""}
                    {item.ultimoError}
                  </Text>
                  {item.estado === "RECHAZADA" && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        es
                          ? "Corregir mediante una captura nueva"
                          : "Correct with a new entry"
                      }
                      onPress={() =>
                        router.push(
                          item.tipo === "VENTA"
                            ? "/venta"
                            : item.tipo === "ENTREGA"
                              ? "/pedidos"
                              : "/rutas",
                        )
                      }
                      style={estilos.corregir}
                    >
                      <Text style={estilos.corregirTexto}>
                        {es
                          ? `Corregir con nueva captura · folio ${item.id.slice(-8).toUpperCase()}`
                          : `Correct with a new entry · receipt ${item.id.slice(-8).toUpperCase()}`}
                      </Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>
            <View
              style={[
                estilos.estado,
                item.estado === "SINCRONIZADA"
                  ? estilos.estadoBien
                  : item.estado === "ERROR" || item.estado === "RECHAZADA"
                    ? estilos.estadoError
                    : estilos.estadoPendiente,
              ]}
            >
              <Text
                style={[
                  estilos.estadoTexto,
                  item.estado === "SINCRONIZADA"
                    ? { color: colores.verde }
                    : item.estado === "ERROR" || item.estado === "RECHAZADA"
                      ? { color: colores.rojo }
                      : { color: "#8a3b12" },
                ]}
              >
                {item.estado === "SINCRONIZADA"
                  ? es
                    ? "CONFIRMADA"
                    : "CONFIRMED"
                  : item.estado}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  pagina: { flex: 1 },
  lista: { padding: 16, paddingBottom: 35 },
  integridad: {
    borderRadius: 13,
    padding: 13,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  integridadTitulo: { fontWeight: "900", fontSize: 13 },
  integridadDetalle: { color: colores.gris, fontSize: 10, marginTop: 2 },
  red: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 15 },
  punto: { width: 8, height: 8, borderRadius: 4 },
  redTexto: { fontWeight: "700", fontSize: 12 },
  ultima: { color: colores.gris, fontSize: 9, marginLeft: "auto" },
  titulo: { fontSize: 25, fontWeight: "900", marginTop: 19 },
  detalle: { color: colores.gris, lineHeight: 18, marginTop: 6, fontSize: 12 },
  resumen: {
    borderWidth: 1,
    borderRadius: 14,
    marginTop: 17,
    padding: 14,
    flexDirection: "row",
  },
  dato: { flex: 1, alignItems: "center" },
  numero: { fontSize: 22, fontWeight: "900" },
  datoEtiqueta: { color: colores.gris, fontSize: 9, marginTop: 3 },
  boton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: colores.azul,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 13,
  },
  botonTexto: { color: "white", fontWeight: "800", fontSize: 14 },
  historialTitulo: {
    fontSize: 16,
    fontWeight: "900",
    marginTop: 25,
    marginBottom: 10,
  },
  operacion: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  operacionIcono: {
    width: 37,
    height: 37,
    borderRadius: 10,
    backgroundColor: colores.azulClaro,
    alignItems: "center",
    justifyContent: "center",
  },
  operacionTipo: { fontWeight: "800", fontSize: 12 },
  operacionFecha: { color: colores.gris, fontSize: 9, marginTop: 3 },
  error: { color: colores.rojo, fontSize: 9, marginTop: 3 },
  corregir: { marginTop: 8, alignSelf: "flex-start" },
  corregirTexto: { color: colores.azul, fontSize: 10, fontWeight: "800" },
  estado: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4 },
  estadoBien: { backgroundColor: "#defbe6" },
  estadoError: { backgroundColor: "#fff1f1" },
  estadoPendiente: { backgroundColor: "#fff2e8" },
  estadoTexto: { fontWeight: "900", fontSize: 7 },
  vacio: { color: colores.gris, textAlign: "center", padding: 30 },
});
