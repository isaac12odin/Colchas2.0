import type { MetodoPagoWeb } from "../tipos";

type Periodicidad = "SEMANAL" | "QUINCENAL" | "MENSUAL";

export function CamposCobroVenta({
  es,
  esCredito,
  puedeAutorizarDescuento,
  subtotal,
  total,
  financiado,
  descuento,
  anticipo,
  metodo,
  numeroTarjeta,
  periodicidad,
  montoCuota,
  primerVencimiento,
  acuerdoVigente,
  cambiarDescuento,
  cambiarAnticipo,
  cambiarMetodo,
  cambiarNumeroTarjeta,
  cambiarPeriodicidad,
  cambiarMontoCuota,
  cambiarPrimerVencimiento,
}: {
  es: boolean;
  esCredito: boolean;
  puedeAutorizarDescuento: boolean;
  subtotal: number;
  total: number;
  financiado: number;
  descuento: string;
  anticipo: string;
  metodo: MetodoPagoWeb;
  numeroTarjeta: string;
  periodicidad: Periodicidad;
  montoCuota: string;
  primerVencimiento: string;
  acuerdoVigente: {
    periodicidad: Periodicidad;
    montoPeriodico: string;
  } | null;
  cambiarDescuento: (valor: string) => void;
  cambiarAnticipo: (valor: string) => void;
  cambiarMetodo: (valor: MetodoPagoWeb) => void;
  cambiarNumeroTarjeta: (valor: string) => void;
  cambiarPeriodicidad: (valor: Periodicidad) => void;
  cambiarMontoCuota: (valor: string) => void;
  cambiarPrimerVencimiento: (valor: string) => void;
}) {
  return (
    <div className="space-y-4" data-capacitacion="ventas.cobro.campos">
      <section
        className="rounded-xl border p-4"
        data-capacitacion="ventas.cobro"
      >
        <strong className="block">{es ? "Cobro" : "Payment"}</strong>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {puedeAutorizarDescuento && (
            <CampoDinero
              etiqueta={es ? "Descuento autorizado" : "Authorized discount"}
              valor={descuento}
              maximo={subtotal}
              cambiar={cambiarDescuento}
              capacitacion="ventas.cobro.descuento"
            />
          )}
          {esCredito && (
            <CampoDinero
              etiqueta={es ? "Anticipo recibido" : "Deposit received"}
              valor={anticipo}
              maximo={Math.max(0, total - 0.01)}
              cambiar={cambiarAnticipo}
              capacitacion="ventas.cobro.anticipo"
            />
          )}
          <label>
            <span className="etiqueta">
              {esCredito
                ? es
                  ? "Método del anticipo"
                  : "Deposit method"
                : es
                  ? "Método de pago"
                  : "Payment method"}
            </span>
            <select
              className="campo"
              value={metodo}
              onChange={(evento) =>
                cambiarMetodo(evento.target.value as MetodoPagoWeb)
              }
              data-capacitacion="ventas.cobro.metodo"
            >
              <option
                value="EFECTIVO"
                data-capacitacion="ventas.cobro.metodo.opcion"
              >
                {es ? "Efectivo" : "Cash"}
              </option>
              <option
                value="TRANSFERENCIA"
                data-capacitacion="ventas.cobro.metodo.opcion"
              >
                {es ? "Transferencia" : "Transfer"}
              </option>
              <option
                value="TARJETA"
                data-capacitacion="ventas.cobro.metodo.opcion"
              >
                {es ? "Tarjeta" : "Card"}
              </option>
              <option
                value="OTRO"
                data-capacitacion="ventas.cobro.metodo.opcion"
              >
                {es ? "Otro" : "Other"}
              </option>
            </select>
          </label>
        </div>
      </section>

      {esCredito && financiado > 0 && (
        <section
          className="rounded-xl border p-4"
          data-capacitacion="ventas.credito.plan"
        >
          <strong className="block">
            {es ? "Plan de crédito" : "Credit plan"}
          </strong>
          {acuerdoVigente && (
            <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
              <strong>
                {es
                  ? "Se respeta el acuerdo actual"
                  : "Current agreement is preserved"}
              </strong>
              <p className="mt-1 leading-5">
                {es
                  ? `La deuda aumentará, pero seguirá pagando $${Number(acuerdoVigente.montoPeriodico).toFixed(2)} con frecuencia ${acuerdoVigente.periodicidad.toLowerCase()}. La venta nueva extenderá el calendario después del último compromiso.`
                  : "The balance will increase, but the installment stays unchanged. The new sale extends the schedule after the last commitment."}
              </p>
            </div>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="etiqueta">
                {es
                  ? "Número de tarjeta asignado por ti"
                  : "Card number assigned by you"}
              </span>
              <input
                className="campo"
                data-capacitacion="ventas.credito.tarjeta"
                minLength={3}
                maxLength={30}
                value={numeroTarjeta}
                onChange={(evento) => cambiarNumeroTarjeta(evento.target.value)}
                required
              />
            </label>
            <label>
              <span className="etiqueta">
                {es ? "Frecuencia" : "Frequency"}
              </span>
              <select
                className="campo"
                value={periodicidad}
                onChange={(evento) =>
                  cambiarPeriodicidad(evento.target.value as Periodicidad)
                }
                data-capacitacion="ventas.credito.frecuencia"
                disabled={Boolean(acuerdoVigente)}
              >
                <option
                  value="SEMANAL"
                  data-capacitacion="ventas.credito.frecuencia.opcion"
                >
                  {es ? "Cada semana" : "Weekly"}
                </option>
                <option
                  value="QUINCENAL"
                  data-capacitacion="ventas.credito.frecuencia.opcion"
                >
                  {es ? "Cada quincena" : "Biweekly"}
                </option>
                <option
                  value="MENSUAL"
                  data-capacitacion="ventas.credito.frecuencia.opcion"
                >
                  {es ? "Cada mes" : "Monthly"}
                </option>
              </select>
            </label>
            <label>
              <span className="etiqueta">
                {es ? "Cuánto pagará" : "Payment amount"}
              </span>
              <input
                className="campo"
                type="number"
                data-capacitacion="ventas.credito.cuota"
                min="0.01"
                step="0.01"
                value={montoCuota}
                onChange={(evento) => cambiarMontoCuota(evento.target.value)}
                required
                readOnly={Boolean(acuerdoVigente)}
              />
            </label>
            {acuerdoVigente ? (
              <div className="sm:col-span-2">
                <span className="etiqueta">
                  {es ? "Inicio de las cuotas nuevas" : "New installment start"}
                </span>
                <p className="campo flex items-center bg-slate-50 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  {es
                    ? "Se calcula después del último compromiso pendiente; no se enciman dos cobros."
                    : "Calculated after the last pending commitment so two payments never overlap."}
                </p>
              </div>
            ) : (
              <label className="sm:col-span-2">
                <span className="etiqueta">
                  {es ? "Primer cobro" : "First payment"}
                </span>
                <input
                  className="campo"
                  type="date"
                  data-capacitacion="ventas.credito.primer-cobro"
                  value={primerVencimiento}
                  onChange={(evento) =>
                    cambiarPrimerVencimiento(evento.target.value)
                  }
                  required
                />
              </label>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function CampoDinero({
  etiqueta,
  valor,
  maximo,
  cambiar,
  capacitacion,
}: {
  etiqueta: string;
  valor: string;
  maximo: number;
  cambiar: (valor: string) => void;
  capacitacion: "ventas.cobro.descuento" | "ventas.cobro.anticipo";
}) {
  return (
    <label>
      <span className="etiqueta">{etiqueta}</span>
      <input
        className="campo"
        type="number"
        min="0"
        max={maximo}
        step="0.01"
        value={valor}
        onChange={(evento) => cambiar(evento.target.value)}
        data-capacitacion={capacitacion}
      />
    </label>
  );
}
