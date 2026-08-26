export function CamposNoCobroRuta({
  es,
  saldo,
  motivo,
  promesaFecha,
  promesaMonto,
  cambiarMotivo,
  cambiarFecha,
  cambiarMonto,
}: {
  es: boolean;
  saldo: number;
  motivo: string;
  promesaFecha: string;
  promesaMonto: string;
  cambiarMotivo: (valor: string) => void;
  cambiarFecha: (valor: string) => void;
  cambiarMonto: (valor: string) => void;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
      <p className="text-sm font-semibold">
        {es
          ? "Antes de guardar explica qué pasó y cuándo volver."
          : "Before saving, record what happened and when to return."}
      </p>
      <label>
        <span className="etiqueta">{es ? "Motivo" : "Reason"}</span>
        <select
          className="campo"
          value={motivo}
          onChange={(evento) => cambiarMotivo(evento.target.value)}
          required
        >
          <option value="">
            {es ? "Selecciona el motivo" : "Select a reason"}
          </option>
          <option value="AUSENTE">{es ? "No estaba" : "Absent"}</option>
          <option value="SIN_DINERO">
            {es ? "No tenía dinero" : "No money available"}
          </option>
          <option value="PROMESA_PAGO">
            {es ? "Prometió pagar después" : "Promised later payment"}
          </option>
          <option value="DIRECCION_INCORRECTA">
            {es ? "Dirección incorrecta" : "Wrong address"}
          </option>
          <option value="RECHAZO">
            {es ? "Rechazó el cobro" : "Refused payment"}
          </option>
          <option value="OTRO">{es ? "Otro" : "Other"}</option>
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="etiqueta">
            {es
              ? "Siguiente compromiso o intento"
              : "Next commitment or attempt"}
          </span>
          <input
            className="campo"
            type="date"
            value={promesaFecha}
            onChange={(evento) => cambiarFecha(evento.target.value)}
            required
          />
        </label>
        <label>
          <span className="etiqueta">
            {es ? "Monto comprometido" : "Committed amount"}
          </span>
          <input
            className="campo"
            type="number"
            min="0.01"
            max={saldo}
            step="0.01"
            value={promesaMonto}
            onChange={(evento) => cambiarMonto(evento.target.value)}
            required
          />
        </label>
      </div>
      <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
        {es
          ? "El compromiso no borra el saldo ni el atraso; sólo deja claro cuándo y cuánto se acordó."
          : "The commitment does not clear the balance or delay; it records when and how much was agreed."}
      </p>
    </section>
  );
}
