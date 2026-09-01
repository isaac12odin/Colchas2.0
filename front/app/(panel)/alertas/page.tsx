"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  ClockAlert,
  PackageCheck,
  RefreshCw,
  Route,
} from "lucide-react";
import { api } from "@/lib/api";
import { puedeAccederModuloWeb } from "@/lib/permisos";
import { usarDatosVivos } from "@/lib/usarDatosVivos";
import { usarAplicacion } from "@/componentes/proveedores";
import { EncabezadoPagina, EstadoVacio, MensajeError } from "@/componentes/ui";

interface Alertas {
  actualizadoEn: string;
  totales: {
    bajoInventario: number;
    clientesVencidos: number;
    pedidosAtrasados: number;
    rutasIncompletas: number;
    total: number;
  };
  productos: Array<{
    id: string;
    nombre: string;
    sku: string;
    existencia: number;
    existenciaMinima: number;
  }>;
  clientes: Array<{
    id: string;
    nombreCompleto: string;
    numeroTarjeta: string | null;
    saldo: { saldoActual: string; vencidoActual: string } | null;
  }>;
  pedidos: Array<{
    id: string;
    folio: string;
    estado: string;
    cliente: { nombreCompleto: string };
  }>;
  rutas: Array<{ id: string; nombre: string; pendientes: number }>;
}

type SeveridadAlerta = "critica" | "alta" | "media";

