"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Banknote,
  Boxes,
  CircleDollarSign,
  ClockAlert,
  PackageCheck,
  RefreshCw,
  Users,
} from "lucide-react";

import { AccionesRapidas } from "@/componentes/AccionesRapidas";
import { usarAplicacion } from "@/componentes/proveedores";
import { Indicador, MensajeError } from "@/componentes/ui";
import { api } from "@/lib/api";
import { usarDatosVivos } from "@/lib/usarDatosVivos";

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

const enfoquePorRol = {
  ADMINISTRADOR: {
    es: "Opera el negocio o revisa sus resultados desde un solo lugar.",
    en: "Run the business or review its results from one place.",
  },
  CONTABLE: {
    es: "Registra movimientos y mantén la caja y la cartera bajo control.",
    en: "Record transactions and keep cash and receivables under control.",
  },
  VENDEDOR: {
    es: "Vende, registra clientes y prepara pedidos sin pasos innecesarios.",
    en: "Sell, add customers, and prepare orders without unnecessary steps.",
  },
  ALMACENISTA: {
    es: "Recibe mercancía, controla existencias y atiende pedidos pendientes.",
    en: "Receive merchandise, control stock, and handle pending orders.",
  },
  COBRADOR: {
    es: "Abre tu ruta, registra abonos y cierra el día con claridad.",
    en: "Open your route, record payments, and close the day clearly.",
  },
} as const;

