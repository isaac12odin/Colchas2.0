import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";
import { z } from "zod";

import { ErrorAplicacion } from "./errores.js";

export const esquemaImagen = z.object({
  nombre: z.string().trim().min(1).max(180),
  mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
  base64: z.string().min(20).max(3_500_000),
});

export type ImagenEntrada = z.infer<typeof esquemaImagen>;

export interface ImagenProcesada {
  nombre: string;
  mime: "image/webp";
  contenido: Buffer;
  hash: string;
  bytes: number;
  ancho: number;
  alto: number;
}

export interface ImagenGuardada extends Omit<ImagenProcesada, "contenido"> {
  ruta: string;
}

interface OpcionesImagen {
  codigo: string;
  limiteBytes?: number;
  nombreVisible?: string;
  dimensionMaxima?: number;
  objetivoBytes?: number;
}

const FORMATOS_ADMITIDOS = new Set(["jpeg", "png", "webp"]);
const RAIZ_IMAGENES = path.resolve(
  process.env.IMAGE_STORAGE_DIR ?? path.join(process.cwd(), "uploads"),
);

function errorImagen(opciones: OpcionesImagen, mensaje: string) {
  return new ErrorAplicacion(opciones.codigo, mensaje, 422);
}

function decodificarBase64(datos: ImagenEntrada, opciones: OpcionesImagen) {
  const limiteBytes = opciones.limiteBytes ?? 2_500_000;
  const nombreVisible = opciones.nombreVisible ?? "La fotografía";
  const contenido = Buffer.from(datos.base64, "base64");
  if (contenido.length === 0 || contenido.length > limiteBytes)
    throw errorImagen(
      opciones,
      `${nombreVisible} no puede superar ${(limiteBytes / 1_000_000).toFixed(1)} MB.`,
    );

  const firma = contenido.subarray(0, 12).toString("hex");
  const valida =
    (datos.mime === "image/jpeg" && firma.startsWith("ffd8ff")) ||
    (datos.mime === "image/png" && firma.startsWith("89504e470d0a1a0a")) ||
    (datos.mime === "image/webp" &&
      contenido.subarray(0, 4).toString() === "RIFF" &&
      contenido.subarray(8, 12).toString() === "WEBP");
  if (!valida)
    throw errorImagen(
      opciones,
      `${nombreVisible} debe ser una imagen JPEG, PNG o WebP válida.`,
    );
  return contenido;
}

async function convertirWebp(
  contenido: Buffer,
  dimensionMaxima: number,
  calidad: number,
) {
  return sharp(contenido, {
    failOn: "error",
    limitInputPixels: 40_000_000,
    sequentialRead: true,
  })
    .rotate()
    .resize({
      width: dimensionMaxima,
      height: dimensionMaxima,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toColourspace("srgb")
    .webp({
      quality: calidad,
      alphaQuality: 80,
      effort: 5,
      smartSubsample: true,
    })
    .toBuffer({ resolveWithObject: true });
}

export async function optimizarContenidoImagen(
  contenido: Buffer,
  nombre: string,
  opciones: OpcionesImagen,
): Promise<ImagenProcesada> {
  const nombreVisible = opciones.nombreVisible ?? "La fotografía";
  const dimensionMaxima = opciones.dimensionMaxima ?? 1_280;
  const objetivoBytes = opciones.objetivoBytes ?? 240_000;
  try {
    const metadatos = await sharp(contenido, {
      failOn: "error",
      limitInputPixels: 40_000_000,
    }).metadata();
    if (!metadatos.format || !FORMATOS_ADMITIDOS.has(metadatos.format))
      throw errorImagen(
        opciones,
        `${nombreVisible} debe ser una imagen JPEG, PNG o WebP válida.`,
      );

    let resultado: Awaited<ReturnType<typeof convertirWebp>> | null = null;
    for (const calidad of [78, 72, 66]) {
      resultado = await convertirWebp(contenido, dimensionMaxima, calidad);
      if (resultado.info.size <= objetivoBytes) break;
    }
    if (!resultado?.info.width || !resultado.info.height)
      throw errorImagen(opciones, `${nombreVisible} no pudo procesarse.`);

    return {
      nombre,
      mime: "image/webp",
      contenido: resultado.data,
      hash: createHash("sha256").update(resultado.data).digest("hex"),
      bytes: resultado.info.size,
      ancho: resultado.info.width,
      alto: resultado.info.height,
    };
  } catch (error) {
    if (error instanceof ErrorAplicacion) throw error;
    throw errorImagen(
      opciones,
      `${nombreVisible} está dañada o usa un formato no admitido.`,
    );
  }
}

/** Valida y convierte cualquier entrada admitida a WebP sin metadatos. */
export async function procesarImagen(
  datos: ImagenEntrada,
  opciones: OpcionesImagen,
) {
  const contenido = decodificarBase64(datos, opciones);
  return optimizarContenidoImagen(contenido, datos.nombre, opciones);
}

function rutaAbsoluta(rutaRelativa: string) {
  if (!rutaRelativa || path.isAbsolute(rutaRelativa))
    throw new Error("Ruta de imagen inválida.");
  const absoluta = path.resolve(RAIZ_IMAGENES, rutaRelativa);
  if (!absoluta.startsWith(`${RAIZ_IMAGENES}${path.sep}`))
    throw new Error("Ruta de imagen fuera del almacenamiento permitido.");
  return absoluta;
}

export async function guardarImagen(
  imagen: ImagenProcesada,
  categoria: "productos" | "devoluciones",
): Promise<ImagenGuardada> {
  const ruta = path.posix.join(categoria, `${randomUUID()}.webp`);
  const destino = rutaAbsoluta(ruta);
  const temporal = `${destino}.${randomUUID()}.tmp`;
  await mkdir(path.dirname(destino), { recursive: true, mode: 0o700 });
  try {
    await writeFile(temporal, imagen.contenido, { flag: "wx", mode: 0o600 });
    await rename(temporal, destino);
  } catch (error) {
    await unlink(temporal).catch(() => undefined);
    throw error;
  }
  const { contenido: _contenido, ...metadatos } = imagen;
  return { ...metadatos, ruta };
}

export async function leerImagen(ruta: string) {
  return readFile(rutaAbsoluta(ruta));
}

export async function imagenExiste(ruta: string) {
  try {
    const datos = await stat(rutaAbsoluta(ruta));
    return datos.isFile();
  } catch {
    return false;
  }
}

export async function eliminarImagen(ruta: string | null | undefined) {
  if (!ruta) return;
  try {
    await unlink(rutaAbsoluta(ruta));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
