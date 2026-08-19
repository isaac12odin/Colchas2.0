import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api";
import { guardarCache, leerCache } from "@/src/almacenLocal";
import { colores, usarTema } from "@/src/tema";
import { usarSesion } from "@/src/sesion";

interface Producto {
  id: string;
  sku: string;
  nombre: string;
  marca: string;
  existencia: number;
  existenciaMinima: number;
  precioVenta: string;
}
const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});
export default function InventarioMovil() {
  const tema = usarTema();
  const { idioma } = usarSesion();
  const es = idioma === "es";
  const [productos, establecerProductos] = useState<Producto[]>([]);
  const [buscar, establecerBuscar] = useState("");
  const [cargando, establecerCargando] = useState(true);
  const [offline, establecerOffline] = useState(false);
  async function cargar() {
    establecerCargando(true);
    try {
      const r = await api<{ datos: Producto[] }>(
        "/inventario/productos?limite=100",
      );
      establecerProductos(r.datos);
      await guardarCache("inventario", r.datos);
      establecerOffline(false);
    } catch {
      establecerProductos((await leerCache<Producto[]>("inventario")) ?? []);
      establecerOffline(true);
    } finally {
      establecerCargando(false);
    }
  }
  useEffect(() => {
    void cargar();
  }, []);
  const filtrados = productos.filter((p) =>
    `${p.sku} ${p.nombre} ${p.marca}`
      .toLowerCase()
      .includes(buscar.toLowerCase()),
  );
  if (cargando && !productos.length)
    return (
      <View style={estilos.centro}>
        <ActivityIndicator color={colores.azul} />
      </View>
    );
  return (
    <FlatList
      style={{ backgroundColor: tema.fondo }}
      contentContainerStyle={estilos.lista}
      data={filtrados}
      keyExtractor={(p) => p.id}
      refreshControl={
        <RefreshControl
          refreshing={cargando}
          onRefresh={cargar}
          tintColor={colores.azul}
        />
      }
      ListHeaderComponent={
        <>
          {offline && (
            <Text style={estilos.offline}>
              {es ? "Sin conexión · copia guardada" : "Offline · saved copy"}
            </Text>
          )}
          <View
            style={[
              estilos.busqueda,
              { backgroundColor: tema.panel, borderColor: tema.borde },
            ]}
          >
            <Ionicons name="search" size={20} color={colores.gris} />
            <TextInput
              style={{ flex: 1, color: tema.texto }}
              value={buscar}
              onChangeText={establecerBuscar}
              placeholder={
                es ? "Buscar producto o SKU" : "Search product or SKU"
              }
              placeholderTextColor={colores.gris}
            />
          </View>
        </>
      }
      renderItem={({ item }) => (
        <View
          style={[
            estilos.producto,
            { backgroundColor: tema.panel, borderColor: tema.borde },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[estilos.nombre, { color: tema.texto }]}>
              {item.nombre}
            </Text>
            <Text style={estilos.detalle}>
              {item.sku} · {item.marca}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={[
                estilos.existencia,
                item.existencia <= item.existenciaMinima && {
                  color: colores.rojo,
                },
              ]}
            >
              {item.existencia} {es ? "pzas." : "pcs."}
            </Text>
            <Text style={estilos.detalle}>
              {dinero.format(Number(item.precioVenta))}
            </Text>
          </View>
        </View>
      )}
    />
  );
}
const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  lista: { padding: 16, gap: 9 },
  offline: {
    backgroundColor: "#fff2e8",
    color: "#8a3b12",
    textAlign: "center",
    padding: 9,
    borderRadius: 9,
    marginBottom: 10,
  },
  busqueda: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    gap: 9,
    marginBottom: 5,
  },
  producto: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 13,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
  },
  nombre: { fontWeight: "700" },
  detalle: { color: colores.gris, fontSize: 12, marginTop: 4 },
  existencia: { color: colores.verde, fontWeight: "700" },
});
