"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, RefreshCw } from "lucide-react";
import { api, ErrorApi } from "@/lib/api";
import { EncabezadoPagina, MensajeError } from "@/componentes/ui";
import { usarAplicacion } from "@/componentes/proveedores";

export default function PaginaReportes() {
  const { t, idioma } = usarAplicacion();
  const es = idioma === "es";
  const ahora = new Date();
  const primerDia = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-01`;
  const [desde, establecerDesde] = useState(primerDia);
  const [hasta, establecerHasta] = useState(ahora.toISOString().slice(0, 10));
  const [mensaje, establecerMensaje] = useState("");
  const [error, establecerError] = useState("");
  async function recalcular() {
    try {
      const r = await api<{ total: number }>("/abonos/riesgo/recalcular", {
        method: "POST",
        body: "{}",
      });
      establecerMensaje(
        es
          ? `${r.total} evaluaciones actualizadas.`
          : `${r.total} risk assessments updated.`,
      );
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    }
  }
  const ventasUrl = `/api/reportes/ventas.xlsx?desde=${new Date(`${desde}T00:00:00`).toISOString()}&hasta=${new Date(`${hasta}T23:59:59`).toISOString()}`;
  return (
    <>
      <EncabezadoPagina
        titulo={t.reportes}
        descripcion={
          es
            ? "Balances y exportaciones listas para revisión contable."
            : "Balances and exports ready for accounting review."
        }
      />
      {error && <MensajeError mensaje={error} />}
      {mensaje && (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {mensaje}
        </div>
      )}
      <div className="panel mb-6 grid gap-4 p-5 sm:grid-cols-2">
        <label>
          <span className="etiqueta">{es ? "Desde" : "From"}</span>
          <input
            className="campo"
            type="date"
            value={desde}
            onChange={(e) => establecerDesde(e.target.value)}
          />
        </label>
        <label>
          <span className="etiqueta">{es ? "Hasta" : "To"}</span>
          <input
            className="campo"
            type="date"
            value={hasta}
            onChange={(e) => establecerHasta(e.target.value)}
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article className="panel p-6">
          <FileSpreadsheet className="text-emerald-600" size={28} />
          <h2 className="mt-5 text-lg font-semibold">
            {es ? "Ventas y utilidad" : "Sales and profit"}
          </h2>
          <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
            {es
              ? "Excel con filtros, costos, utilidad y fórmulas de totales."
              : "Excel with filters, cost, profit, and total formulas."}
          </p>
          <a className="boton-primario mt-5 w-full" href={ventasUrl}>
            <Download size={17} />
            Excel
          </a>
        </article>
        <article className="panel p-6">
          <FileSpreadsheet className="text-marca-500" size={28} />
          <h2 className="mt-5 text-lg font-semibold">
            {es ? "Cartera de clientes" : "Customer receivables"}
          </h2>
          <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
            {es
              ? "Saldos, vencidos, localidad y nivel de riesgo."
              : "Balances, overdue amounts, location, and risk."}
          </p>
          <a
            className="boton-primario mt-5 w-full"
            href="/api/reportes/clientes.xlsx"
          >
            <Download size={17} />
            Excel
          </a>
        </article>
        <article className="panel p-6">
          <FileText className="text-red-600" size={28} />
          <h2 className="mt-5 text-lg font-semibold">
            {es ? "Lista para surtir" : "Fulfillment list"}
          </h2>
          <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
            {es
              ? "PDF compacto con pedidos pendientes para proveedor."
              : "Compact PDF of pending supplier orders."}
          </p>
          <a
            className="boton-primario mt-5 w-full"
            href="/api/reportes/pedidos-pendientes.pdf"
          >
            <Download size={17} />
            PDF
          </a>
        </article>
      </div>
      <div className="panel mt-6 flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-semibold">
            {es ? "Evaluación de riesgo" : "Risk assessment"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {es
              ? "Recalcula mora, visitas sin pago y comportamiento de cartera."
              : "Recalculate arrears, missed visits, and receivables behavior."}
          </p>
        </div>
        <button className="boton-secundario" onClick={recalcular}>
          <RefreshCw size={17} />
          {es ? "Recalcular ahora" : "Recalculate"}
        </button>
      </div>
    </>
  );
}
