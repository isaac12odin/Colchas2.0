import {
  CalendarClock,
  CalendarDays,
  CircleDollarSign,
  HandCoins,
  History,
  TriangleAlert,
} from "lucide-react";

import type { ClienteDetalle } from "./tiposExpediente";
import { IndicadorCartera } from "./IndicadorCartera";

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function ResumenCarteraCliente({
  cliente,
  es,
}: {
  cliente: ClienteDetalle;
  es: boolean;
}) {
  const estado = cliente.estadoCuenta;
  return (
    <section
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
      data-capacitacion="clientes.expediente.resumen"
    >
      <IndicadorCartera
        icono={<CircleDollarSign />}
        etiqueta={es ? "Saldo total" : "Total balance"}
        valor={dinero.format(estado.saldoTotal)}
        detalle={
          es
            ? "Sólo baja con dinero o compensaciones"
            : "Reduced only by payments or offsets"
        }
      />
      <IndicadorCartera
        icono={<HandCoins />}
        etiqueta={es ? "Abono acordado" : "Agreed payment"}
        valor={dinero.format(estado.abonoPeriodico)}
        detalle={
          cliente.acuerdoPago?.periodicidad ??
          (es ? "Sin acuerdo" : "No agreement")
        }
      />
      <IndicadorCartera
        icono={<TriangleAlert />}
        etiqueta={es ? "Vencido" : "Overdue"}
        valor={dinero.format(estado.vencido)}
        detalle={`${estado.cuotasVencidas} ${es ? "fecha(s) incumplida(s)" : "missed due date(s)"}`}
        alerta={estado.vencido > 0}
      />
      <IndicadorCartera
        icono={<CalendarDays />}
        etiqueta={es ? "Cobrar hoy" : "Collect today"}
        valor={dinero.format(estado.cobrarHoy)}
        detalle={`${dinero.format(estado.vencido)} + ${dinero.format(estado.venceHoy)}`}
        alerta={estado.cobrarHoy > 0}
      />
      <IndicadorCartera
        icono={<History />}
        etiqueta={es ? "Retardos" : "Late payments"}
        valor={String(estado.retardosHistoricos)}
        detalle={`${estado.diasRetardoMaximo} ${es ? "días máximo" : "days maximum"}`}
      />
      <IndicadorCartera
        icono={<CalendarClock />}
        etiqueta={es ? "Próximo vencimiento" : "Next due date"}
        valor={
          estado.proximoVencimiento
            ? new Date(
                `${estado.proximoVencimiento}T12:00:00`,
              ).toLocaleDateString("es-MX")
            : es
              ? "Sin fecha"
              : "No date"
        }
      />
    </section>
  );
}
