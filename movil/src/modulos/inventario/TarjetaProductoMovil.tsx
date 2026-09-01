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
import { usarDisenoResponsivo } from "../../componentes/ui";
import { type usarTema } from "../../tema";
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
  const diseno = usarDisenoResponsivo();
  const [fuente, establecerFuente] = useState<ImageSourcePropType>();
  const bajo = producto.existencia <= producto.existenciaMinima;
  const apilar = diseno.compacto || diseno.fontScale > 1.25;

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
        apilar && estilos.tarjetaApilada,
        { backgroundColor: tema.panel, borderColor: tema.borde },
      ]}
    >
      <View
        style={[
          estilos.foto,
          apilar && estilos.fotoApilada,
          { backgroundColor: tema.campoDeshabilitado },
        ]}
      >
        {fuente ? (
          <Image source={fuente} style={estilos.imagen} resizeMode="cover" />
        ) : (
          <Ionicons name="cube-outline" size={28} color={tema.textoTenue} />
        )}
      </View>
      <View style={estilos.informacion}>
        <Text style={[estilos.nombre, { color: tema.texto }]} numberOfLines={1}>
          {producto.nombre}
        </Text>
        <Text
          style={[estilos.detalle, { color: tema.textoSecundario }]}
          numberOfLines={apilar ? 2 : 1}
        >
          {producto.sku} · {producto.marca}
        </Text>
        <Text style={[estilos.precio, { color: tema.texto }]}>
          {dinero.format(Number(producto.precioVenta))}
        </Text>
      </View>
      <View style={[estilos.estado, apilar && estilos.estadoApilado]}>
        <View
          style={[
            estilos.stock,
            {
              backgroundColor: bajo ? tema.peligroSuave : tema.exitoSuave,
            },
          ]}
        >
          <Text
            style={[
              estilos.stockTexto,
              { color: bajo ? tema.peligro : tema.exito },
            ]}
          >
            {producto.existencia} {es ? "pzas." : "pcs."}
          </Text>
        </View>
        <Ionicons name="pencil-outline" size={20} color={tema.primario} />
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: 15,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  tarjetaApilada: { flexDirection: "column", alignItems: "stretch" },
  foto: {
    width: 70,
    height: 70,
    borderRadius: 11,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  fotoApilada: { width: "100%", height: 150 },
  imagen: { width: "100%", height: "100%" },
  informacion: { flex: 1, minWidth: 0 },
  nombre: { fontSize: 15, lineHeight: 20, fontWeight: "900" },
  detalle: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  precio: { fontSize: 14, lineHeight: 19, fontWeight: "800", marginTop: 7 },
  estado: {
    minHeight: 68,
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  estadoApilado: { minHeight: 0, flexDirection: "row", alignItems: "center" },
  stock: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  stockTexto: { fontSize: 12, lineHeight: 16, fontWeight: "900" },
});
