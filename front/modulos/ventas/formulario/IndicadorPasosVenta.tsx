export function IndicadorPasosVenta({
  paso,
  es,
}: {
  paso: number;
  es: boolean;
}) {
  const etiquetas = es
    ? ["Tipo", "Cliente y productos", "Cobro y confirmación"]
    : ["Type", "Customer and products", "Payment and confirmation"];
  return (
    <div className="mb-5" data-capacitacion="ventas.nueva.progreso">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>{es ? `Paso ${paso} de 3` : `Step ${paso} of 3`}</span>
        <span>{etiquetas[paso - 1]}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {etiquetas.map((etiqueta, indice) => (
          <div
            key={etiqueta}
            className={`h-1.5 rounded-full ${indice < paso ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"}`}
          />
        ))}
      </div>
    </div>
  );
}
