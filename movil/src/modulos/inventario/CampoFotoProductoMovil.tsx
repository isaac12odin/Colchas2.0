import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colores, type usarTema } from "../../tema";
import { obtenerFotoProducto } from "./fotoProducto";
import type { FotoProductoMovil } from "./tipos";

export function CampoFotoProductoMovil({
  foto,
  fuenteActual,
  tieneFotoActual,
  es,
  tema,
  alCambiar,
  alEliminar,
}: {
  foto: FotoProductoMovil | null;
  fuenteActual?: ImageSourcePropType;
  tieneFotoActual: boolean;
  es: boolean;
  tema: ReturnType<typeof usarTema>;
  alCambiar: (foto: FotoProductoMovil) => void;
  alEliminar: () => void;
}) {
  const [procesando, establecerProcesando] = useState(false);
  const fuente = foto ? { uri: foto.uri } : fuenteActual;

  async function seleccionar(origen: "camara" | "galeria") {
    establecerProcesando(true);
    try {
      const preparada = await obtenerFotoProducto(origen, es);
      if (preparada) alCambiar(preparada);
    } catch (error) {
      Alert.alert(
        es ? "No se pudo preparar la foto" : "Photo could not be prepared",
        error instanceof Error ? error.message : undefined,
      );
    } finally {
      establecerProcesando(false);
    }
  }

  return (
    <View style={estilos.contenedor}>
      <View
        style={[
          estilos.vista,
          { backgroundColor: tema.fondo, borderColor: tema.borde },
        ]}
      >
        {fuente ? (
          <Image source={fuente} style={estilos.imagen} resizeMode="cover" />
        ) : (
          <View style={estilos.sinFoto}>
            <Ionicons name="image-outline" size={32} color={colores.gris} />
            <Text style={estilos.ayuda}>
              {es ? "Foto del producto" : "Product photo"}
            </Text>
          </View>
        )}
        {procesando && (
          <View style={estilos.procesando}>
            <ActivityIndicator color="white" />
            <Text style={estilos.procesandoTexto}>
              {es ? "Optimizando…" : "Optimizing…"}
            </Text>
          </View>
        )}
      </View>
      <View style={estilos.acciones}>
        <BotonFoto
          icono="camera-outline"
          texto={es ? "Tomar foto" : "Camera"}
          deshabilitado={procesando}
          alPresionar={() => void seleccionar("camara")}
          tema={tema}
        />
        <BotonFoto
          icono="images-outline"
          texto={es ? "Galería" : "Gallery"}
          deshabilitado={procesando}
          alPresionar={() => void seleccionar("galeria")}
          tema={tema}
        />
        {(foto || tieneFotoActual) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={es ? "Quitar fotografía" : "Remove photo"}
            disabled={procesando}
            onPress={alEliminar}
            style={estilos.quitar}
          >
            <Ionicons name="trash-outline" size={18} color={colores.rojo} />
          </Pressable>
        )}
      </View>
      <Text style={estilos.nota}>
        {es
          ? "JPEG seguro · Vektra reduce la imagen automáticamente."
          : "Secure JPEG · Vektra automatically reduces the image."}
      </Text>
    </View>
  );
}

function BotonFoto({
  icono,
  texto,
  deshabilitado,
  alPresionar,
  tema,
}: {
  icono: "camera-outline" | "images-outline";
  texto: string;
  deshabilitado: boolean;
  alPresionar: () => void;
  tema: ReturnType<typeof usarTema>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={deshabilitado}
      onPress={alPresionar}
      style={[estilos.botonFoto, { borderColor: tema.borde }]}
    >
      <Ionicons name={icono} size={18} color={colores.azul} />
      <Text style={[estilos.botonFotoTexto, { color: tema.texto }]}>
        {texto}
      </Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: 9 },
  vista: {
    height: 180,
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  imagen: { width: "100%", height: "100%" },
  sinFoto: { flex: 1, alignItems: "center", justifyContent: "center", gap: 5 },
  ayuda: { color: colores.gris, fontSize: 12, fontWeight: "700" },
  procesando: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,.55)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  procesandoTexto: { color: "white", fontWeight: "800", fontSize: 12 },
  acciones: { flexDirection: "row", gap: 8 },
  botonFoto: {
    minHeight: 44,
    flex: 1,
    borderWidth: 1,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  botonFotoTexto: { fontSize: 12, fontWeight: "800" },
  quitar: {
    width: 46,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#fff1f1",
  },
  nota: { color: colores.gris, fontSize: 10 },
});