interface CategoriaAlerta {
  clave: string;
  titulo: string;
  icono: React.ReactNode;
  total: number;
  prioridad: number;
  severidad: SeveridadAlerta;
  href?: string;
  llamadaAccion: string;
  contenido: React.ReactNode;
}

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export default function PaginaAlertas() {
  const { idioma, usuario } = usarAplicacion();
  const es = idioma === "es";
  const [datos, establecerDatos] = useState<Alertas | null>(null);
  const [error, establecerError] = useState("");
  const [actualizando, establecerActualizando] = useState(false);
  const solicitudActual = useRef(0);
  const cargar = useCallback(async () => {
    const solicitud = ++solicitudActual.current;
    establecerError("");
    establecerActualizando(true);
    try {
      const respuesta = await api<Alertas>("/alertas");
      if (solicitud === solicitudActual.current) establecerDatos(respuesta);
    } catch (e) {
      if (solicitud === solicitudActual.current)
        establecerError(
          e instanceof Error
            ? e.message
            : es
              ? "No se pudieron actualizar las alertas."
              : "Alerts could not be refreshed.",
        );
    } finally {
      if (solicitud === solicitudActual.current) establecerActualizando(false);
    }
  }, [es]);
  useEffect(() => void cargar(), [cargar]);
  usarDatosVivos(cargar, { recursos: ["alertas"] });
  const puedeAbrirInventario = Boolean(
    usuario && puedeAccederModuloWeb(usuario.rol, "inventario"),
  );
  const puedeAbrirRutas = Boolean(
    usuario && puedeAccederModuloWeb(usuario.rol, "rutas"),
  );
  const categorias: CategoriaAlerta[] = datos
    ? [
        {
          clave: "alertas.clientes",
          titulo: es ? "Clientes vencidos" : "Overdue customers",
          icono: <ClockAlert />,
          total: datos.totales.clientesVencidos,
          prioridad: 1,
          severidad: "critica",
          href: "/clientes",
          llamadaAccion: es
            ? "Atender cartera vencida"
            : "Review overdue balances",
          contenido: datos.clientes.map((cliente) => (
            <Link
              key={cliente.id}
              href={`/clientes/${cliente.id}`}
              data-capacitacion="alertas.clientes.registro"
              className="block border-b p-4 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <strong className="text-sm">{cliente.nombreCompleto}</strong>
              <p className="text-xs text-red-600 dark:text-red-300">
                {es ? "Vencido" : "Overdue"}{" "}
                {dinero.format(Number(cliente.saldo?.vencidoActual ?? 0))} ·{" "}
                {es ? "saldo" : "balance"}{" "}
                {dinero.format(Number(cliente.saldo?.saldoActual ?? 0))}
              </p>
            </Link>
          )),
        },
        {
          clave: "alertas.pedidos",
          titulo: es ? "Pedidos atrasados" : "Overdue orders",
          icono: <PackageCheck />,
          total: datos.totales.pedidosAtrasados,
          prioridad: 2,
          severidad: "alta",
          href: "/pedidos",
          llamadaAccion: es ? "Atender pedidos" : "Handle orders",
          contenido: datos.pedidos.map((pedido) => (
            <Fila
              key={pedido.id}
              titulo={`${pedido.folio} · ${pedido.cliente.nombreCompleto}`}
              detalle={etiquetaEstadoPedido(pedido.estado, es)}
            />
          )),
        },
        {
          clave: "alertas.rutas",
          titulo: es ? "Rutas incompletas" : "Incomplete routes",
          icono: <Route />,
          total: datos.totales.rutasIncompletas,
          prioridad: 3,
          severidad: "alta",
          href: puedeAbrirRutas ? "/rutas" : undefined,
          llamadaAccion: es ? "Completar rutas" : "Complete routes",
          contenido: datos.rutas.map((ruta) => (
            <Fila
              key={ruta.id}
              titulo={ruta.nombre}
              detalle={
                es
                  ? `${ruta.pendientes} clientes aún sin visita`
                  : `${ruta.pendientes} customers have not been visited yet`
              }
            />
          )),
        },
        {
          clave: "alertas.inventario",
          titulo: es ? "Inventario bajo" : "Low stock",
          icono: <Boxes />,
          total: datos.totales.bajoInventario,
          prioridad: 4,
          severidad: "media",
          href: puedeAbrirInventario ? "/inventario" : undefined,
          llamadaAccion: es ? "Revisar inventario" : "Review inventory",
          contenido: datos.productos.map((producto) => (
            <Fila
              key={producto.id}
              titulo={producto.nombre}
              detalle={
                es
                  ? `${producto.sku} · existencia ${producto.existencia}, mínimo ${producto.existenciaMinima}`
                  : `${producto.sku} · stock ${producto.existencia}, minimum ${producto.existenciaMinima}`
              }
            />
          )),
        },
      ]
    : [];
  const categoriasActivas = categorias
    .filter((categoria) => categoria.total > 0)
    .sort((a, b) => a.prioridad - b.prioridad || b.total - a.total);
  const categoriasAlCorriente = categorias.filter(
    (categoria) => categoria.total === 0,
  );
  return (
    <>
      <EncabezadoPagina
        titulo={es ? "Alertas empresariales" : "Business alerts"}
        descripcion={
          es
            ? "Excepciones que requieren atención, priorizadas para actuar sin revisar módulo por módulo."
            : "Prioritized exceptions that need attention without reviewing every module."
        }
        accion={
          <button
            className="boton-secundario"
            data-capacitacion="alertas.actualizar"
            disabled={actualizando}
            onClick={() => void cargar()}
          >
            <RefreshCw
              className={actualizando ? "animate-spin" : ""}
              size={17}
            />{" "}
            {actualizando
              ? es
                ? "Consultando…"
                : "Refreshing…"
              : es
                ? "Actualizar"
                : "Refresh"}
          </button>
        }
      />
      {error && datos && <MensajeError mensaje={error} />}
      {!datos && !error ? (
        <div
          className="panel grid min-h-48 place-items-center p-8 text-center text-sm text-slate-600 dark:text-slate-300"
          role="status"
          data-testid="alertas-estado-cargando"
        >
          {es
            ? "Consultando alertas confirmadas por el servidor…"
            : "Loading server-confirmed alerts…"}
        </div>
      ) : !datos && error ? (
        <div
          className="panel p-6 text-center"
          data-testid="alertas-estado-error"
        >
          <MensajeError mensaje={error} />
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {es
              ? "No mostramos totales en cero porque todavía no pudimos confirmarlos."
              : "Zero totals are hidden because they have not been confirmed yet."}
          </p>
          <button
            type="button"
            className="boton-secundario mt-4"
            disabled={actualizando}
            onClick={() => void cargar()}
          >
            <RefreshCw
              className={actualizando ? "animate-spin" : ""}
              aria-hidden
              size={17}
            />
            {actualizando
              ? es
                ? "Consultando…"
                : "Refreshing…"
              : es
                ? "Reintentar"
                : "Try again"}
          </button>
        </div>
      ) : datos && datos.totales.total === 0 && !error ? (
        <div className="panel">
          <EstadoVacio
            texto={
              es
                ? "La operación está al corriente. No hay alertas activas."
                : "Operations are up to date. There are no active alerts."
            }
          />
        </div>
      ) : datos && datos.totales.total > 0 ? (
        <div className="space-y-5" data-capacitacion="alertas.grupos">
          <div
            className="grid gap-5 xl:grid-cols-2"
            data-testid="alertas-categorias-activas"
          >
            {categoriasActivas.map((categoria) => (
              <Grupo
                key={categoria.clave}
                clave={categoria.clave}
                titulo={categoria.titulo}
                icono={categoria.icono}
                total={categoria.total}
                severidad={categoria.severidad}
                href={categoria.href}
                llamadaAccion={categoria.llamadaAccion}
                es={es}
              >
                {categoria.contenido}
              </Grupo>
            ))}
          </div>
          {!error && categoriasAlCorriente.length > 0 && (
            <details className="panel" data-testid="alertas-al-corriente">
              <summary className="cursor-pointer list-none p-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                {es
                  ? `${categoriasAlCorriente.length} categorías al corriente`
                  : `${categoriasAlCorriente.length} categories are clear`}
              </summary>
              <div className="grid gap-2 border-t p-4 sm:grid-cols-2">
                {categoriasAlCorriente.map((categoria) => (
                  <div
                    key={categoria.clave}
                    className="flex items-center gap-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
                  >
                    {categoria.icono}
                    <span>
                      <strong className="block">{categoria.titulo}</strong>
                      {es ? "Sin alertas activas" : "No active alerts"}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      ) : null}
      {datos && error && datos.totales.total === 0 && (
        <div className="panel p-5 text-center text-sm text-slate-600 dark:text-slate-300">
          {es
            ? "No fue posible confirmar si la operación continúa al corriente. Reintenta la consulta."
            : "We could not confirm whether operations are still clear. Try again."}
        </div>
      )}
      {datos && (
        <p
          className="mt-5 text-right text-xs text-slate-400"
          data-capacitacion="alertas.estado-actualizacion"
          aria-live="polite"
        >
          {actualizando
            ? es
              ? "Sincronizando con el servidor…"
              : "Syncing with the server…"
            : error
              ? es
                ? `Última confirmación disponible: ${new Date(datos.actualizadoEn).toLocaleString("es-MX")}`
                : `Last available confirmation: ${new Date(datos.actualizadoEn).toLocaleString("en-US")}`
              : es
                ? `Datos confirmados por el servidor ${new Date(datos.actualizadoEn).toLocaleString("es-MX")}`
                : `Server-confirmed data ${new Date(datos.actualizadoEn).toLocaleString("en-US")}`}
        </p>
      )}
    </>
  );
}

function Grupo({
  clave,
  titulo,
  icono,
  total,
  severidad,
  href,
  llamadaAccion,
  es,
  children,
}: {
  clave: string;
  titulo: string;
  icono: React.ReactNode;
  total: number;
  severidad: SeveridadAlerta;
  href?: string;
  llamadaAccion: string;
  es: boolean;
  children: React.ReactNode;
}) {
  const tonos: Record<SeveridadAlerta, string> = {
    critica: "text-red-700 dark:text-red-300",
    alta: "text-amber-700 dark:text-amber-300",
    media: "text-blue-700 dark:text-blue-300",
  };
  const etiquetasSeveridad: Record<SeveridadAlerta, string> = {
    critica: es ? "Atención inmediata" : "Immediate attention",
    alta: es ? "Prioridad alta" : "High priority",
    media: es ? "Prioridad media" : "Medium priority",
  };
  return (
    <section className="panel overflow-hidden" data-capacitacion={clave}>
      <div className="flex items-center justify-between border-b p-4">
        <h2
          className={`flex items-center gap-2 font-semibold ${tonos[severidad]}`}
        >
          <AlertTriangle size={18} />
          {icono}
          {titulo}
        </h2>
        <span className="text-right">
          <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
            {etiquetasSeveridad[severidad]}
          </span>
          <span className="mt-1 inline-block rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
            {total}
          </span>
        </span>
      </div>
      {children}
      {href ? (
        <Link
          href={href}
          data-capacitacion="alertas.abrir-modulo"
          className="block border-t p-3 text-center text-xs font-semibold text-blue-600"
        >
          {llamadaAccion}
        </Link>
      ) : total ? (
        <p className="border-t p-3 text-center text-xs text-slate-500">
          {es
            ? "Consulta informativa; tu rol no realiza esta acción."
            : "For reference; your role does not perform this action."}
        </p>
      ) : null}
    </section>
  );
}

function etiquetaEstadoPedido(estado: string, es: boolean) {
  const etiquetas: Record<string, readonly [string, string]> = {
    PENDIENTE_PEDIR: ["Pendiente de pedir", "Pending purchase"],
    PEDIDO_PROVEEDOR: ["Pedido al proveedor", "Ordered from supplier"],
    RECIBIDO_ALMACEN: ["Recibido en almacén", "Received in warehouse"],
    LISTO_ENTREGA: ["Listo para entregar", "Ready for delivery"],
  };
  const etiqueta = etiquetas[estado];
  return etiqueta?.[es ? 0 : 1] ?? estado.replaceAll("_", " ").toLowerCase();
}

function Fila({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <div className="border-b p-4 last:border-0">
      <strong className="text-sm">{titulo}</strong>
      <p className="text-xs text-slate-500">{detalle}</p>
    </div>
  );
}
