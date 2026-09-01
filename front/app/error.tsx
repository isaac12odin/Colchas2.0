"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorAplicacion({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // El detalle puede contener información operativa. Sólo se registra el
    // identificador seguro que permite correlacionarlo con el servidor.
    console.error("Fallo de render en Vektra", { digest: error.digest });
  }, [error.digest]);

  return (
    <main className="grid min-h-screen place-items-center p-5">
      <section
        className="panel w-full max-w-lg p-6 text-center sm:p-8"
        role="alert"
      >
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          <AlertTriangle aria-hidden size={24} />
        </div>
        <h1 className="mt-4 text-xl font-semibold">
          No pudimos mostrar esta pantalla
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Tus movimientos confirmados no se perdieron. Intenta cargar la
          pantalla nuevamente; si continúa, comparte la referencia con soporte.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-slate-500">
            Referencia: {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <button className="boton-primario" onClick={() => retry()}>
            <RefreshCw aria-hidden size={17} /> Reintentar
          </button>
          <Link className="boton-secundario" href="/inicio">
            Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
