import { CalendarDays } from "lucide-react";

import type { ClienteDetalle } from "./tiposExpediente";

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const clases: Record<string, string> = {
  PAGADO: "bg-emerald-100 text-emerald-700",
  PARCIAL: "bg-amber-100 text-amber-800",
  VENCIDO: "bg-red-100 text-red-700",
  PENDIENTE: "bg-slate-100 text-slate-700",
};

export function TablaVencimientosCliente({
  estado,
  es,
}: {
  estado: ClienteDetalle["estadoCuenta"];
  es: boolean;
}) {
  return (
    <section
      className="panel overflow-hidden"
      data-capacitacion="clientes.expediente.calendario"
    >
      <header className="flex items-center justify-between border-b p-4">
        <h2 className="flex items-center gap-2 font-semibold text-slate-800 dark:text-white">
          <CalendarDays />{" "}
          {es ? "Vencimientos y diferencias" : "Due dates and differences"}
        </h2>
        <span className="text-xs text-slate-500">
          {estado.vencimientos.length} {es ? "compromisos" : "commitments"}
        </span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950">
            <tr>
              <th className="px-4 py-3">{es ? "Vencimiento" : "Due date"}</th>
              <th>{es ? "Esperado" : "Expected"}</th>
              <th>{es ? "Recibido" : "Received"}</th>
              <th>{es ? "Diferencia" : "Difference"}</th>
              <th>{es ? "Retardo" : "Delay"}</th>
              <th>{es ? "Estado" : "Status"}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {estado.vencimientos.map((vencimiento) => (
              <tr key={vencimiento.cuotaId}>
                <td className="px-4 py-3">
                  {new Date(`${vencimiento.fecha}T12:00:00`).toLocaleDateString(
                    "es-MX",
                  )}
                </td>
                <td>{dinero.format(vencimiento.esperado)}</td>
                <td className="text-emerald-700">
                  {dinero.format(vencimiento.recibido)}
                </td>
                <td
                  className={
                    vencimiento.diferencia > 0
                      ? "font-semibold text-red-600"
                      : ""
                  }
                >
                  {dinero.format(vencimiento.diferencia)}
                </td>
                <td>
                  {vencimiento.diasRetardo} {es ? "día(s)" : "day(s)"}
                </td>
                <td>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${clases[vencimiento.estado]}`}
                  >
                    {vencimiento.estado}
                  </span>
                </td>
              </tr>
            ))}
            {!estado.vencimientos.length && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  {es
                    ? "Todavía no existe un calendario de pagos."
                    : "There is no payment schedule yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
