import type { ClienteJornadaWeb } from "./tipos";

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function VisitaRegistradaRuta({
  cliente,
  es,
  cerrar,
}: {
  cliente: ClienteJornadaWeb;
  es: boolean;
  cerrar: () => void;
}) {
  const recibido =
    cliente.visita?.abonos?.reduce(
      (suma, abono) => suma + Number(abono.monto),
      0,
    ) ?? 0;

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
        {es
          ? "Esta visita ya fue registrada. Se bloqueó una segunda captura para no duplicar el dinero."
          : "This visit is already recorded. A second entry is blocked to prevent duplicate money."}
      </p>
      <dl className="grid gap-3 sm:grid-cols-2">
        <DatoRegistrado
          etiqueta={es ? "Resultado" : "Result"}
          valor={cliente.visita?.resultado ?? "—"}
        />
        <DatoRegistrado
          etiqueta={es ? "Recibido" : "Received"}
          valor={dinero.format(recibido)}
        />
        <DatoRegistrado
          etiqueta={es ? "Motivo" : "Reason"}
          valor={cliente.visita?.motivoNoCobro ?? "—"}
        />
        <DatoRegistrado
          etiqueta={es ? "Próximo compromiso" : "Next commitment"}
          valor={
            cliente.visita?.promesaPagoFecha
              ? new Date(cliente.visita.promesaPagoFecha).toLocaleDateString(
                  "es-MX",
                )
              : "—"
          }
        />
      </dl>
      <div className="flex justify-end">
        <button className="boton-primario" onClick={cerrar}>
          {es ? "Cerrar" : "Close"}
        </button>
      </div>
    </div>
  );
}

function DatoRegistrado({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
      <dt className="text-xs text-slate-500">{etiqueta}</dt>
      <dd className="mt-1 font-semibold">{valor}</dd>
    </div>
  );
}
