import { type FormEvent, useCallback, useEffect, useState } from "react";

import { api, ErrorApi } from "@/lib/api";
import type { Pagina } from "@/lib/tipos";
import type { VentaWeb } from "./tipos";

export function usarVentasWeb() {
  const [respuesta, establecerRespuesta] = useState<Pagina<VentaWeb> | null>(
    null,
  );
  const [pagina, establecerPagina] = useState(1);
  const [buscar, establecerBuscar] = useState("");
  const [modal, establecerModal] = useState(false);
  const [tipo, establecerTipo] = useState("CREDITO");
  const [error, establecerError] = useState("");

  const cargar = useCallback(
    () =>
      api<Pagina<VentaWeb>>(
        `/ventas?pagina=${pagina}&limite=15&buscar=${encodeURIComponent(buscar)}`,
      )
        .then(establecerRespuesta)
        .catch((e) => establecerError(e.message)),
    [pagina, buscar],
  );
  useEffect(() => void cargar(), [cargar]);

  async function crear(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    const cuerpo: Record<string, unknown> = {
      clienteId: formulario.get("clienteId") || null,
      numeroTarjeta: formulario.get("numeroTarjeta") || undefined,
      tipo,
      descuento: Number(formulario.get("descuento") || 0),
      anticipo: Number(formulario.get("anticipo") || 0),
      metodoAnticipo: formulario.get("metodoAnticipo"),
      fechaVenta: new Date().toISOString(),
      items: [
        {
          productoId: formulario.get("productoId"),
          cantidad: Number(formulario.get("cantidad")),
        },
      ],
    };
    if (tipo === "CREDITO" && formulario.get("montoCuota")) {
      cuerpo.plan = {
        periodicidad: formulario.get("periodicidad"),
        montoCuota: Number(formulario.get("montoCuota")),
        primerVencimiento: new Date(
          String(formulario.get("primerVencimiento")),
        ).toISOString(),
      };
    }
    try {
      await api("/ventas", { method: "POST", body: JSON.stringify(cuerpo) });
      establecerModal(false);
      cargar();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    }
  }

  return {
    respuesta,
    pagina,
    buscar,
    modal,
    tipo,
    error,
    establecerPagina,
    establecerBuscar,
    establecerTipo,
    abrirModal: () => establecerModal(true),
    cerrarModal: () => establecerModal(false),
    cargar,
    crear,
  };
}

export type ControlVentasWeb = ReturnType<typeof usarVentasWeb>;
