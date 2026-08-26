export function CamposPagoRuta({
  es,
  saldo,
  cobrarHoy,
  monto,
  metodo,
  referencia,
  cambiarMonto,
  cambiarMetodo,
  cambiarReferencia,
}: {
  es: boolean;
  saldo: number;
  cobrarHoy: number;
  monto: string;
  metodo: string;
  referencia: string;
  cambiarMonto: (valor: string) => void;
  cambiarMetodo: (valor: string) => void;
  cambiarReferencia: (valor: string) => void;
}) {
  const diferencia = Math.max(cobrarHoy - Number(monto || 0), 0);
  const dinero = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  });

  return (
    <section className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="etiqueta">
            {es ? "¿Cuánto te dio?" : "How much was received?"}
          </span>
          <input
            className="campo"
            type="number"
            min="0.01"
            max={saldo}
            step="0.01"
            value={monto}
            onChange={(evento) => cambiarMonto(evento.target.value)}
            required
            data-capacitacion="rutas.visita.monto"
          />
        </label>
        <label>
          <span className="etiqueta">{es ? "Método" : "Method"}</span>
          <select
            className="campo"
            value={metodo}
            onChange={(evento) => cambiarMetodo(evento.target.value)}
            data-capacitacion="rutas.visita.metodo"
          >
            <option value="EFECTIVO">{es ? "Efectivo" : "Cash"}</option>
            <option value="TRANSFERENCIA">
              {es ? "Transferencia" : "Transfer"}
            </option>
            <option value="TARJETA">{es ? "Tarjeta" : "Card"}</option>
            <option value="OTRO">{es ? "Otro" : "Other"}</option>
          </select>
        </label>
      </div>
      {metodo !== "EFECTIVO" && (
        <label>
          <span className="etiqueta">
            {es ? "Referencia (opcional)" : "Reference (optional)"}
          </span>
          <input
            className="campo"
            maxLength={120}
            value={referencia}
            onChange={(evento) => cambiarReferencia(evento.target.value)}
            placeholder={es ? "Folio o últimos dígitos" : "Reference number"}
            data-capacitacion="rutas.visita.referencia"
          />
        </label>
      )}
      <p className="text-sm">
        {es ? "Diferencia pendiente de hoy:" : "Today's remaining difference:"}{" "}
        <strong
          className={
            diferencia > 0
              ? "text-red-700 dark:text-red-300"
              : "text-emerald-700"
          }
        >
          {dinero.format(diferencia)}
        </strong>
      </p>
      <p className="text-xs leading-5 text-slate-500">
        {es
          ? "Se descuenta únicamente lo recibido. La diferencia sigue vencida y conserva sus días de retardo."
          : "Only the received amount is deducted. The difference stays overdue and keeps its delay history."}
      </p>
    </section>
  );
}
