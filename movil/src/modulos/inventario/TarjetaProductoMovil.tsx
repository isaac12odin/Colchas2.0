import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Image,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { crearFuenteImagenApi } from "../../api";
import { colores, type usarTema } from "../../tema";
import type { ProductoInventarioMovil } from "./tipos";

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function TarjetaProductoMovil({
  producto,
  tema,
  es,
  alEditar,
}: {
  producto: ProductoInventarioMovil;
  tema: ReturnType<typeof usarTema>;
  es: boolean;
  alEditar: () => void;
}) {
  const [fuente, establecerFuente] = useState<ImageSourcePropType>();
  const bajo = producto.existencia <= producto.existenciaMinima;

  useEffect(() => {
    let activa = true;
    if (!producto.tieneFoto) {
      establecerFuente(undefined);
      return;
    }
    const version = producto.fotoActualizadaEn
      ? `?v=${encodeURIComponent(producto.fotoActualizadaEn)}`
      : "";
    void crearFuenteImagenApi(
      `/inventario/productos/${producto.id}/foto${version}`,
    ).then((nueva) => {
      if (activa) establecerFuente(nueva);
    });
    return () => {
      activa = false;
    };
  }, [producto.fotoActualizadaEn, producto.id, producto.tieneFoto]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${es ? "Editar" : "Edit"} ${producto.nombre}`}
      onPress={alEditar}
      style={[
        estilos.tarjeta,
        { backgroundColor: tema.panel, borderColor: tema.borde },
      ]}
    >
      <View style={[estilos.foto, { backgroundColor: tema.fondo }]}>
        {fuente ? (
          <Image source={fuente} style={estilos.imagen} resizeMode="cover" />
        ) : (
          <Ionicons name="cube-outline" size={25} color={colores.gris} />
        )}
      </View>
      <View style={estilos.informacion}>
        <Text style={[estilos.nombre, { color: tema.texto }]} numberOfLines={1}>
          {producto.nombre}
        </Text>
        <Text style={estilos.detalle} numberOfLines={1}>
          {producto.sku} · {producto.marca}
        </Text>
        <Text style={[estilos.precio, { color: tema.texto }]}>
          {dinero.format(Number(producto.precioVenta))}
        </Text>
      </View>
      <View style={estilos.estado}>
        <View
          style={[estilos.stock, bajo ? estilos.stockBajo : estilos.stockBien]}
        >
          <Text style={[estilos.stockTexto, bajo && estilos.stockTextoBajo]}>
            {producto.existencia} {es ? "pzas." : "pcs."}
          </Text>
        </View>
        <Ionicons name="pencil-outline" size={18} color={colores.azul} />
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    minHeight: 91,
    borderWidth: 1,
    borderRadius: 15,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  foto: {
    width: 70,
    height: 70,
    borderRadius: 11,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  imagen: { width: "100%", height: "100%" },
  informacion: { flex: 1, minWidth: 0 },
  nombre: { fontSize: 14, fontWeight: "900" },
  detalle: { color: colores.gris, fontSize: 11, marginTop: 3 },
  precio: { fontSize: 12, fontWeight: "800", marginTop: 7 },
  estado: {
    minHeight: 68,
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  stock: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  stockBien: { backgroundColor: "#defbe6" },
  stockBajo: { backgroundColor: "#fff1f1" },
  stockTexto: { color: "#0e6027", fontSize: 10, fontWeight: "900" },
  stockTextoBajo: { color: colores.rojo },
});
