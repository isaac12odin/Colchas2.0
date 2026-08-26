import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { EscanerCodigoProducto } from "@/src/modulos/inventario/EscanerCodigoProducto";
import { ModalProductoMovil } from "@/src/modulos/inventario/ModalProductoMovil";
import { TarjetaProductoMovil } from "@/src/modulos/inventario/TarjetaProductoMovil";
import { usarInventarioMovil } from "@/src/modulos/inventario/usarInventarioMovil";
import { usarSesion } from "@/src/sesion";
import { colores, usarTema } from "@/src/tema";

export default function InventarioMovil() {
  const tema = usarTema();
  const { idioma } = usarSesion();
  const es = idioma === "es";
  const control = usarInventarioMovil(es);
  const [escanerAbierto, establecerEscanerAbierto] = useState(false);

  return (
    <View style={[estilos.pagina, { backgroundColor: tema.fondo }]}>
      <FlatList
        contentContainerStyle={estilos.lista}
        data={control.visibles}
        keyExtractor={(producto) => producto.id}
        refreshControl={
          <RefreshControl
            refreshing={control.cargando}
            onRefresh={control.cargar}
            tintColor={colores.azul}
          />
        }
        ListHeaderComponent={
          <View style={estilos.cabecera}>
            {control.offline && (
              <View style={estilos.avisoOffline}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={17}
                  color="#8a3b12"
                />
                <Text style={estilos.avisoOfflineTexto}>
                  {es
                    ? "Sin conexión · puedes consultar la copia guardada."
                    : "Offline · you can view the saved copy."}
                </Text>
              </View>
            )}
            <View style={estilos.tituloFila}>
              <View style={{ flex: 1 }}>
                <Text style={[estilos.titulo, { color: tema.texto }]}>
                  {es ? "Inventario visual" : "Visual inventory"}
                </Text>
                <Text style={estilos.subtitulo}>
                  {control.totalProductos}{" "}
                  {es ? "productos activos" : "active products"}
                </Text>
              </View>
              <View style={estilos.acciones}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={es ? "Escanear producto" : "Scan product"}
                  disabled={control.offline}
                  onPress={() => establecerEscanerAbierto(true)}
                  style={[
                    estilos.escanear,
                    { borderColor: tema.borde },
                    control.offline && estilos.deshabilitado,
                  ]}
                >
                  <Ionicons name="scan" color={colores.azul} size={21} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={es ? "Crear producto" : "Create product"}
                  disabled={control.offline}
                  onPress={control.abrirNuevo}
                  style={[
                    estilos.nuevo,
                    control.offline && estilos.deshabilitado,
                  ]}
                >
                  <Ionicons name="add" color="white" size={20} />
                  <Text style={estilos.nuevoTexto}>{es ? "Nuevo" : "New"}</Text>
                </Pressable>
              </View>
            </View>
            <View
              style={[
                estilos.busqueda,
                { backgroundColor: tema.panel, borderColor: tema.borde },
              ]}
            >
              <Ionicons name="search" size={20} color={colores.gris} />
              <TextInput
                style={{ flex: 1, color: tema.texto }}
                value={control.buscar}
                onChangeText={control.establecerBuscar}
                placeholder={
                  es
                    ? "Producto, marca, SKU o código"
                    : "Product, brand, SKU, or code"
                }
                placeholderTextColor={colores.gris}
              />
              {control.buscar.length > 0 && (
                <Pressable
                  accessibilityLabel={es ? "Limpiar búsqueda" : "Clear search"}
                  onPress={() => control.establecerBuscar("")}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={colores.gris}
                  />
                </Pressable>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={estilos.filtros}
            >
              <Pressable
                onPress={() => control.establecerCategoriaId("")}
                style={[
                  estilos.filtro,
                  !control.categoriaId && estilos.filtroActivo,
                  {
                    borderColor: !control.categoriaId
                      ? colores.azul
                      : tema.borde,
                  },
                ]}
              >
                <Text
                  style={[
                    estilos.filtroTexto,
                    { color: !control.categoriaId ? "white" : tema.texto },
                  ]}
                >
                  {es ? "Todos" : "All"}
                </Text>
              </Pressable>
              {control.categorias.map((categoria) => {
                const activa = control.categoriaId === categoria.id;
                return (
                  <Pressable
                    key={categoria.id}
                    onPress={() => control.establecerCategoriaId(categoria.id)}
                    style={[
                      estilos.filtro,
                      activa && estilos.filtroActivo,
                      { borderColor: activa ? colores.azul : tema.borde },
                    ]}
                  >
                    <Text
                      style={[
                        estilos.filtroTexto,
                        { color: activa ? "white" : tema.texto },
                      ]}
                    >
                      {categoria.nombre}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          control.cargando ? (
            <ActivityIndicator style={estilos.cargando} color={colores.azul} />
          ) : (
            <View style={estilos.vacio}>
              <Ionicons name="cube-outline" size={35} color={colores.gris} />
              <Text style={estilos.vacioTexto}>
                {control.buscar
                  ? es
                    ? "No encontramos ese producto."
                    : "No matching product was found."
                  : es
                    ? "Crea el primer producto para comenzar."
                    : "Create the first product to get started."}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <TarjetaProductoMovil
            producto={item}
            tema={tema}
            es={es}
            alEditar={() => control.abrirEdicion(item)}
          />
        )}
        onEndReached={control.cargarMas}
        onEndReachedThreshold={0.35}
        ListFooterComponent={
          control.cargandoMas ? (
            <ActivityIndicator
              style={estilos.cargandoMas}
              color={colores.azul}
            />
          ) : null
        }
      />
      <ModalProductoMovil
        visible={control.modalAbierto}
        producto={control.productoEditar}
        guardando={control.guardando}
        es={es}
        tema={tema}
        alCerrar={control.cerrarModal}
        alGuardar={control.guardar}
        categorias={control.categorias}
        codigoInicial={control.codigoInicial}
        alCrearCategoria={control.crearCategoria}
      />
      <EscanerCodigoProducto
        visible={escanerAbierto}
        tipo="AMBOS"
        es={es}
        alCerrar={() => establecerEscanerAbierto(false)}
        alDetectar={(codigo, tipo) => {
          establecerEscanerAbierto(false);
          void control.resolverCodigo(codigo, tipo);
        }}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  pagina: { flex: 1 },
  lista: { padding: 15, gap: 10 },
  cabecera: { gap: 12, marginBottom: 3 },
  avisoOffline: {
    backgroundColor: "#fff2e8",
    padding: 10,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  avisoOfflineTexto: {
    color: "#8a3b12",
    fontSize: 11,
    fontWeight: "700",
    flex: 1,
  },
  tituloFila: { flexDirection: "row", alignItems: "center", gap: 12 },
  acciones: { flexDirection: "row", alignItems: "center", gap: 8 },
  escanear: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  titulo: { fontSize: 21, fontWeight: "900" },
  subtitulo: { color: colores.gris, fontSize: 11, marginTop: 2 },
  nuevo: {
    minHeight: 44,
    borderRadius: 11,
    backgroundColor: colores.azul,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  nuevoTexto: { color: "white", fontWeight: "900", fontSize: 12 },
  deshabilitado: { opacity: 0.4 },
  busqueda: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    gap: 9,
  },
  filtros: { gap: 8, paddingVertical: 2 },
  filtro: {
    minHeight: 36,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  filtroActivo: { backgroundColor: colores.azul },
  filtroTexto: { fontSize: 11, fontWeight: "800" },
  cargando: { marginTop: 45 },
  cargandoMas: { marginVertical: 18 },
  vacio: { alignItems: "center", gap: 8, marginTop: 50 },
  vacioTexto: { color: colores.gris, textAlign: "center", fontSize: 12 },
});
