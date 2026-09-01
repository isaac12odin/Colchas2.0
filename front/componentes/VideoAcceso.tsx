"use client";

import { useEffect, useState } from "react";

interface ConexionConAhorro extends EventTarget {
  saveData?: boolean;
}

export function VideoAcceso() {
  const [reproducir, establecerReproducir] = useState(false);

  useEffect(() => {
    const escritorio = window.matchMedia("(min-width: 1024px)");
    const movimientoReducido = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const conexion = (
      navigator as Navigator & { connection?: ConexionConAhorro }
    ).connection;
    const actualizar = () =>
      establecerReproducir(
        escritorio.matches &&
          !movimientoReducido.matches &&
          !Boolean(conexion?.saveData),
      );
    actualizar();
    escritorio.addEventListener("change", actualizar);
    movimientoReducido.addEventListener("change", actualizar);
    conexion?.addEventListener("change", actualizar);
    return () => {
      escritorio.removeEventListener("change", actualizar);
      movimientoReducido.removeEventListener("change", actualizar);
      conexion?.removeEventListener("change", actualizar);
    };
  }, []);

  if (!reproducir)
    return (
      <div
        className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-950 to-blue-800"
        aria-hidden="true"
      />
    );

  return (
    <video
      className="absolute inset-0 h-full w-full object-cover"
      src="/brand/vektra-motion.mp4"
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
    />
  );
}
