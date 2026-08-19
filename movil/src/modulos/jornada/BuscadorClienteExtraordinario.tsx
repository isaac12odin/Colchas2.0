import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "../../api";
import { guardarCache, leerCache } from "../../almacenLocal";
import { colores, type usarTema } from "../../tema";
import type { ClienteJornada } from "../../tipos";
import { dinero } from "../../utilidades/formato";

interface Propiedades {
  rutaId: string;
  clientesActuales: string[];
  es: boolean;
  tema: ReturnType<typeof usarTema>;
  alSeleccionar: (cliente: ClienteJornada) => void;
}

export function BuscadorClienteExtraordinario({
  rutaId,
  clientesActuales,
  es,
  tema,
  alSeleccionar,
}: Propiedades) {
  const [abierto, establecerAbierto] = useState(false);
  const [termino, establecerTermino] = useState("");
  const [resultados, establecerResultados] = useState<ClienteJornada[]>([]);
  const [buscando, establecerBuscando] = useState(false);
  const [origen, establecerOrigen] = useState<"RED" | "LOCAL" | null>(null);
  const actuales = useMemo(() => new Set(clientesActuales), [clientesActuales]);

  async function buscar() {
    const texto = termino.trim();
    if (texto.length < 3) return;
    establecerBuscando(true);
    const locales = await leerCache<ClienteJornada[]>("directorio_cobranza");
    const coincidenciasLocales = filtrar(locales ?? [], texto, actuales);
    try {
      const respuesta = await api<{ datos: ClienteJornada[] }>(
        `/rutas/${rutaId}/clientes-extraordinarios?buscar=${encodeURIComponent(texto)}`,
      );
      establecerResultados(
        respuesta.datos.filter((cliente) => !actuales.has(cliente.id)),
      );
      establecerOrigen("RED");
      await guardarCache(
        "directorio_cobranza",
        combinarPorId(locales ?? [], respuesta.datos),
      );
    } catch {
      establecerResultados(coincidenciasLocales);
      establecerOrigen("LOCAL");
    } finally {
      establecerBuscando(false);
    }
  }

  function elegir(cliente: ClienteJornada) {
    alSeleccionar({ ...cliente, fueraDeRuta: true });
    establecerAbierto(false);
    establecerTermino("");
    establecerResultados([]);
  }

  return (
    <>
      <Pressable style={estilos.abrir} onPress={() => establecerAbierto(true)}>
        <Ionicons name="person-add" color={colores.azul} size={18} />
        <Text style={estilos.abrirTexto}>
          {es ? "Cobrar clienta fuera de ruta" : "Collect outside this route"}
        </Text>
      </Pressable>
      <Modal
        visible={abierto}
        transparent
        animationType="slide"
        onRequestClose={() => establecerAbierto(false)}
      >
        <View style={estilos.fondo}>
          <View style={[estilos.modal, { backgroundColor: tema.panel }]}>
            <View style={estilos.encabezado}>
              <View style={estilos.expandir}>
                <Text style={[estilos.titulo, { color: tema.texto }]}>
                  {es ? "Cobranza extraordinaria" : "Extraordinary collection"}
                </Text>
                <Text style={estilos.ayuda}>
                  {es
                    ? "Busca por nombre, teléfono, dirección o tarjeta."
                    : "Search by name, phone, address, or card."}
                </Text>
              </View>
              <Pressable
                style={estilos.cerrar}
                onPress={() => establecerAbierto(false)}
              >
                <Ionicons name="close" size={23} color={tema.texto} />
              </Pressable>
            </View>
            <View style={estilos.busqueda}>
              <TextInput
                autoFocus
                value={termino}
                onChangeText={establecerTermino}
                onSubmitEditing={() => void buscar()}
                placeholder={
                  es
                    ? "Nombre, teléfono, dirección o tarjeta"
                    : "Name, phone, address, or card"
                }
                placeholderTextColor={colores.gris}
                style={[
                  estilos.campo,
                  { color: tema.texto, borderColor: tema.borde },
                ]}
              />
              <Pressable
                style={estilos.botonBuscar}
                onPress={() => void buscar()}
              >
                {buscando ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Ionicons name="search" color="white" size={20} />
                )}
              </Pressable>
            </View>
            {origen === "LOCAL" && (
              <Text style={estilos.local}>
                {es
                  ? "Sin señal · resultados del directorio cifrado."
                  : "Offline · encrypted directory results."}
              </Text>
            )}
            <View style={estilos.resultados}>
              {resultados.map((cliente) => (
                <Pressable
                  key={cliente.id}
                  style={[estilos.cliente, { borderColor: tema.borde }]}
                  onPress={() => elegir(cliente)}
                >
                  <View style={estilos.expandir}>
                    <Text style={[estilos.nombre, { color: tema.texto }]}>
                      {cliente.nombreCompleto}
                    </Text>
                    <Text style={estilos.detalle}>
                      {cliente.numeroTarjeta ??
                        (es ? "Sin tarjeta" : "No card")}{" "}
                      · {cliente.localidad?.nombre ?? "—"}
                    </Text>
                  </View>
                  <Text style={estilos.saldo}>
                    {dinero.format(Number(cliente.saldo?.saldoActual ?? 0))}
                  </Text>
                </Pressable>
              ))}
              {!buscando && origen && resultados.length === 0 && (
                <Text style={estilos.vacio}>
                  {es
                    ? "No se encontraron clientas fuera de esta ruta."
                    : "No customers found outside this route."}
                </Text>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function filtrar(
  clientes: ClienteJornada[],
  termino: string,
  actuales: Set<string>,
) {
  const normalizado = termino.toLocaleLowerCase("es-MX");
  return clientes
    .filter(
      (cliente) =>
        !actuales.has(cliente.id) &&
        `${cliente.nombreCompleto} ${cliente.telefono} ${cliente.direccion} ${cliente.numeroTarjeta ?? ""} ${cliente.localidad?.nombre ?? ""}`
          .toLocaleLowerCase("es-MX")
          .includes(normalizado),
    )
    .slice(0, 20);
}

function combinarPorId(actuales: ClienteJornada[], nuevos: ClienteJornada[]) {
  return [
    ...new Map(
      [...actuales, ...nuevos].map((cliente) => [cliente.id, cliente]),
    ).values(),
  ];
}

const estilos = StyleSheet.create({
  abrir: {
    marginHorizontal: 13,
    marginTop: 10,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colores.azul,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  abrirTexto: { color: colores.azul, fontWeight: "800", fontSize: 13 },
  fondo: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.48)",
    justifyContent: "flex-end",
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 38,
    minHeight: "55%",
    maxHeight: "88%",
  },
  encabezado: { flexDirection: "row", alignItems: "center", gap: 10 },
  expandir: { flex: 1 },
  titulo: { fontSize: 19, fontWeight: "900" },
  ayuda: { color: colores.gris, fontSize: 11, marginTop: 3 },
  cerrar: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  busqueda: { flexDirection: "row", gap: 8, marginTop: 18 },
  campo: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 12,
  },
  botonBuscar: {
    width: 48,
    height: 48,
    borderRadius: 11,
    backgroundColor: colores.azul,
    alignItems: "center",
    justifyContent: "center",
  },
  local: {
    color: "#8a3b12",
    backgroundColor: "#fff2e8",
    padding: 8,
    borderRadius: 8,
    marginTop: 9,
    fontSize: 10,
  },
  resultados: { gap: 8, marginTop: 14 },
  cliente: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: 11,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nombre: { fontWeight: "800", fontSize: 13 },
  detalle: { color: colores.gris, fontSize: 10, marginTop: 4 },
  saldo: { color: colores.azul, fontWeight: "900", fontSize: 12 },
  vacio: { color: colores.gris, textAlign: "center", padding: 24 },
});
