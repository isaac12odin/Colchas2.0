import { useCallback, useEffect, useState } from "react";

import { api, ErrorApi } from "@/lib/api";
import { emitirSaldoActualizado } from "@/lib/eventosOperacion";
import { usarDatosVivos } from "@/lib/usarDatosVivos";
import type { Pagina } from "@/lib/tipos";
import type { NuevaVentaWeb, ResultadoVentaWeb, VentaWeb } from "./tipos";

export function usarVentasWeb() {
  const [respuesta, establecerRespuesta] = useState<Pagina<VentaWeb> | null>(
    null,
  );
  const [pagina, establecerPagina] = useState(1);
  const [buscar, establecerBuscar] = useState("");
  const [consulta, establecerConsulta] = useState("");
  const [modal, establecerModal] = useState(false);
  const [error, establecerError] = useState("");
  const [guardando, establecerGuardando] = useState(false);
  const [resultado, establecerResultado] = useState<ResultadoVentaWeb | null>(
    null,
  );

  const cargar = useCallback(
    () =>
      api<Pagina<VentaWeb>>(
        `/ventas?pagina=${pagina}&limite=15&buscar=${encodeURIComponent(consulta)}`,
      )
        .then(establecerRespuesta)
        .catch((e) => establecerError(e.message)),
    [pagina, consulta],
  );
  useEffect(() => void cargar(), [cargar]);
  useEffect(() => {
    const espera = window.setTimeout(() => {
      const siguiente = buscar.trim();
      if (siguiente === consulta) return;
      establecerPagina(1);
      establecerConsulta(siguiente);
    }, 350);
    return () => window.clearTimeout(espera);
  }, [buscar, consulta]);
  usarDatosVivos(cargar);

  async function crear(cuerpo: NuevaVentaWeb) {
    establecerGuardando(true);
    establecerError("");
    try {
      const venta = await api<ResultadoVentaWeb>("/ventas", {
        method: "POST",
        body: JSON.stringify(cuerpo),
      });
      establecerResultado(venta);
      if (venta.resumenSaldo)
        emitirSaldoActualizado({
          clienteId: venta.resumenSaldo.clienteId,
          saldoNuevo: venta.resumenSaldo.saldoNuevo,
          origen: "VENTA",
        });
      await cargar();
      return venta;
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
      throw e;
    } finally {
      establecerGuardando(false);
    }
  }

  return {
    respuesta,
    pagina,
    buscar,
    modal,
    error,
    guardando,
    resultado,
    establecerPagina,
    establecerBuscar,
    aplicarBusqueda: () => {
      establecerPagina(1);
      establecerConsulta(buscar.trim());
    },
    limpiarBusqueda: () => {
      establecerBuscar("");
      establecerConsulta("");
      establecerPagina(1);
    },
    abrirModal: () => {
      establecerResultado(null);
      establecerError("");
      establecerModal(true);
    },
    cerrarModal: () => {
      establecerModal(false);
      establecerResultado(null);
    },
    reiniciarVenta: () => establecerResultado(null),
    cargar,
    crear,
  };
}

export type ControlVentasWeb = ReturnType<typeof usarVentasWeb>;
