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

import { usarDisenoResponsivo } from "../../componentes/ui";
import { radios, tactilMinimo, type usarTema } from "../../tema";
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
  const diseno = usarDisenoResponsivo();
  const [procesando, establecerProcesando] = useState(false);
  const fuente = foto ? { uri: foto.uri } : fuenteActual;
  const apilar = diseno.compacto || diseno.fontScale > 1.25;

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
            <Ionicons name="image-outline" size={34} color={tema.textoTenue} />
            <Text style={[estilos.ayuda, { color: tema.textoSecundario }]}>
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
      <View style={[estilos.acciones, apilar && estilos.accionesApiladas]}>
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
            style={[
              estilos.quitar,
              apilar && estilos.quitarApilado,
              { backgroundColor: tema.peligroSuave },
            ]}
          >
            <Ionicons name="trash-outline" size={20} color={tema.peligro} />
            {apilar ? (
              <Text style={[estilos.quitarTexto, { color: tema.peligro }]}>
                {es ? "Quitar foto" : "Remove photo"}
              </Text>
            ) : null}
          </Pressable>
        )}
      </View>
      <Text style={[estilos.nota, { color: tema.textoSecundario }]}>
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
      style={({ pressed }) => [
        estilos.botonFoto,
        { borderColor: tema.bordeFuerte, opacity: pressed ? 0.72 : 1 },
      ]}
    >
      <Ionicons name={icono} size={20} color={tema.primario} />
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
  ayuda: { fontSize: 13, lineHeight: 18, fontWeight: "700" },
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
  accionesApiladas: { flexDirection: "column" },
  botonFoto: {
    minHeight: tactilMinimo,
    flex: 1,
    borderWidth: 1,
    borderRadius: radios.boton,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  botonFotoTexto: { fontSize: 13, lineHeight: 18, fontWeight: "800" },
  quitar: {
    width: tactilMinimo,
    minHeight: tactilMinimo,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radios.boton,
  },
  quitarApilado: { width: "100%", flexDirection: "row", gap: 7 },
  quitarTexto: { fontSize: 13, lineHeight: 18, fontWeight: "800" },
  nota: { fontSize: 12, lineHeight: 17 },
});
