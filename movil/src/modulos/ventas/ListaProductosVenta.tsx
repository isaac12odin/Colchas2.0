import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";

import { crearFuenteImagenApi } from "../../api";
import { CampoMovil, EstadoMovil } from "../../componentes/ui";
import { radios, tactilMinimo, type usarTema } from "../../tema";
import type { ProductoMovil } from "../../tipos";
import { dinero } from "../../utilidades/formato";
import type { LineaCarrito } from "./dominioVenta";

interface Propiedades {
  catalogoVacio: boolean;
  productos: ProductoMovil[];
  carrito: LineaCarrito[];
  busqueda: string;
  es: boolean;
  tema: ReturnType<typeof usarTema>;
  alBuscar: (valor: string) => void;
  alCambiarCantidad: (producto: ProductoMovil, cambio: number) => void;
}

export function ListaProductosVenta({
  catalogoVacio,
  productos,
  carrito,
  busqueda,
  es,
  tema,
  alBuscar,
  alCambiarCantidad,
}: Propiedades) {
  return (
    <>
      <CampoMovil
        etiqueta={es ? "Buscar en inventario" : "Search inventory"}
        valor={busqueda}
        alCambiar={alBuscar}
        placeholder={
          es ? "Nombre, marca, SKU o código" : "Name, brand, SKU, or code"
        }
        icono="search-outline"
        autoCapitalize="none"
      />
      {catalogoVacio ? (
        <EstadoMovil
          tipo="advertencia"
          texto={
            es
              ? "Conéctate y abre una ruta para descargar el catálogo antes de vender."
              : "Connect and open a route to download the catalog before selling."
          }
        />
      ) : null}
      {!catalogoVacio && !productos.length ? (
        <View style={estilos.vacio}>
          <Ionicons name="search-outline" size={27} color={tema.textoTenue} />
          <Text style={[estilos.vacioTexto, { color: tema.textoSecundario }]}>
            {es
              ? "No hay productos con existencia que coincidan."
              : "No in-stock products match your search."}
          </Text>
        </View>
      ) : null}
      <View style={estilos.productos}>
        {productos.map((producto) => (
          <Producto
            key={producto.id}
            producto={producto}
            cantidad={
              carrito.find((linea) => linea.id === producto.id)?.cantidad ?? 0
            }
            es={es}
            tema={tema}
            alCambiar={(cambio) => alCambiarCantidad(producto, cambio)}
          />
        ))}
      </View>
    </>
  );
}

function Producto({
  producto,
  cantidad,
  es,
  tema,
  alCambiar,
}: {
  producto: ProductoMovil;
  cantidad: number;
  es: boolean;
  tema: ReturnType<typeof usarTema>;
  alCambiar: (cambio: number) => void;
}) {
  const [fuente, establecerFuente] = useState<ImageSourcePropType>();

  useEffect(() => {
    let activo = true;
    if (!producto.tieneFoto) return;
    const version = producto.fotoActualizadaEn
      ? `?v=${encodeURIComponent(producto.fotoActualizadaEn)}`
      : "";
    void crearFuenteImagenApi(
      `/inventario/productos/${producto.id}/foto${version}`,
    )
      .then((resultado) => {
        if (activo) establecerFuente(resultado);
      })
      .catch(() => {
        if (activo) establecerFuente(undefined);
      });
    return () => {
      activo = false;
    };
  }, [producto.fotoActualizadaEn, producto.id, producto.tieneFoto]);

  return (
    <View
      style={[
        estilos.producto,
        {
          backgroundColor: cantidad ? tema.primarioSuave : tema.panel,
          borderColor: cantidad ? tema.primario : tema.borde,
        },
      ]}
    >
      <View style={estilos.informacionFila}>
        <View
          style={[
            estilos.miniatura,
            { backgroundColor: tema.campoDeshabilitado },
          ]}
        >
          {fuente ? (
            <Image source={fuente} style={estilos.imagen} resizeMode="cover" />
          ) : (
            <Ionicons name="cube-outline" size={24} color={tema.textoTenue} />
          )}
        </View>
        <View style={estilos.expandir}>
          <Text
            style={[estilos.nombre, { color: tema.texto }]}
            numberOfLines={2}
          >
            {producto.nombre}
          </Text>
          <Text
            style={[estilos.detalle, { color: tema.textoSecundario }]}
            numberOfLines={2}
          >
            {producto.marca} · {producto.existencia}{" "}
            {es ? "disponibles" : "available"}
          </Text>
          <Text style={[estilos.precio, { color: tema.primario }]}>
            {dinero.format(Number(producto.precioVenta))}
          </Text>
        </View>
      </View>
      <View style={estilos.cantidad}>
        <Text
          style={[estilos.cantidadEtiqueta, { color: tema.textoSecundario }]}
        >
          {es ? "Cantidad" : "Quantity"}
        </Text>
        <BotonCantidad
          icono="remove"
          etiqueta={
            es ? `Quitar ${producto.nombre}` : `Remove ${producto.nombre}`
          }
          tema={tema}
          deshabilitado={cantidad === 0}
          alPulsar={() => alCambiar(-1)}
        />
        <Text
          accessibilityLabel={`${es ? "Cantidad" : "Quantity"}: ${cantidad}`}
          style={[estilos.numero, { color: tema.texto }]}
        >
          {cantidad}
        </Text>
        <BotonCantidad
          icono="add"
          etiqueta={
            es ? `Agregar ${producto.nombre}` : `Add ${producto.nombre}`
          }
          tema={tema}
          deshabilitado={cantidad >= producto.existencia}
          alPulsar={() => alCambiar(1)}
        />
      </View>
    </View>
  );
}

function BotonCantidad({
  icono,
  etiqueta,
  tema,
  deshabilitado,
  alPulsar,
}: {
  icono: "add" | "remove";
  etiqueta: string;
  tema: ReturnType<typeof usarTema>;
  deshabilitado: boolean;
  alPulsar: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: deshabilitado }}
      disabled={deshabilitado}
      style={({ pressed }) => [
        estilos.botonCantidad,
        { backgroundColor: tema.primarioSuave },
        deshabilitado && { opacity: 0.35 },
        pressed && { opacity: 0.65 },
      ]}
      onPress={alPulsar}
    >
      <Ionicons name={icono} color={tema.primario} size={21} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  productos: { gap: 9, marginTop: 13 },
  producto: {
    minHeight: 142,
    borderWidth: 1,
    borderRadius: radios.tarjeta,
    padding: 11,
    gap: 10,
  },
  informacionFila: { flexDirection: "row", alignItems: "center", gap: 11 },
  miniatura: {
    width: 62,
    height: 70,
    borderRadius: 11,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  imagen: { width: "100%", height: "100%" },
  expandir: { flex: 1, minWidth: 0 },
  nombre: { fontWeight: "800", fontSize: 14, lineHeight: 19 },
  detalle: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  precio: { fontWeight: "900", fontSize: 13, lineHeight: 18, marginTop: 4 },
  cantidad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 7,
  },
  cantidadEtiqueta: { flex: 1, fontSize: 12, fontWeight: "700" },
  botonCantidad: {
    width: tactilMinimo,
    height: tactilMinimo,
    borderRadius: radios.campo,
    alignItems: "center",
    justifyContent: "center",
  },
  numero: {
    minWidth: 20,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
  },
  vacio: { alignItems: "center", gap: 7, paddingVertical: 30 },
  vacioTexto: { fontSize: 13, lineHeight: 19, textAlign: "center" },
});
