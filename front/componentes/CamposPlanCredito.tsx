export function CamposPlanCredito({
  es,
  prefijoCapacitacion,
}: {
  es: boolean;
  prefijoCapacitacion?: string;
}) {
  return (
    <>
      <label>
        <span className="etiqueta">{es ? "Periodicidad" : "Frequency"}</span>
        <select
          name="periodicidad"
          className="campo"
          data-capacitacion={
            prefijoCapacitacion
              ? `${prefijoCapacitacion}.periodicidad`
              : undefined
          }
        >
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
          data-capacitacion={
            prefijoCapacitacion ? `${prefijoCapacitacion}.cuota` : undefined
          }
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
          data-capacitacion={
            prefijoCapacitacion ? `${prefijoCapacitacion}.fecha` : undefined
          }
        />
      </label>
    </>
  );
}
