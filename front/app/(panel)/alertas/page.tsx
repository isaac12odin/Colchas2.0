"use client";

import { useCallback, useEffect, useState } from "react";
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
import { usarDatosVivos } from "@/lib/usarDatosVivos";
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

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export default function PaginaAlertas() {
  const [datos, establecerDatos] = useState<Alertas | null>(null);
  const [error, establecerError] = useState("");
  const [actualizando, establecerActualizando] = useState(false);
  const cargar = useCallback(async () => {
    establecerError("");
    establecerActualizando(true);
    try {
      establecerDatos(await api<Alertas>("/alertas"));
    } catch (e) {
      establecerError(
        e instanceof Error
          ? e.message
          : "No se pudieron actualizar las alertas.",
      );
    } finally {
      establecerActualizando(false);
    }
  }, []);
  useEffect(() => void cargar(), [cargar]);
  usarDatosVivos(cargar, { intervaloMs: 15_000 });
  return (
    <>
      <EncabezadoPagina
        titulo="Alertas empresariales"
        descripcion="Excepciones que requieren atención, priorizadas para actuar sin revisar módulo por módulo."
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
            {actualizando ? "Consultando…" : "Actualizar"}
          </button>
        }
      />
      {error && <MensajeError mensaje={error} />}
      {datos?.totales.total === 0 ? (
        <div className="panel">
          <EstadoVacio texto="La operación está al corriente. No hay alertas activas." />
        </div>
      ) : (
        <div
          className="grid gap-6 xl:grid-cols-2"
          data-capacitacion="alertas.grupos"
        >
          <Grupo
            clave="alertas.inventario"
            titulo="Inventario bajo"
            icono={<Boxes />}
            total={datos?.totales.bajoInventario ?? 0}
            href="/inventario"
          >
            {datos?.productos.map((producto) => (
              <Fila
                key={producto.id}
                titulo={producto.nombre}
                detalle={`${producto.sku} · existencia ${producto.existencia}, mínimo ${producto.existenciaMinima}`}
              />
            ))}
          </Grupo>
          <Grupo
            clave="alertas.clientes"
            titulo="Clientes vencidos"
            icono={<ClockAlert />}
            total={datos?.totales.clientesVencidos ?? 0}
            href="/clientes"
          >
            {datos?.clientes.map((cliente) => (
              <Link
                key={cliente.id}
                href={`/clientes/${cliente.id}`}
                data-capacitacion="alertas.clientes.registro"
                className="block border-b p-4 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <strong className="text-sm">{cliente.nombreCompleto}</strong>
                <p className="text-xs text-red-600">
                  Vencido{" "}
                  {dinero.format(Number(cliente.saldo?.vencidoActual ?? 0))} ·
                  saldo {dinero.format(Number(cliente.saldo?.saldoActual ?? 0))}
                </p>
              </Link>
            ))}
          </Grupo>
          <Grupo
            clave="alertas.pedidos"
            titulo="Pedidos atrasados"
            icono={<PackageCheck />}
            total={datos?.totales.pedidosAtrasados ?? 0}
            href="/pedidos"
          >
            {datos?.pedidos.map((pedido) => (
              <Fila
                key={pedido.id}
                titulo={`${pedido.folio} · ${pedido.cliente.nombreCompleto}`}
                detalle={pedido.estado}
              />
            ))}
          </Grupo>
          <Grupo
            clave="alertas.rutas"
            titulo="Rutas incompletas"
            icono={<Route />}
            total={datos?.totales.rutasIncompletas ?? 0}
            href="/rutas"
          >
            {datos?.rutas.map((ruta) => (
              <Fila
                key={ruta.id}
                titulo={ruta.nombre}
                detalle={`${ruta.pendientes} clientes aún sin visita`}
              />
            ))}
          </Grupo>
        </div>
      )}
      {datos && (
        <p
          className="mt-5 text-right text-xs text-slate-400"
          data-capacitacion="alertas.estado-actualizacion"
          aria-live="polite"
        >
          {actualizando
            ? "Sincronizando con el servidor…"
            : `Datos confirmados por el servidor ${new Date(datos.actualizadoEn).toLocaleString("es-MX")}`}
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
  href,
  children,
}: {
  clave: string;
  titulo: string;
  icono: React.ReactNode;
  total: number;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel overflow-hidden" data-capacitacion={clave}>
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="flex items-center gap-2 font-semibold text-red-600">
          <AlertTriangle size={18} />
          {icono}
          {titulo}
        </h2>
        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
          {total}
        </span>
      </div>
      {total ? (
        children
      ) : (
        <p className="p-5 text-sm text-slate-500">
          Sin alertas en esta categoría.
        </p>
      )}
      <Link
        href={href}
        data-capacitacion="alertas.abrir-modulo"
        className="block border-t p-3 text-center text-xs font-semibold text-blue-600"
      >
        Abrir módulo
      </Link>
    </section>
  );
}
function Fila({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <div className="border-b p-4 last:border-0">
      <strong className="text-sm">{titulo}</strong>
      <p className="text-xs text-slate-500">{detalle}</p>
    </div>
  );
}
