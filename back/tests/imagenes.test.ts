import { describe, expect, it } from "vitest";

import { procesarImagen } from "../src/compartido/imagenes.js";
import { ErrorAplicacion } from "../src/compartido/errores.js";

const pngUnPixel =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

describe("validación segura de imágenes", () => {
  it("acepta una imagen real, elimina el formato original y genera WebP", async () => {
    const resultado = await procesarImagen(
      { nombre: "producto.png", mime: "image/png", base64: pngUnPixel },
      { codigo: "FOTO_INVALIDA" },
    );
    expect(resultado.mime).toBe("image/webp");
    expect(resultado.contenido.subarray(0, 4).toString()).toBe("RIFF");
    expect(resultado.contenido.subarray(8, 12).toString()).toBe("WEBP");
    expect(resultado.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(resultado.bytes).toBe(resultado.contenido.length);
    expect(resultado.ancho).toBe(1);
    expect(resultado.alto).toBe(1);
  });

  it("rechaza contenido ejecutable aunque declare MIME de imagen", async () => {
    await expect(
      procesarImagen(
        {
          nombre: "falsa.png",
          mime: "image/png",
          base64: Buffer.from("<script>alert(1)</script>").toString("base64"),
        },
        { codigo: "FOTO_INVALIDA" },
      ),
    ).rejects.toThrowError(ErrorAplicacion);
  });

  it("rechaza archivos que exceden el límite configurado", async () => {
    await expect(
      procesarImagen(
        {
          nombre: "grande.png",
          mime: "image/png",
          base64: Buffer.concat([
            Buffer.from("89504e470d0a1a0a", "hex"),
            Buffer.alloc(128),
          ]).toString("base64"),
        },
        { codigo: "FOTO_INVALIDA", limiteBytes: 32 },
      ),
    ).rejects.toThrow(/no puede superar/);
  });
});
