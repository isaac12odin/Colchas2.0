import type { ControlEntregaPedido } from "./usarFormularioEntregaPedido";

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function PasoCobroEntrega({
  control,
  total,
  es,
}: {
  control: ControlEntregaPedido;
  total: number;
  es: boolean;
}) {
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2 rounded-xl bg-slate-50 p-4 text-sm leading-6 dark:bg-slate-950">
        <strong className="block">
          {es ? "Define cómo se pagará" : "Choose payment"}
        </strong>
        {es
          ? `Total ${dinero.format(total)}. Si es contado se cobra completo. Si es crédito, sólo el anticipo entra hoy y el resto se agrega al saldo.`
          : `Total ${dinero.format(total)}. Cash requires full payment.`}
      </div>
      <fieldset className="sm:col-span-2">
        <legend className="etiqueta">
          {es ? "Elige el tipo de venta" : "Choose the sale type"}
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className={`min-h-20 rounded-xl border p-4 text-left transition ${
              control.tipo === "CONTADO"
                ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200 dark:bg-blue-950/40"
                : "border-slate-200 hover:border-blue-400 dark:border-slate-700"
            }`}
            aria-pressed={control.tipo === "CONTADO"}
            onClick={() => control.cambiarTipo("CONTADO")}
            data-capacitacion="pedidos.entrega.tipo-contado"
          >
            <strong className="block">{es ? "Contado" : "Cash"}</strong>
            <span className="mt-1 block text-xs text-slate-500">
              {es
                ? `Recibes ${dinero.format(total)} y no se genera saldo.`
                : `Receive ${dinero.format(total)} with no balance.`}
            </span>
          </button>
          <button
            type="button"
            className={`min-h-20 rounded-xl border p-4 text-left transition ${
              control.tipo === "CREDITO"
                ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200 dark:bg-blue-950/40"
                : "border-slate-200 hover:border-blue-400 dark:border-slate-700"
            }`}
            aria-pressed={control.tipo === "CREDITO"}
            onClick={() => control.cambiarTipo("CREDITO")}
            data-capacitacion="pedidos.entrega.tipo-credito"
          >
            <strong className="block">{es ? "Crédito" : "Credit"}</strong>
            <span className="mt-1 block text-xs text-slate-500">
              {es
                ? "Captura anticipo y plan; el resto se suma al saldo."
                : "Set the deposit and plan; the rest becomes balance."}
            </span>
          </button>
        </div>
        {!control.tipo && (
          <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
            {es
              ? "Debes elegir cómo se pagará antes de continuar."
              : "Choose how this sale will be paid before continuing."}
          </p>
        )}
      </fieldset>
      {control.tipo && (
        <label>
          <span className="etiqueta">
            {es ? "Dinero recibido hoy" : "Payment received"}
          </span>
          <input
            className="campo"
            type="number"
            min="0"
            max={control.tipo === "CREDITO" ? Math.max(0, total - 0.01) : total}
            step="0.01"
            value={control.anticipo}
            readOnly={control.tipo === "CONTADO"}
            onChange={(evento) =>
              control.establecerAnticipo(evento.target.value)
            }
            data-capacitacion="pedidos.entrega.anticipo"
          />
        </label>
      )}
      {Number(control.anticipo || 0) > 0 && (
        <label>
          <span className="etiqueta">
            {es ? "Cómo lo recibió" : "Payment method"}
          </span>
          <select
            className="campo"
            value={control.metodo}
            onChange={(evento) =>
              control.establecerMetodo(
                evento.target.value as typeof control.metodo,
              )
            }
            data-capacitacion="pedidos.entrega.metodo-anticipo"
          >
            <option value="EFECTIVO">{es ? "Efectivo" : "Cash"}</option>
            <option value="TRANSFERENCIA">
              {es ? "Transferencia" : "Transfer"}
            </option>
            <option value="TARJETA">{es ? "Tarjeta" : "Card"}</option>
            <option value="OTRO">{es ? "Otro" : "Other"}</option>
          </select>
        </label>
      )}
      {control.tipo === "CREDITO" && (
        <>
          <div
            className="rounded-xl bg-blue-50 p-4 text-sm text-blue-950 dark:bg-blue-950/40 dark:text-blue-100"
            data-capacitacion="pedidos.entrega.saldo-revisar"
          >
            {es ? "Se agregará al saldo" : "Added to balance"}:{" "}
            <strong>{dinero.format(control.financiado)}</strong>
          </div>
          <label className="sm:col-span-2">
            <span className="etiqueta">
              {es ? "Número de tarjeta del cliente" : "Customer card number"}
            </span>
            <input
              className="campo"
              value={control.numeroTarjeta}
              onChange={(evento) =>
                control.establecerNumeroTarjeta(evento.target.value)
              }
              minLength={3}
              maxLength={30}
              required
              data-capacitacion="pedidos.entrega.numero-tarjeta"
            />
          </label>
          <label>
            <span className="etiqueta">
              {es ? "Cada cuándo pagará" : "Payment frequency"}
            </span>
            <select
              className="campo"
              value={control.periodicidad}
              onChange={(evento) =>
                control.cambiarPeriodicidad(
                  evento.target.value as typeof control.periodicidad,
                )
              }
              data-capacitacion="pedidos.entrega.periodicidad"
            >
              <option value="SEMANAL">{es ? "Semanal" : "Weekly"}</option>
              <option value="QUINCENAL">{es ? "Quincenal" : "Biweekly"}</option>
              <option value="MENSUAL">{es ? "Mensual" : "Monthly"}</option>
            </select>
          </label>
          <label>
            <span className="etiqueta">
              {es ? "Cuánto pagará cada vez" : "Installment amount"}
            </span>
            <input
              className="campo"
              type="number"
              min="0.01"
              step="0.01"
              value={control.montoCuota}
              onChange={(evento) =>
                control.establecerMontoCuota(evento.target.value)
              }
              required
              data-capacitacion="pedidos.entrega.cuota"
            />
          </label>
          <label>
            <span className="etiqueta">
              {es ? "Primer vencimiento" : "First due date"}
            </span>
            <input
              className="campo"
              type="date"
              min={control.fechaMinima}
              value={control.primerVencimiento}
              onChange={(evento) =>
                control.establecerPrimerVencimiento(evento.target.value)
              }
              required
              data-capacitacion="pedidos.entrega.fecha"
            />
            {!control.primerVencimientoValido && (
              <small className="mt-1 block font-semibold text-red-600">
                {es
                  ? "El primer vencimiento debe ser desde mañana en adelante."
                  : "The first due date must be tomorrow or later."}
              </small>
            )}
          </label>
        </>
      )}
    </section>
  );
}