export default function PaginaInicio() {
  const { idioma, usuario } = usarAplicacion();
  const [periodo, establecerPeriodo] = useState("MES");
  const [resumen, establecerResumen] = useState<Resumen | null>(null);
  const [cargando, establecerCargando] = useState(false);
  const [error, establecerError] = useState("");
  const solicitudActual = useRef(0);
  const controladorActual = useRef<AbortController | null>(null);
  const es = idioma === "es";
  const puedeVerResumen =
    usuario?.rol === "ADMINISTRADOR" || usuario?.rol === "CONTABLE";

  const cargar = useCallback(async () => {
    if (!puedeVerResumen) {
      establecerCargando(false);
      return;
    }
    const solicitud = ++solicitudActual.current;
    controladorActual.current?.abort();
    const controlador = new AbortController();
    controladorActual.current = controlador;
    establecerError("");
    establecerCargando(true);
    try {
      const respuesta = await api<Resumen>(
        `/reportes/resumen?periodo=${periodo}`,
        { signal: controlador.signal },
      );
      if (solicitud === solicitudActual.current) establecerResumen(respuesta);
    } catch (e) {
      if (controlador.signal.aborted) return;
      if (solicitud === solicitudActual.current)
        establecerError(
          e instanceof Error
            ? e.message
            : es
              ? "No fue posible actualizar el resumen."
              : "The overview could not be updated.",
        );
    } finally {
      if (solicitud === solicitudActual.current && !controlador.signal.aborted)
        establecerCargando(false);
    }
  }, [es, periodo, puedeVerResumen]);

  useEffect(() => {
    // Nunca se muestran cifras del periodo anterior bajo una etiqueta nueva.
    establecerResumen(null);
    void cargar();
    return () => controladorActual.current?.abort();
  }, [cargar]);
  usarDatosVivos(cargar);

  if (!usuario) return null;
  const primerNombre = usuario.nombre.trim().split(/\s+/)[0] || usuario.nombre;

  return (
    <>
      <section
        className="mb-6 rounded-2xl bg-gradient-to-br from-blue-700 to-blue-950 px-5 py-6 text-white shadow-lg sm:px-7 sm:py-7"
        data-capacitacion="inicio.bienvenida"
      >
        <p className="text-sm font-medium text-blue-100">
          {es ? `Hola, ${primerNombre}` : `Hello, ${primerNombre}`}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {es ? "¿Qué vas a hacer?" : "What do you need to do?"}
        </h1>
        <p
          className="mt-2 max-w-2xl text-sm leading-6 text-blue-100"
          data-capacitacion="inicio.enfoque-rol"
        >
          {enfoquePorRol[usuario.rol][idioma]}
        </p>
      </section>

      <AccionesRapidas rol={usuario.rol} idioma={idioma} />

      {puedeVerResumen && (
        <section
          className="mt-9"
          aria-labelledby="titulo-resumen"
          data-capacitacion="inicio.resumen"
        >
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 id="titulo-resumen" className="text-xl font-semibold">
                {es ? "Resumen de operación" : "Operations overview"}
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {es
                  ? "Lo importante del negocio, actualizado automáticamente."
                  : "Key business figures, updated automatically."}
              </p>
            </div>
            <label>
              <span className="sr-only">{es ? "Periodo" : "Period"}</span>
              <select
                className="campo w-full min-w-40 sm:w-auto"
                value={periodo}
                onChange={(e) => {
                  establecerResumen(null);
                  establecerError("");
                  establecerPeriodo(e.target.value);
                }}
                data-capacitacion="inicio.resumen.periodo"
              >
                <option
                  value="MES"
                  data-capacitacion="inicio.resumen.periodo.opcion"
                >
                  {es ? "Este mes" : "This month"}
                </option>
                <option
                  value="BIMESTRE"
                  data-capacitacion="inicio.resumen.periodo.opcion"
                >
                  {es ? "Bimestre" : "Two months"}
                </option>
                <option
                  value="SEMESTRE"
                  data-capacitacion="inicio.resumen.periodo.opcion"
                >
                  {es ? "Semestre" : "Half-year"}
                </option>
                <option
                  value="ANIO"
                  data-capacitacion="inicio.resumen.periodo.opcion"
                >
                  {es ? "Año" : "Year"}
                </option>
              </select>
            </label>
          </div>
          {error && <MensajeError mensaje={error} />}
          {cargando && !resumen ? (
            <div
              className="panel p-10 text-center text-sm text-slate-600 dark:text-slate-300"
              role="status"
            >
              {es ? "Consultando el periodo…" : "Loading this period…"}
            </div>
          ) : error && !resumen ? (
            <div className="panel p-6 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {es
                  ? "No mostramos cifras anteriores porque podrían corresponder a otro periodo."
                  : "Previous figures are hidden because they may belong to another period."}
              </p>
              <button
                type="button"
                className="boton-secundario mt-4"
                onClick={() => void cargar()}
              >
                <RefreshCw aria-hidden size={17} />
                {es ? "Reintentar consulta" : "Try again"}
              </button>
            </div>
          ) : !resumen ? null : (
            <div aria-busy={cargando || undefined}>
              {cargando && (
                <p
                  className="mb-3 text-right text-xs font-medium text-blue-700 dark:text-blue-300"
                  role="status"
                >
                  {es
                    ? "Confirmando cifras actuales…"
                    : "Confirming current figures…"}
                </p>
              )}
              {error && (
                <p className="mb-3 text-right text-xs text-amber-700 dark:text-amber-300">
                  {es
                    ? "Se muestra la última información confirmada de este periodo."
                    : "Showing the last confirmed information for this period."}
                </p>
              )}
              <div
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                data-capacitacion="inicio.resumen.indicadores"
              >
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
                  tono={
                    resumen.operacion.productosBajoMinimo ? "rojo" : "verde"
                  }
                />
              </div>
              <div
                className="panel mt-5 p-5"
                data-capacitacion="inicio.prioridad-sugerida"
              >
                <strong className="text-sm">
                  {es ? "Prioridad sugerida" : "Suggested priority"}
                </strong>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {resumen.cartera.saldo === 0 || resumen.cartera.vencido === 0
                    ? es
                      ? "La cartera está al corriente. Revisa pedidos y existencias bajas."
                      : "Receivables are current. Review orders and low stock."
                    : es
                      ? `${Math.round((resumen.cartera.vencido / resumen.cartera.saldo) * 100)}% de la cartera está vencida. Prioriza las rutas y clientes de riesgo alto.`
                      : `${Math.round((resumen.cartera.vencido / resumen.cartera.saldo) * 100)}% of receivables are overdue. Prioritize routes and high-risk customers.`}
                </p>
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
}
