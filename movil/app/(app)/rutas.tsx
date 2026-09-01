import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, esFalloRealRed } from "@/src/api";
import { contarOperaciones, guardarCache, leerCache } from "@/src/almacenLocal";
import type { ClienteJornada, ProductoMovil, Ruta } from "@/src/tipos";
import { espaciado, radios, tactilMinimo, usarTema } from "@/src/tema";
import { usarSesion } from "@/src/sesion";
import { usarDatosVivosMovil } from "@/src/usarDatosVivosMovil";
import { AgendaCobranzaMovil } from "@/src/modulos/jornada/AgendaCobranzaMovil";
import { usarDisenoResponsivo } from "@/src/componentes/ui";
import { resolverProyeccionPendiente } from "@/src/utilidades/cacheOperativa";

export default function ListaRutas() {
  const tema = usarTema();
  const diseno = usarDisenoResponsivo();
  const insets = useSafeAreaInsets();
  const { idioma } = usarSesion();
  const es = idioma === "es";
  const [rutas, establecerRutas] = useState<Ruta[]>([]);
  const [cargando, establecerCargando] = useState(true);
  const [offline, establecerOffline] = useState(false);
  const [productos, establecerProductos] = useState(0);
  const [pendientes, establecerPendientes] = useState(0);
  const [errorCarga, establecerErrorCarga] = useState("");
  const [busqueda, establecerBusqueda] = useState("");
  const cargar = useCallback(async () => {
    establecerCargando(true);
    try {
      const pendientes = await contarOperaciones();
      establecerPendientes(pendientes);
      if (pendientes > 0) {
        const [guardadas, catalogo] = await Promise.all([
          leerCache<Ruta[]>("rutas"),
          leerCache<ProductoMovil[]>("catalogo_productos"),
        ]);
        const proyeccion = await resolverProyeccionPendiente({
          pendientes,
          cachePrincipal: guardadas,
          revalidarSesion: () => api("/auth/sesion"),
        });
        if (proyeccion.usar) {
          establecerRutas(proyeccion.datos);
          establecerProductos(catalogo?.length ?? 0);
          establecerOffline(proyeccion.offline);
          establecerErrorCarga("");
          return;
        }
      }
      const [r, catalogo, directorio] = await Promise.all([
        api<{ datos: Ruta[] }>("/rutas"),
        api<{ datos: ProductoMovil[] }>("/sincronizacion/catalogo"),
        api<{ datos: ClienteJornada[] }>("/rutas/directorio-cobranza"),
      ]);
      establecerRutas(r.datos);
      establecerProductos(catalogo.datos.length);
      await Promise.all([
        guardarCache("rutas", r.datos),
        guardarCache("catalogo_productos", catalogo.datos),
        guardarCache("directorio_cobranza", directorio.datos),
      ]);
      establecerOffline(false);
      establecerErrorCarga("");
    } catch (error) {
      if (!esFalloRealRed(error)) {
        establecerRutas([]);
        establecerProductos(0);
        establecerOffline(false);
        establecerErrorCarga(
          error instanceof Error
            ? error.message
            : es
              ? "El servidor rechazó la consulta."
              : "The server rejected the request.",
        );
        return;
      }
      const [guardadas, catalogo] = await Promise.all([
        leerCache<Ruta[]>("rutas"),
        leerCache<ProductoMovil[]>("catalogo_productos"),
      ]);
      establecerRutas(guardadas ?? []);
      establecerProductos(catalogo?.length ?? 0);
      establecerOffline(true);
      establecerErrorCarga("");
    } finally {
      establecerCargando(false);
    }
  }, [es]);
  usarDatosVivosMovil(cargar);

  const rutasVisibles = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase();
    if (!termino) return rutas;
    return rutas.filter((ruta) =>
      [
        ruta.nombre,
        ruta.diaSemana,
        ...ruta.localidades.map(({ localidad }) => localidad.nombre),
      ].some((valor) => valor.toLocaleLowerCase().includes(termino)),
    );
  }, [busqueda, rutas]);

  if (cargando && !rutas.length)
    return (
      <View style={[estilos.centro, { backgroundColor: tema.fondo }]}>
        <ActivityIndicator color={tema.primario} size="large" />
        <Text style={[estilos.cargandoTexto, { color: tema.textoSecundario }]}>
          {es ? "Preparando tus rutas…" : "Preparing your routes…"}
        </Text>
      </View>
    );
  return (
    <FlatList
      style={{ backgroundColor: tema.fondo }}
      contentContainerStyle={[
        estilos.lista,
        {
          paddingHorizontal: diseno.margen,
          paddingBottom: Math.max(insets.bottom, espaciado.lg) + espaciado.md,
          maxWidth: diseno.tableta ? 820 : undefined,
        },
      ]}
      data={rutasVisibles}
      keyExtractor={(r) => r.id}
      refreshControl={
        <RefreshControl
          refreshing={cargando}
          onRefresh={cargar}
          tintColor={tema.primario}
          colors={[tema.primario]}
        />
      }
      ListHeaderComponent={
        <View style={estilos.encabezadoLista}>
          <AgendaCobranzaMovil es={es} tema={tema} />
          {offline && (
            <View
              style={[
                estilos.aviso,
                { backgroundColor: tema.advertenciaSuave },
              ]}
              accessibilityRole="alert"
            >
              <Ionicons
                name="cloud-offline"
                size={20}
                color={tema.advertencia}
              />
              <Text style={[estilos.avisoTexto, { color: tema.advertencia }]}>
                {es
                  ? "Sin conexión. Puedes continuar: el trabajo queda cifrado en este equipo."
                  : "Offline. You can continue: work stays encrypted on this device."}
              </Text>
            </View>
          )}
          {!offline && errorCarga ? (
            <View
              style={[estilos.aviso, { backgroundColor: tema.peligroSuave }]}
              accessibilityRole="alert"
            >
              <Ionicons name="alert-circle" size={20} color={tema.peligro} />
              <Text style={[estilos.avisoTexto, { color: tema.peligro }]}>
                {errorCarga}
              </Text>
            </View>
          ) : null}
          {!offline && pendientes > 0 && (
            <View
              style={[estilos.aviso, { backgroundColor: tema.primarioSuave }]}
              accessibilityRole="alert"
            >
              <Ionicons
                name="shield-checkmark"
                size={20}
                color={tema.primario}
              />
              <Text style={[estilos.avisoTexto, { color: tema.primario }]}>
                {es
                  ? `${pendientes} movimientos locales protegidos. Sincroniza para confirmarlos.`
                  : `${pendientes} local movements secured. Sync to confirm them.`}
              </Text>
            </View>
          )}

          <View style={estilos.tituloBloque}>
            <Text style={[estilos.ayuda, { color: tema.texto }]}>
              {es ? "Elige tu ruta" : "Choose your route"}
            </Text>
            <Text
              style={[estilos.instruccion, { color: tema.textoSecundario }]}
            >
              {es
                ? "Busca por ruta, día o localidad."
                : "Search by route, day or location."}
            </Text>
          </View>

          <View
            style={[
              estilos.buscador,
              { backgroundColor: tema.campo, borderColor: tema.borde },
            ]}
          >
            <Ionicons name="search" color={tema.textoTenue} size={20} />
            <TextInput
              value={busqueda}
              onChangeText={establecerBusqueda}
              placeholder={
                es ? "Ruta, día o localidad" : "Route, day or location"
              }
              placeholderTextColor={tema.textoTenue}
              style={[estilos.entradaBusqueda, { color: tema.texto }]}
              returnKeyType="search"
              autoCorrect={false}
              accessibilityLabel={es ? "Buscar ruta" : "Search route"}
            />
            {busqueda.length > 0 && (
              <Pressable
                onPress={() => establecerBusqueda("")}
                style={estilos.limpiarBusqueda}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={es ? "Limpiar búsqueda" : "Clear search"}
              >
                <Ionicons
                  name="close-circle"
                  color={tema.textoTenue}
                  size={22}
                />
              </Pressable>
            )}
          </View>

          <View style={estilos.catalogoFila}>
            <Ionicons name="checkmark-circle" color={tema.exito} size={18} />
            <Text style={[estilos.catalogo, { color: tema.exito }]}>
              {productos}{" "}
              {es
                ? "productos listos para vender sin conexión"
                : "products ready for offline sales"}
            </Text>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={[estilos.vacio, { borderColor: tema.borde }]}>
          <Ionicons
            name={busqueda ? "search-outline" : "map-outline"}
            color={tema.textoTenue}
            size={30}
          />
          <Text style={[estilos.vacioTitulo, { color: tema.texto }]}>
            {busqueda
              ? es
                ? "No encontramos esa ruta"
                : "No matching route"
              : es
                ? "No hay rutas disponibles"
                : "No routes available"}
          </Text>
          <Text style={[estilos.vacioDetalle, { color: tema.textoSecundario }]}>
            {busqueda
              ? es
                ? "Prueba con otro nombre, día o localidad."
                : "Try another name, day, or location."
              : errorCarga
                ? es
                  ? "No mostramos una copia anterior porque el servidor rechazó la consulta. Desliza para reintentar."
                  : "We did not show a previous copy because the server rejected the request. Pull to retry."
                : offline
                  ? es
                    ? "Conéctate una vez para descargar tus rutas."
                    : "Connect once to download your routes."
                  : es
                    ? "Aún no tienes rutas asignadas."
                    : "You do not have assigned routes yet."}
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          style={({ pressed }) => [
            estilos.tarjeta,
            { backgroundColor: tema.panel, borderColor: tema.borde },
            pressed && { backgroundColor: tema.primarioSuave },
          ]}
          onPress={() =>
            router.push({
              pathname: "/(app)/ruta/[id]",
              params: { id: item.id, nombre: item.nombre },
            })
          }
          accessibilityRole="button"
          accessibilityLabel={`${item.nombre}, ${item.diaSemana}, ${item._count.clientes} ${es ? "clientes" : "customers"}`}
          accessibilityHint={
            es ? "Abre la ruta de cobranza" : "Opens the collection route"
          }
        >
          <View
            style={[estilos.icono, { backgroundColor: tema.primarioSuave }]}
          >
            <Ionicons name="map" color={tema.primario} size={24} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[estilos.nombre, { color: tema.texto }]}>
              {item.nombre}
            </Text>
            <Text style={[estilos.detalle, { color: tema.textoSecundario }]}>
              {item.diaSemana} · {item._count.clientes}{" "}
              {es ? "clientes" : "customers"}
            </Text>
            <Text
              style={[estilos.localidades, { color: tema.textoTenue }]}
              numberOfLines={2}
            >
              {item.localidades.map((l) => l.localidad.nombre).join(" · ")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={tema.textoTenue} />
        </Pressable>
      )}
    />
  );
}
const estilos = StyleSheet.create({
  centro: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  cargandoTexto: { fontSize: 14, fontWeight: "600" },
  lista: {
    width: "100%",
    alignSelf: "center",
    paddingTop: espaciado.md,
    paddingBottom: espaciado.xxl,
    gap: espaciado.sm,
  },
  encabezadoLista: { gap: espaciado.sm, marginBottom: espaciado.xs },
  tituloBloque: { gap: 3, marginTop: 2 },
  ayuda: { fontSize: 19, fontWeight: "800" },
  instruccion: { fontSize: 14, lineHeight: 20 },
  buscador: {
    minHeight: tactilMinimo,
    borderWidth: 1,
    borderRadius: radios.campo,
    paddingLeft: 14,
    paddingRight: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  entradaBusqueda: { flex: 1, minHeight: tactilMinimo, fontSize: 16 },
  limpiarBusqueda: {
    width: tactilMinimo,
    height: tactilMinimo,
    alignItems: "center",
    justifyContent: "center",
  },
  catalogoFila: { flexDirection: "row", alignItems: "center", gap: 7 },
  catalogo: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: "600" },
  tarjeta: {
    borderWidth: 1,
    borderRadius: radios.tarjeta,
    padding: 14,
    minHeight: 84,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  icono: {
    width: 45,
    height: 45,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  nombre: { fontWeight: "800", fontSize: 17 },
  detalle: { fontSize: 13, lineHeight: 18, marginTop: 3 },
  localidades: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  aviso: {
    padding: 12,
    borderRadius: radios.campo,
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  avisoTexto: { fontSize: 13, lineHeight: 18, flex: 1, fontWeight: "600" },
  vacio: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: radios.tarjeta,
    minHeight: 170,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  vacioTitulo: { fontSize: 16, fontWeight: "800", marginTop: 10 },
  vacioDetalle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 4,
  },
});
