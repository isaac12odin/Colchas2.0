"use client";

import { useEffect } from "react";

export default function ErrorGlobal({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Fallo global en Vektra", { digest: error.digest });
  }, [error.digest]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 20,
          boxSizing: "border-box",
          background: "#f4f7fb",
          color: "#161616",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <main style={{ maxWidth: 520, textAlign: "center" }} role="alert">
          <h1>Vektra necesita volver a cargar</h1>
          <p style={{ color: "#525252", lineHeight: 1.6 }}>
            Ocurrió un fallo inesperado. Reintenta; las operaciones que ya
            mostraron un folio permanecen registradas.
          </p>
          {error.digest && (
            <p style={{ color: "#525252", fontFamily: "monospace" }}>
              Referencia: {error.digest}
            </p>
          )}
          <button
            onClick={() => retry()}
            style={{
              minHeight: 44,
              border: 0,
              borderRadius: 8,
              padding: "10px 18px",
              background: "#0f62fe",
              color: "white",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Volver a cargar
          </button>
        </main>
      </body>
    </html>
  );
}
