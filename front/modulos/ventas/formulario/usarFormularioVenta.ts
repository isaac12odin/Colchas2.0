import { useState, type FormEvent } from "react";

import type { ClientePedido, ProductoPedido } from "@/modulos/pedidos/tipos";
import type {
  MetodoPagoWeb,
  NuevaVentaWeb,
  ResultadoVentaWeb,
  TipoVentaWeb,
} from "../tipos";
import {
  fechaSiguienteSemana,
  subtotalLineas,
  type LineaVentaFormulario,
} from "./utilidades";

type Periodicidad = "SEMANAL" | "QUINCENAL" | "MENSUAL";

export function usarFormularioVenta({
  puedeAutorizarDescuento,
  alEnviar,
  alNuevaVenta,
}: {
  puedeAutorizarDescuento: boolean;
  alEnviar: (venta: NuevaVentaWeb) => Promise<ResultadoVentaWeb>;
  alNuevaVenta: () => void;
}) {
  const [paso, establecerPaso] = useState(1);
  const [idOperacion, establecerIdOperacion] = useState(
    () => `web-${crypto.randomUUID()}`,
  );
  const [esCredito, establecerEsCredito] = useState<boolean | null>(null);
  const [cliente, establecerCliente] = useState<ClientePedido | null>(null);
  const [productoElegido, establecerProductoElegido] =
    useState<ProductoPedido | null>(null);
  const [lineas, establecerLineas] = useState<LineaVentaFormulario[]>([]);
  const [descuento, establecerDescuento] = useState("0");
  const [anticipo, establecerAnticipo] = useState("0");
  const [metodo, establecerMetodo] = useState<MetodoPagoWeb>("EFECTIVO");
  const [numeroTarjeta, establecerNumeroTarjeta] = useState("");
  const [periodicidad, establecerPeriodicidad] =
    useState<Periodicidad>("SEMANAL");
  const [montoCuota, establecerMontoCuota] = useState("");
  const [primerVencimiento, establecerPrimerVencimiento] =
    useState(fechaSiguienteSemana);

  const subtotal = subtotalLineas(lineas);
  const total = Math.max(0, subtotal - Number(descuento || 0));
  const financiado = esCredito ? Math.max(0, total - Number(anticipo || 0)) : 0;
  const saldoAnterior = Number(cliente?.saldo?.saldoActual ?? 0);
  const acuerdoVigente =
    saldoAnterior > 0 && cliente?.acuerdoPago?.activo
      ? cliente.acuerdoPago
      : null;

  function elegirTipo(credito: boolean) {
    establecerEsCredito(credito);
    if (!credito) establecerAnticipo("0");
    establecerPaso(2);
  }

  function agregarProducto(producto: ProductoPedido | null) {
    establecerProductoElegido(null);
    if (!producto) return;
    establecerLineas((actuales) => {
      const existente = actuales.some(
        (linea) => linea.producto.id === producto.id,
      );
      if (!existente) return [...actuales, { producto, cantidad: 1 }];
      return actuales.map((linea) =>
        linea.producto.id === producto.id
          ? {
              ...linea,
              cantidad: Math.min(linea.cantidad + 1, producto.existencia),
            }
          : linea,
      );
    });
  }

  function cambiarCantidad(productoId: string, cambio: number) {
    establecerLineas((actuales) =>
      actuales
        .map((linea) =>
          linea.producto.id === productoId
            ? {
                ...linea,
                cantidad: Math.min(
                  linea.producto.existencia,
                  Math.max(0, linea.cantidad + cambio),
                ),
              }
            : linea,
        )
        .filter((linea) => linea.cantidad > 0),
    );
  }

  function irAlResumen() {
    if (esCredito && cliente) {
      establecerNumeroTarjeta(cliente.numeroTarjeta ?? "");
      if (acuerdoVigente) {
        establecerPeriodicidad(acuerdoVigente.periodicidad);
        establecerMontoCuota(String(acuerdoVigente.montoPeriodico));
      } else if (!montoCuota) {
        establecerMontoCuota(String(Math.max(1, Math.ceil(total / 10))));
      }
    }
    establecerPaso(3);
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (
      paso !== 3 ||
      esCredito === null ||
      lineas.length === 0 ||
      (esCredito && !cliente) ||
      Number(anticipo || 0) > total ||
      (financiado > 0 &&
        (numeroTarjeta.trim().length < 3 || Number(montoCuota) <= 0))
    )
      return;
    const tipo: TipoVentaWeb = esCredito
      ? "CREDITO"
      : cliente
        ? "CONTADO"
        : "PUBLICO";
    await alEnviar({
      idOperacionMovil: idOperacion,
      clienteId: cliente?.id ?? null,
      tipo,
      descuento: puedeAutorizarDescuento ? Number(descuento || 0) : 0,
      anticipo: esCredito ? Number(anticipo || 0) : 0,
      metodoAnticipo: metodo,
      fechaVenta: new Date().toISOString(),
      items: lineas.map((linea) => ({
        productoId: linea.producto.id,
        cantidad: linea.cantidad,
      })),
      ...(esCredito && financiado > 0
        ? {
            numeroTarjeta: numeroTarjeta.trim(),
            plan: {
              periodicidad,
              montoCuota: Number(montoCuota),
              primerVencimiento: new Date(
                `${primerVencimiento}T12:00:00`,
              ).toISOString(),
            },
          }
        : {}),
    }).catch(() => undefined);
  }

  function reiniciar() {
    establecerPaso(1);
    establecerIdOperacion(`web-${crypto.randomUUID()}`);
    establecerEsCredito(null);
    establecerCliente(null);
    establecerProductoElegido(null);
    establecerLineas([]);
    establecerDescuento("0");
    establecerAnticipo("0");
    establecerMetodo("EFECTIVO");
    establecerNumeroTarjeta("");
    establecerPeriodicidad("SEMANAL");
    establecerMontoCuota("");
    establecerPrimerVencimiento(fechaSiguienteSemana());
    alNuevaVenta();
  }

  return {
    paso,
    esCredito: Boolean(esCredito),
    cliente,
    productoElegido,
    lineas,
    subtotal,
    total,
    financiado,
    saldoAnterior,
    acuerdoVigente,
    puedeContinuar: lineas.length > 0 && (!esCredito || Boolean(cliente)),
    pagoValido:
      !esCredito ||
      (Number(anticipo || 0) <= total &&
        (financiado === 0 ||
          (numeroTarjeta.trim().length >= 3 && Number(montoCuota) > 0))),
    valores: {
      descuento,
      anticipo,
      metodo,
      numeroTarjeta,
      periodicidad,
      montoCuota,
      primerVencimiento,
    },
    cambiar: {
      descuento: establecerDescuento,
      anticipo: establecerAnticipo,
      metodo: establecerMetodo,
      numeroTarjeta: establecerNumeroTarjeta,
      periodicidad: establecerPeriodicidad,
      montoCuota: establecerMontoCuota,
      primerVencimiento: establecerPrimerVencimiento,
    },
    elegirTipo,
    establecerCliente,
    agregarProducto,
    cambiarCantidad,
    irAlResumen,
    irAlTipo: () => establecerPaso(1),
    irAProductos: () => establecerPaso(2),
    enviar,
    reiniciar,
  };
}
