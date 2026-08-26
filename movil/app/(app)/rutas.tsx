import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, obtenerConectividad } from "@/src/api";
import { contarOperaciones, guardarCache, leerCache } from "@/src/almacenLocal";
import type { ClienteJornada, ProductoMovil, Ruta } from "@/src/tipos";
import { colores, usarTema } from "@/src/tema";
import { usarSesion } from "@/src/sesion";
import { usarDatosVivosMovil } from "@/src/usarDatosVivosMovil";
import { AgendaCobranzaMovil } from "@/src/modulos/jornada/AgendaCobranzaMovil";

export default function ListaRutas() {
  const tema = usarTema();
  const { idioma } = usarSesion();
  const es = idioma === "es";
  const [rutas, establecerRutas] = useState<Ruta[]>([]);
  const [cargando, establecerCargando] = useState(true);
  const [offline, establecerOffline] = useState(false);
  const [productos, establecerProductos] = useState(0);
  const [pendientes, establecerPendientes] = useState(0);
  const cargar = useCallback(async () => {
    establecerCargando(true);
    try {
      const pendientes = await contarOperaciones();
      establecerPendientes(pendientes);
      if (pendientes > 0) {
        const [guardadas, catalogo, red] = await Promise.all([
          leerCache<Ruta[]>("rutas"),
          leerCache<ProductoMovil[]>("catalogo_productos"),
          obtenerConectividad().catch(() => ({ conectada: false })),
        ]);
        if (guardadas || catalogo) {
          establecerRutas(guardadas ?? []);
          establecerProductos(catalogo?.length ?? 0);
          establecerOffline(!red.conectada);
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
    } catch {
      const [guardadas, catalogo] = await Promise.all([
        leerCache<Ruta[]>("rutas"),
        leerCache<ProductoMovil[]>("catalogo_productos"),
      ]);
      establecerRutas(guardadas ?? []);
      establecerProductos(catalogo?.length ?? 0);
      establecerOffline(true);
    } finally {
      establecerCargando(false);
    }
  }, []);
  usarDatosVivosMovil(cargar);
  if (cargando && !rutas.length)
    return (
      <View style={estilos.centro}>
        <ActivityIndicator color={colores.azul} />
      </View>
    );
  return (
    <FlatList
      style={{ backgroundColor: tema.fondo }}
      contentContainerStyle={estilos.lista}
      data={rutas}
      keyExtractor={(r) => r.id}
      refreshControl={
        <RefreshControl
          refreshing={cargando}
          onRefresh={cargar}
          tintColor={colores.azul}
        />
      }
      ListHeaderComponent={
        <>
          <AgendaCobranzaMovil es={es} tema={tema} />
          <View style={estilos.separador} />
          {offline && (
            <View style={estilos.aviso}>
              <Ionicons name="cloud-offline" size={18} color="#8a3b12" />
              <Text style={estilos.avisoTexto}>
                {es
                  ? "Modo sin conexión · tu trabajo se guardará cifrado."
                  : "Offline mode · your work will be stored encrypted."}
              </Text>
            </View>
          )}
          {!offline && pendientes > 0 && (
            <View style={estilos.avisoPendiente}>
              <Ionicons name="shield-checkmark" size={18} color="#0043ce" />
              <Text style={estilos.avisoPendienteTexto}>
                {es
                  ? `${pendientes} movimientos locales protegidos. Sincroniza para confirmarlos.`
                  : `${pendientes} local movements secured. Sync to confirm them.`}
              </Text>
            </View>
          )}
          <Text style={[estilos.ayuda, { color: tema.texto }]}>
            {es
              ? "Selecciona la ruta que vas a recorrer."
              : "Select the route you will cover."}
          </Text>
          <Text style={estilos.catalogo}>
            <Ionicons name="checkmark-circle" color={colores.verde} size={13} />{" "}
            {productos}{" "}
            {es
              ? "productos disponibles para venta sin conexión"
              : "products available for offline sales"}
          </Text>
        </>
      }
      ListEmptyComponent={
        <Text style={estilos.vacio}>
          {es
            ? "No hay rutas disponibles sin conexión."
            : "No routes are available offline."}
        </Text>
      }
      renderItem={({ item }) => (
        <Pressable
          style={[
            estilos.tarjeta,
            { backgroundColor: tema.panel, borderColor: tema.borde },
          ]}
          onPress={() =>
            router.push({
              pathname: "/(app)/ruta/[id]",
              params: { id: item.id, nombre: item.nombre },
            })
          }
        >
          <View style={estilos.icono}>
            <Ionicons name="map" color={colores.azul} size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[estilos.nombre, { color: tema.texto }]}>
              {item.nombre}
            </Text>
            <Text style={estilos.detalle}>
              {item.diaSemana} · {item._count.clientes}{" "}
              {es ? "clientes" : "customers"}
            </Text>
            <Text style={estilos.localidades} numberOfLines={1}>
              {item.localidades.map((l) => l.localidad.nombre).join(" · ")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colores.gris} />
        </Pressable>
      )}
    />
  );
}
const estilos = StyleSheet.create({
  centro: { flex: 1, justifyContent: "center", alignItems: "center" },
  lista: { padding: 18, gap: 12 },
  ayuda: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
  separador: { height: 6 },
  catalogo: { color: colores.verde, fontSize: 11, marginBottom: 8 },
  tarjeta: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 15,
    flexDirection: "row",
    gap: 13,
    alignItems: "center",
  },
  icono: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: colores.azulClaro,
    alignItems: "center",
    justifyContent: "center",
  },
  nombre: { fontWeight: "700", fontSize: 16 },
  detalle: { color: colores.gris, fontSize: 12, marginTop: 4 },
  localidades: { color: colores.gris, fontSize: 12, marginTop: 3 },
  aviso: {
    backgroundColor: "#fff2e8",
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  avisoTexto: { color: "#8a3b12", fontSize: 12, flex: 1 },
  avisoPendiente: {
    backgroundColor: "#edf5ff",
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  avisoPendienteTexto: { color: "#0043ce", fontSize: 12, flex: 1 },
  vacio: { textAlign: "center", color: colores.gris, paddingTop: 40 },
});
