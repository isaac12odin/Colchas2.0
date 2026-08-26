import { ChevronLeft } from "lucide-react";

import type { MetodoPagoWeb } from "../tipos";
import { CamposCobroVenta } from "./CamposCobroVenta";
import { ResumenCobroVenta } from "./ResumenCobroVenta";

type Periodicidad = "SEMANAL" | "QUINCENAL" | "MENSUAL";

interface ValoresCobro {
  descuento: string;
  anticipo: string;
  metodo: MetodoPagoWeb;
  numeroTarjeta: string;
  periodicidad: Periodicidad;
  montoCuota: string;
  primerVencimiento: string;
}

export function PasoCobroVenta({
  es,
  esCredito,
  puedeAutorizarDescuento,
  guardando,
  pagoValido,
  subtotal,
  piezas,
  total,
  financiado,
  saldoAnterior,
  acuerdoVigente,
  valores,
  cambiar,
  alAtras,
}: {
  es: boolean;
  esCredito: boolean;
  puedeAutorizarDescuento: boolean;
  guardando: boolean;
  pagoValido: boolean;
  subtotal: number;
  piezas: number;
  total: number;
  financiado: number;
  saldoAnterior: number;
  acuerdoVigente: {
    periodicidad: Periodicidad;
    montoPeriodico: string;
  } | null;
  valores: ValoresCobro;
  cambiar: {
    descuento: (valor: string) => void;
    anticipo: (valor: string) => void;
    metodo: (valor: MetodoPagoWeb) => void;
    numeroTarjeta: (valor: string) => void;
    periodicidad: (valor: Periodicidad) => void;
    montoCuota: (valor: string) => void;
    primerVencimiento: (valor: string) => void;
  };
  alAtras: () => void;
}) {
  return (
    <section
      className="grid gap-5 py-3 lg:grid-cols-[1fr_0.9fr]"
      data-capacitacion="ventas.cobro.paso"
    >
      <CamposCobroVenta
        es={es}
        esCredito={esCredito}
        puedeAutorizarDescuento={puedeAutorizarDescuento}
        subtotal={subtotal}
        total={total}
        financiado={financiado}
        descuento={valores.descuento}
        anticipo={valores.anticipo}
        metodo={valores.metodo}
        numeroTarjeta={valores.numeroTarjeta}
        periodicidad={valores.periodicidad}
        montoCuota={valores.montoCuota}
        primerVencimiento={valores.primerVencimiento}
        acuerdoVigente={acuerdoVigente}
        cambiarDescuento={cambiar.descuento}
        cambiarAnticipo={cambiar.anticipo}
        cambiarMetodo={cambiar.metodo}
        cambiarNumeroTarjeta={cambiar.numeroTarjeta}
        cambiarPeriodicidad={cambiar.periodicidad}
        cambiarMontoCuota={cambiar.montoCuota}
        cambiarPrimerVencimiento={cambiar.primerVencimiento}
      />
      <ResumenCobroVenta
        es={es}
        esCredito={esCredito}
        subtotal={subtotal}
        piezas={piezas}
        descuento={Number(valores.descuento || 0)}
        total={total}
        saldoAnterior={saldoAnterior}
        anticipo={Number(valores.anticipo || 0)}
        financiado={financiado}
      />
      <div
        className="flex flex-col-reverse gap-2 border-t pt-4 lg:col-span-2 sm:flex-row sm:justify-between"
        data-capacitacion="ventas.cobro.revision"
      >
        <button
          type="button"
          className="boton-secundario"
          onClick={alAtras}
          data-capacitacion="ventas.cobro.atras"
        >
          <ChevronLeft size={17} /> {es ? "Atrás" : "Back"}
        </button>
        <button
          className="boton-primario min-w-44"
          disabled={guardando || !pagoValido || total <= 0}
          data-capacitacion="ventas.cobro.confirmar"
        >
          {guardando
            ? es
              ? "Confirmando…"
              : "Confirming…"
            : es
              ? "Confirmar venta"
              : "Confirm sale"}
        </button>
      </div>
    </section>
  );
}
