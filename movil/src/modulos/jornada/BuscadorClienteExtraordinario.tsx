import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "../../api";
import { guardarCache, leerCache } from "../../almacenLocal";
import {
  BotonMovil,
  CampoMovil,
  EstadoMovil,
  HojaFormulario,
} from "../../componentes/ui";
import { radios, type usarTema } from "../../tema";
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
  const [error, establecerError] = useState("");
  const actuales = useMemo(() => new Set(clientesActuales), [clientesActuales]);

  async function buscar() {
    const texto = termino.trim();
    if (texto.length < 3) {
      establecerError(
        es ? "Escribe al menos 3 caracteres." : "Enter at least 3 characters.",
      );
      return;
    }
    establecerBuscando(true);
    establecerError("");
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

  function cerrar() {
    establecerAbierto(false);
    establecerError("");
  }

  function elegir(cliente: ClienteJornada) {
    alSeleccionar({ ...cliente, fueraDeRuta: true });
    cerrar();
    establecerTermino("");
    establecerResultados([]);
    establecerOrigen(null);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          es
            ? "Cobrar clienta fuera de esta ruta"
            : "Collect outside this route"
        }
        onPress={() => establecerAbierto(true)}
        style={({ pressed }) => [
          estilos.abrir,
          { borderColor: tema.primario, backgroundColor: tema.primarioSuave },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Ionicons name="person-add" color={tema.primario} size={20} />
        <View style={estilos.expandir}>
          <Text style={[estilos.abrirTexto, { color: tema.primario }]}>
            {es ? "Cobrar fuera de ruta" : "Collect outside route"}
          </Text>
          <Text style={[estilos.abrirDetalle, { color: tema.textoSecundario }]}>
            {es
              ? "Busca por datos de la clienta"
              : "Search using customer details"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" color={tema.primario} size={20} />
      </Pressable>

      <HojaFormulario
        visible={abierto}
        alCerrar={cerrar}
        bloqueada={buscando}
        titulo={es ? "Cobranza fuera de ruta" : "Outside-route collection"}
        subtitulo={
          es
            ? "La visita se agregará a la jornada y quedará auditada."
            : "The visit is added to the workday and remains audited."
        }
        estiloContenido={estilos.contenido}
      >
        <View style={estilos.busqueda}>
          <CampoMovil
            etiqueta={es ? "Buscar clienta" : "Search customer"}
            valor={termino}
            alCambiar={(valor) => {
              establecerTermino(valor);
              establecerError("");
            }}
            alEnviar={() => void buscar()}
            placeholder={
              es
                ? "Nombre, teléfono, dirección o tarjeta"
                : "Name, phone, address, or card"
            }
            icono="search-outline"
            autoCapitalize="none"
            autoFocus
            error={error || undefined}
          />
          <BotonMovil
            texto={es ? "Buscar" : "Search"}
            icono="search"
            cargando={buscando}
            deshabilitado={termino.trim().length < 3}
            alPulsar={() => void buscar()}
          />
        </View>

        {origen === "LOCAL" ? (
          <EstadoMovil
            tipo="advertencia"
            texto={
              es
                ? "Sin señal: resultados del directorio cifrado guardado en este equipo."
                : "Offline: results come from the encrypted directory saved on this device."
            }
          />
        ) : null}

        <View style={estilos.resultados}>
          {resultados.map((cliente) => (
            <Pressable
              key={cliente.id}
              accessibilityRole="button"
              accessibilityLabel={`${cliente.nombreCompleto}. ${cliente.telefono}. ${dinero.format(Number(cliente.saldo?.saldoActual ?? 0))}`}
              onPress={() => elegir(cliente)}
              style={({ pressed }) => [
                estilos.cliente,
                { borderColor: tema.borde, backgroundColor: tema.panelElevado },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={estilos.expandir}>
                <Text style={[estilos.nombre, { color: tema.texto }]}>
                  {cliente.nombreCompleto}
                </Text>
                <Text
                  style={[estilos.detalle, { color: tema.textoSecundario }]}
                >
                  {cliente.telefono} ·{" "}
                  {cliente.numeroTarjeta ?? (es ? "Sin tarjeta" : "No card")}
                </Text>
                <Text
                  style={[estilos.detalle, { color: tema.textoSecundario }]}
                  numberOfLines={2}
                >
                  {cliente.localidad?.nombre ?? "—"} · {cliente.direccion}
                </Text>
              </View>
              <View style={estilos.saldoBloque}>
                <Text style={[estilos.saldo, { color: tema.primario }]}>
                  {dinero.format(Number(cliente.saldo?.saldoActual ?? 0))}
                </Text>
                <Text
                  style={[estilos.saldoEtiqueta, { color: tema.textoTenue }]}
                >
                  {es ? "saldo" : "balance"}
                </Text>
              </View>
            </Pressable>
          ))}
          {!buscando && origen && resultados.length === 0 ? (
            <Text style={[estilos.vacio, { color: tema.textoSecundario }]}>
              {es
                ? "No encontramos clientas fuera de esta ruta."
                : "No customers were found outside this route."}
            </Text>
          ) : null}
        </View>
      </HojaFormulario>
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
    minHeight: 64,
    borderWidth: 1,
    borderRadius: radios.campo,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 13,
  },
  abrirTexto: { fontWeight: "900", fontSize: 14, lineHeight: 19 },
  abrirDetalle: { fontSize: 12, lineHeight: 17, marginTop: 1 },
  contenido: { gap: 14 },
  busqueda: { gap: 12 },
  resultados: { gap: 9 },
  cliente: {
    minHeight: 90,
    borderWidth: 1,
    borderRadius: radios.tarjeta,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  nombre: { fontWeight: "900", fontSize: 14, lineHeight: 19 },
  detalle: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  saldoBloque: { alignItems: "flex-end", maxWidth: 105 },
  saldo: { fontWeight: "900", fontSize: 14, lineHeight: 19 },
  saldoEtiqueta: { fontSize: 11, lineHeight: 16 },
  vacio: {
    textAlign: "center",
    paddingVertical: 28,
    fontSize: 13,
    lineHeight: 19,
  },
  expandir: { flex: 1, minWidth: 0 },
});
