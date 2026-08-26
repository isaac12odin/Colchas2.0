export interface ImagenListaParaApi {
  nombre: string;
  mime: "image/webp";
  base64: string;
}

const LIMITE_ENTRADA = 12_000_000;
const LIMITE_SALIDA = 2_500_000;
const LADO_MAXIMO = 1_200;

function lienzoAWebp(
  lienzo: HTMLCanvasElement,
  calidad: number,
): Promise<Blob> {
  return new Promise((resolver, rechazar) =>
    lienzo.toBlob(
      (resultado) =>
        resultado
          ? resolver(resultado)
          : rechazar(new Error("No se pudo preparar la fotografía.")),
      "image/webp",
      calidad,
    ),
  );
}

function blobABase64(blob: Blob): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onerror = () =>
      rechazar(new Error("No se pudo leer la fotografía."));
    lector.onload = () =>
      resolver(String(lector.result ?? "").split(",")[1] ?? "");
    lector.readAsDataURL(blob);
  });
}

/** Reduce automáticamente una foto de cámara antes de enviarla a la API. */
export async function prepararFotoProducto(
  archivo: File,
  es = true,
): Promise<ImagenListaParaApi> {
  if (
    !(["image/jpeg", "image/png", "image/webp"] as string[]).includes(
      archivo.type,
    )
  )
    throw new Error(
      es
        ? "Usa una fotografía JPEG, PNG o WebP."
        : "Use a JPEG, PNG, or WebP photo.",
    );
  if (archivo.size > LIMITE_ENTRADA)
    throw new Error(
      es
        ? "La fotografía original no puede superar 12 MB."
        : "The original photo cannot exceed 12 MB.",
    );

  const imagen = await createImageBitmap(archivo);
  try {
    const escala = Math.min(
      1,
      LADO_MAXIMO / Math.max(imagen.width, imagen.height),
    );
    const ancho = Math.max(1, Math.round(imagen.width * escala));
    const alto = Math.max(1, Math.round(imagen.height * escala));
    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;
    const contexto = lienzo.getContext("2d");
    if (!contexto)
      throw new Error(
        es
          ? "El navegador no pudo procesar la fotografía."
          : "The browser could not process the photo.",
      );
    contexto.drawImage(imagen, 0, 0, ancho, alto);

    let resultado = await lienzoAWebp(lienzo, 0.82);
    if (resultado.size > LIMITE_SALIDA)
      resultado = await lienzoAWebp(lienzo, 0.64);
    if (resultado.size > LIMITE_SALIDA)
      throw new Error(
        es
          ? "No fue posible reducir la fotografía a 2.5 MB."
          : "The photo could not be reduced to 2.5 MB.",
      );

    return {
      nombre: `${archivo.name.replace(/\.[^.]+$/, "") || "producto"}.webp`,
      mime: "image/webp",
      base64: await blobABase64(resultado),
    };
  } finally {
    imagen.close();
  }
}
