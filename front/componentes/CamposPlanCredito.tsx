export function CamposPlanCredito({ es }: { es: boolean }) {
  return (
    <>
      <label>
        <span className="etiqueta">{es ? "Periodicidad" : "Frequency"}</span>
        <select name="periodicidad" className="campo">
          <option value="SEMANAL">{es ? "Semanal" : "Weekly"}</option>
          <option value="QUINCENAL">{es ? "Quincenal" : "Biweekly"}</option>
          <option value="MENSUAL">{es ? "Mensual" : "Monthly"}</option>
        </select>
      </label>
      <label>
        <span className="etiqueta">
          {es ? "Monto por cuota" : "Installment"}
        </span>
        <input
          name="montoCuota"
          className="campo"
          type="number"
          min="0.01"
          step="0.01"
          required
        />
      </label>
      <label>
        <span className="etiqueta">
          {es ? "Primer vencimiento" : "First due date"}
        </span>
        <input
          name="primerVencimiento"
          className="campo"
          type="date"
          required
        />
      </label>
    </>
  );
}
