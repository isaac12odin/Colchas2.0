"use client";

import Image from "next/image";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { useState } from "react";

import { prepararFotoProducto, type ImagenListaParaApi } from "@/lib/imagenes";

export interface CambioFotoProducto {
  foto?: ImagenListaParaApi;
  eliminarFoto: boolean;
}

export function CampoFotoProducto({
  fotoActual,
  es,
  alCambiar,
}: {
  fotoActual?: string | null;
  es: boolean;
  alCambiar: (cambio: CambioFotoProducto) => void;
}) {
  const [vistaPrevia, establecerVistaPrevia] = useState(fotoActual ?? "");
  const [procesando, establecerProcesando] = useState(false);
  const [error, establecerError] = useState("");

  async function seleccionar(archivo?: File) {
    if (!archivo) return;
    establecerProcesando(true);
    establecerError("");
    try {
      const foto = await prepararFotoProducto(archivo, es);
      establecerVistaPrevia(`data:${foto.mime};base64,${foto.base64}`);
      alCambiar({ foto, eliminarFoto: false });
    } catch (e) {
      establecerError(
        e instanceof Error
          ? e.message
          : es
            ? "Fotografía inválida."
            : "Invalid photo.",
      );
    } finally {
      establecerProcesando(false);
    }
  }

  function quitar() {
    establecerVistaPrevia("");
    establecerError("");
    alCambiar({ foto: undefined, eliminarFoto: Boolean(fotoActual) });
  }

  return (
    <section
      className="sm:col-span-2 rounded-xl border border-dashed bg-slate-50 p-4 dark:bg-slate-950"
      data-capacitacion="inventario.producto.foto"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="grid h-28 w-full shrink-0 place-items-center overflow-hidden rounded-xl bg-white text-slate-400 shadow-sm dark:bg-slate-900 sm:w-32">
          {vistaPrevia ? (
            <Image
              unoptimized
              src={vistaPrevia}
              alt={es ? "Vista previa del producto" : "Product preview"}
              width={160}
              height={140}
              className="h-full w-full object-cover"
            />
          ) : (
            <Camera size={34} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <strong className="block text-sm">
            {es ? "Fotografía del producto" : "Product photo"}
          </strong>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {es
              ? "Toma una foto o elige una existente. Vektra la reduce automáticamente y acepta JPEG, PNG o WebP."
              : "Take a photo or choose an existing one. Vektra resizes it automatically and accepts JPEG, PNG, or WebP."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <label
              className="boton-secundario cursor-pointer"
              data-capacitacion="inventario.producto.foto.abrir-selector"
            >
              <ImagePlus size={17} />
              {procesando
                ? es
                  ? "Preparando…"
                  : "Preparing…"
                : vistaPrevia
                  ? es
                    ? "Cambiar foto"
                    : "Change photo"
                  : es
                    ? "Agregar foto"
                    : "Add photo"}
              <input
                className="sr-only"
                type="file"
                data-capacitacion="inventario.producto.foto.abrir-selector"
                accept="image/jpeg,image/png,image/webp"
                aria-label={es ? "Fotografía del producto" : "Product photo"}
                disabled={procesando}
                onChange={(evento) =>
                  void seleccionar(evento.target.files?.[0])
                }
              />
            </label>
            {vistaPrevia && (
              <button
                type="button"
                className="boton-secundario text-red-600"
                onClick={quitar}
                data-capacitacion="inventario.producto.foto.quitar"
              >
                <Trash2 size={17} /> {es ? "Quitar" : "Remove"}
              </button>
            )}
          </div>
          {error && (
            <p role="alert" className="mt-2 text-xs font-medium text-red-600">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
