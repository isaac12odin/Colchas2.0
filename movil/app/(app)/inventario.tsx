import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EstadoMovil, usarDisenoResponsivo } from "@/src/componentes/ui";
import { EscanerCodigoProducto } from "@/src/modulos/inventario/EscanerCodigoProducto";
import { ModalProductoMovil } from "@/src/modulos/inventario/ModalProductoMovil";
import { TarjetaProductoMovil } from "@/src/modulos/inventario/TarjetaProductoMovil";
import { usarInventarioMovil } from "@/src/modulos/inventario/usarInventarioMovil";
import { usarSesion } from "@/src/sesion";
import { usarTema } from "@/src/tema";

export default function InventarioMovil() {
  const tema = usarTema();
  const diseno = usarDisenoResponsivo();
  const insets = useSafeAreaInsets();
  const { idioma } = usarSesion();
  const es = idioma === "es";
  const control = usarInventarioMovil(es);
  const [escanerAbierto, establecerEscanerAbierto] = useState(false);

  return (
    <View style={[estilos.pagina, { backgroundColor: tema.fondo }]}>
      <FlatList
        contentContainerStyle={[
          estilos.lista,
          {
            width: diseno.anchoContenido,
            alignSelf: "center",
            paddingHorizontal: diseno.margen,
            paddingBottom: Math.max(insets.bottom, 20) + 16,
          },
        ]}
        data={control.visibles}
        keyExtractor={(producto) => producto.id}
        refreshControl={
          <RefreshControl
            refreshing={control.cargando}
            onRefresh={control.cargar}
            tintColor={tema.primario}
            colors={[tema.primario]}
          />
        }
        ListHeaderComponent={
          <View style={estilos.cabecera}>
            {control.offline && (
              <EstadoMovil
                tipo="advertencia"
                texto={
                  es
                    ? "Sin conexión: puedes consultar y escanear la copia guardada; para modificar existencias vuelve a conectarte."
                    : "Offline: browse and scan the saved copy; reconnect before changing stock."
                }
              />
            )}
            {!control.offline && control.errorCarga ? (
              <EstadoMovil tipo="error" texto={control.errorCarga} />
            ) : null}
            <View
              style={[
                estilos.tituloFila,
                (diseno.compacto || diseno.fontScale > 1.2) &&
                  estilos.tituloFilaApilada,
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[estilos.titulo, { color: tema.texto }]}>
                  {es ? "Inventario visual" : "Visual inventory"}
                </Text>
                <Text
                  style={[estilos.subtitulo, { color: tema.textoSecundario }]}
                >
                  {control.totalProductos}{" "}
                  {es ? "productos activos" : "active products"}
                </Text>
              </View>
              <View
                style={[
                  estilos.acciones,
                  (diseno.compacto || diseno.fontScale > 1.2) &&
                    estilos.accionesExpandidas,
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={es ? "Escanear producto" : "Scan product"}
                  onPress={() => establecerEscanerAbierto(true)}
                  style={[
                    estilos.escanear,
                    (diseno.compacto || diseno.fontScale > 1.2) &&
                      estilos.escanearExpandido,
                    { borderColor: tema.bordeFuerte },
                  ]}
                >
                  <Ionicons name="scan" color={tema.primario} size={22} />
                  {(diseno.compacto || diseno.fontScale > 1.2) && (
                    <Text
                      style={[estilos.accionTexto, { color: tema.primario }]}
                    >
                      {es ? "Escanear" : "Scan"}
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={es ? "Crear producto" : "Create product"}
                  disabled={control.offline}
                  onPress={control.abrirNuevo}
                  style={[
                    estilos.nuevo,
                    (diseno.compacto || diseno.fontScale > 1.2) &&
                      estilos.nuevoExpandido,
                    { backgroundColor: tema.primario },
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
              <Ionicons name="search" size={20} color={tema.textoTenue} />
              <TextInput
                accessibilityLabel={
                  es ? "Buscar en inventario" : "Search inventory"
                }
                style={[estilos.entradaBuscar, { color: tema.texto }]}
                value={control.buscar}
                onChangeText={control.establecerBuscar}
                placeholder={
                  es
                    ? "Producto, marca, SKU o código"
                    : "Product, brand, SKU, or code"
                }
                placeholderTextColor={tema.textoTenue}
              />
              {control.buscar.length > 0 && (
                <Pressable
                  accessibilityLabel={es ? "Limpiar búsqueda" : "Clear search"}
                  onPress={() => control.establecerBuscar("")}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={tema.textoTenue}
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
                  {
                    borderColor: !control.categoriaId
                      ? tema.primario
                      : tema.bordeFuerte,
                    backgroundColor: !control.categoriaId
                      ? tema.primario
                      : tema.panel,
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
                      {
                        borderColor: activa ? tema.primario : tema.bordeFuerte,
                        backgroundColor: activa ? tema.primario : tema.panel,
                      },
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
            <ActivityIndicator style={estilos.cargando} color={tema.primario} />
          ) : (
            <View style={estilos.vacio}>
              <Ionicons name="cube-outline" size={38} color={tema.textoTenue} />
              <Text
                style={[estilos.vacioTexto, { color: tema.textoSecundario }]}
              >
                {control.errorCarga
                  ? es
                    ? "No mostramos inventario anterior porque el servidor rechazó la consulta. Desliza para reintentar."
                    : "We did not show previous inventory because the server rejected the request. Pull to retry."
                  : control.buscar
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
            alEditar={() => {
              if (!control.offline) {
                control.abrirEdicion(item);
                return;
              }
              Alert.alert(
                es
                  ? "Edición disponible con conexión"
                  : "Editing requires a connection",
                es
                  ? "Puedes consultar y escanear sin señal. Conéctate antes de modificar este producto."
                  : "You can browse and scan offline. Connect before changing this product.",
              );
            }}
          />
        )}
        onEndReached={control.cargarMas}
        onEndReachedThreshold={0.35}
        ListFooterComponent={
          control.cargandoMas ? (
            <ActivityIndicator
              style={estilos.cargandoMas}
              color={tema.primario}
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
  lista: { gap: 11, paddingBottom: 28 },
  cabecera: { gap: 12, marginBottom: 3 },
  tituloFila: { flexDirection: "row", alignItems: "center", gap: 12 },
  tituloFilaApilada: { flexDirection: "column", alignItems: "stretch" },
  acciones: { flexDirection: "row", alignItems: "center", gap: 8 },
  accionesExpandidas: { alignItems: "stretch" },
  escanear: {
    minWidth: 48,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  escanearExpandido: { flex: 1 },
  titulo: { fontSize: 22, lineHeight: 28, fontWeight: "900" },
  subtitulo: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  nuevo: {
    minHeight: 48,
    borderRadius: 11,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  nuevoExpandido: { flex: 1 },
  nuevoTexto: { color: "white", fontWeight: "900", fontSize: 14 },
  accionTexto: { fontSize: 14, fontWeight: "800" },
  deshabilitado: { opacity: 0.4 },
  busqueda: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    gap: 9,
  },
  entradaBuscar: { flex: 1, minHeight: 48, fontSize: 16, paddingVertical: 0 },
  filtros: { gap: 8, paddingVertical: 2 },
  filtro: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  filtroTexto: { fontSize: 13, lineHeight: 18, fontWeight: "800" },
  cargando: { marginTop: 45 },
  cargandoMas: { marginVertical: 18 },
  vacio: { alignItems: "center", gap: 8, marginTop: 50 },
  vacioTexto: { textAlign: "center", fontSize: 13, lineHeight: 19 },
});
