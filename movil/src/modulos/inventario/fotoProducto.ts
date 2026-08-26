import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import type { FotoProductoMovil } from "./tipos";

const LADO_MAXIMO = 1_200;
const LIMITE_BYTES = 2_500_000;

function bytesBase64(base64: string) {
  return Math.ceil((base64.length * 3) / 4);
}

async function reducir(
  uri: string,
  ancho: number,
  alto: number,
  calidad: number,
) {
  const mayor = Math.max(ancho, alto);
  const escala = Math.min(1, LADO_MAXIMO / mayor);
  const acciones =
    escala < 1
      ? [
          {
            resize:
              ancho >= alto
                ? { width: Math.round(ancho * escala) }
                : { height: Math.round(alto * escala) },
          },
        ]
      : [];
  return manipulateAsync(uri, acciones, {
    compress: calidad,
    format: SaveFormat.JPEG,
    base64: true,
  });
}

async function prepararActivo(
  activo: ImagePicker.ImagePickerAsset,
): Promise<FotoProductoMovil> {
  let resultado = await reducir(activo.uri, activo.width, activo.height, 0.78);
  if (resultado.base64 && bytesBase64(resultado.base64) > LIMITE_BYTES)
    resultado = await reducir(activo.uri, activo.width, activo.height, 0.56);
  if (!resultado.base64 || bytesBase64(resultado.base64) > LIMITE_BYTES)
    throw new Error("No fue posible reducir la fotografía a 2.5 MB.");
  return {
    uri: resultado.uri,
    nombre: `${(activo.fileName ?? "producto").replace(/\.[^.]+$/, "")}.jpg`,
    mime: "image/jpeg",
    base64: resultado.base64,
  };
}

const opciones: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: true,
  aspect: [4, 3],
  quality: 0.9,
};

export async function obtenerFotoProducto(
  origen: "camara" | "galeria",
  es = true,
) {
  if (origen === "camara") {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted)
      throw new Error(
        es
          ? "Autoriza la cámara para fotografiar el producto."
          : "Allow camera access to photograph the product.",
      );
  }
  if (origen === "galeria") {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted)
      throw new Error(
        es
          ? "Autoriza el acceso a tus fotos para elegir la imagen del producto."
          : "Allow photo access to select the product image.",
      );
  }
  const resultado =
    origen === "camara"
      ? await ImagePicker.launchCameraAsync(opciones)
      : await ImagePicker.launchImageLibraryAsync(opciones);
  if (resultado.canceled || !resultado.assets[0]) return null;
  return prepararActivo(resultado.assets[0]);
}
