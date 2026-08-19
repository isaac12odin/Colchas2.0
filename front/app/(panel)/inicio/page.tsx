"use client";

import { useEffect, useState } from "react";
import {
  Banknote,
  Boxes,
  CircleDollarSign,
  ClockAlert,
  PackageCheck,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { EncabezadoPagina, Indicador, MensajeError } from "@/componentes/ui";
import { usarAplicacion } from "@/componentes/proveedores";

interface Resumen {
  periodo: { tipo: string; desde: string; hasta: string };
  ventas: {
    total: number;
    bruto: number;
    devoluciones: number;
    operaciones: number;
    operacionesDevueltas: number;
  };
  abonos: { total: number; operaciones: number };
  compras: { total: number; operaciones: number };
  cartera: { saldo: number; vencido: number };
  operacion: {
    clientesActivos: number;
    pedidosPendientes: number;
    productosBajoMinimo: number;
    valorInventarioCosto: number;
  };
}

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export default function PaginaInicio() {
  const { t, idioma } = usarAplicacion();
  const [periodo, establecerPeriodo] = useState("MES");
  const [resumen, establecerResumen] = useState<Resumen | null>(null);
  const [error, establecerError] = useState("");

  useEffect(() => {
    api<Resumen>(`/reportes/resumen?periodo=${periodo}`)
      .then(establecerResumen)
      .catch((e) => establecerError(e.message));
  }, [periodo]);

  const es = idioma === "es";
  return (
    <>
      <EncabezadoPagina
        titulo={t.bienvenida}
        descripcion={
          es
            ? "Indicadores actualizados de ventas, cobranza, cartera y almacén."
            : "Up-to-date sales, collections, receivables, and warehouse indicators."
        }
        accion={
          <select
            className="campo w-auto min-w-40"
            value={periodo}
            onChange={(e) => establecerPeriodo(e.target.value)}
          >
            <option value="MES">{es ? "Mes" : "Month"}</option>
            <option value="BIMESTRE">{es ? "Bimestre" : "Two months"}</option>
            <option value="SEMESTRE">{es ? "Semestre" : "Half-year"}</option>
            <option value="ANIO">{es ? "Año" : "Year"}</option>
          </select>
        }
      />
      {error && <MensajeError mensaje={error} />}
      {!resumen ? (
        <div className="panel p-10 text-center text-sm text-slate-500">
          {t.cargando}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Indicador
              etiqueta={es ? "Ventas del periodo" : "Period sales"}
              valor={dinero.format(resumen.ventas.total)}
              detalle={`${resumen.ventas.operaciones} ${es ? "operaciones" : "transactions"} · ${dinero.format(resumen.ventas.devoluciones)} ${es ? "devuelto" : "returned"}`}
              icono={<CircleDollarSign size={20} />}
            />
            <Indicador
              etiqueta={es ? "Cobrado" : "Collected"}
              valor={dinero.format(resumen.abonos.total)}
              detalle={`${resumen.abonos.operaciones} ${es ? "abonos" : "payments"}`}
              icono={<Banknote size={20} />}
              tono="verde"
            />
            <Indicador
              etiqueta={es ? "Cartera pendiente" : "Outstanding"}
              valor={dinero.format(resumen.cartera.saldo)}
              detalle={`${dinero.format(resumen.cartera.vencido)} ${es ? "vencido" : "overdue"}`}
              icono={<ClockAlert size={20} />}
              tono={resumen.cartera.vencido > 0 ? "rojo" : "azul"}
            />
            <Indicador
              etiqueta={es ? "Clientes activos" : "Active customers"}
              valor={String(resumen.operacion.clientesActivos)}
              icono={<Users size={20} />}
              tono="morado"
            />
            <Indicador
              etiqueta={es ? "Pedidos pendientes" : "Pending orders"}
              valor={String(resumen.operacion.pedidosPendientes)}
              icono={<PackageCheck size={20} />}
            />
            <Indicador
              etiqueta={es ? "Valor del inventario" : "Inventory value"}
              valor={dinero.format(resumen.operacion.valorInventarioCosto)}
              detalle={`${resumen.operacion.productosBajoMinimo} ${es ? "productos bajo mínimo" : "items below minimum"}`}
              icono={<Boxes size={20} />}
              tono={resumen.operacion.productosBajoMinimo ? "rojo" : "verde"}
            />
          </div>
          <div className="mt-6 panel p-6">
            <h2 className="font-semibold">
              {es ? "Lectura rápida" : "Quick read"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {resumen.cartera.saldo === 0
                ? es
                  ? "No hay saldos pendientes. La cartera está al corriente."
                  : "There are no outstanding balances."
                : es
                  ? `${Math.round((resumen.cartera.vencido / resumen.cartera.saldo) * 100)}% de la cartera está vencida. Revisa las rutas y prioriza a los clientes de riesgo alto.`
                  : `${Math.round((resumen.cartera.vencido / resumen.cartera.saldo) * 100)}% of receivables are overdue. Review routes and prioritize high-risk customers.`}
            </p>
          </div>
        </>
      )}
    </>
  );
}
