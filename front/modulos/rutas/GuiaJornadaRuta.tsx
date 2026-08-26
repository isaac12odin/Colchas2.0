import { Navigation } from "lucide-react";

export function GuiaJornadaRuta({ es }: { es: boolean }) {
  return (
    <aside className="panel h-fit p-5">
      <Navigation className="text-marca-500" />
      <h2 className="mt-4 font-semibold">
        {es ? "Qué hacer en cada visita" : "What to do at each visit"}
      </h2>
      <ol className="mt-3 space-y-3 text-sm text-slate-500">
        <li>
          1.{" "}
          {es
            ? "Confirma cuánto debes cobrar hoy."
            : "Confirm today's collection amount."}
        </li>
        <li>
          2.{" "}
          {es
            ? "Escribe cuánto recibiste; puede ser menor."
            : "Enter the amount received; it may be lower."}
        </li>
        <li>
          3.{" "}
          {es
            ? "Si no cobraste, registra motivo y siguiente compromiso."
            : "If unpaid, record the reason and next commitment."}
        </li>
      </ol>
      <p className="mt-5 rounded-lg bg-marca-50 p-3 text-xs leading-5 text-marca-900 dark:bg-marca-900/30 dark:text-blue-100">
        {es
          ? "El dinero recibido baja el saldo una sola vez. La diferencia queda rastreada como atraso; no es una penalización ni se duplica."
          : "Money received reduces the balance once. The difference remains tracked as overdue; it is not a penalty and is never duplicated."}
      </p>
    </aside>
  );
}
