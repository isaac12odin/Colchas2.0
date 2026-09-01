"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Boxes, Search, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import type { Idioma } from "@/lib/i18n";
import type { Pagina, Rol } from "@/lib/tipos";
import { Modal } from "./ui";

interface ClienteEncontrado {
  id: string;
  nombreCompleto: string;
  telefono: string;
  direccion: string;
  numeroTarjeta: string | null;
  localidad: { nombre: string; estado: string };
  saldo: { saldoActual: string } | null;
}

interface ProductoEncontrado {
  id: string;
  nombre: string;
  marca: string;
  sku: string;
  existencia: number;
  precioVenta: string;
}

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function BuscadorGlobal({ rol, idioma }: { rol: Rol; idioma: Idioma }) {
  const es = idioma === "es";
  const router = useRouter();
  const entradaRef = useRef<HTMLInputElement>(null);
  const [abierto, establecerAbierto] = useState(false);
  const [termino, establecerTermino] = useState("");
  const [clientes, establecerClientes] = useState<ClienteEncontrado[]>([]);
  const [productos, establecerProductos] = useState<ProductoEncontrado[]>([]);
  const [cargando, establecerCargando] = useState(false);
  const [error, establecerError] = useState("");
  const puedeAbrirInventario = rol === "ADMINISTRADOR" || rol === "CONTABLE";

  useEffect(() => {
    const abrirConTeclado = (evento: KeyboardEvent) => {
      if (
        (evento.metaKey || evento.ctrlKey) &&
        evento.key.toLowerCase() === "k"
      ) {
        evento.preventDefault();
        establecerAbierto(true);
      }
    };
    window.addEventListener("keydown", abrirConTeclado);
    return () => window.removeEventListener("keydown", abrirConTeclado);
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const id = window.setTimeout(() => entradaRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [abierto]);

  useEffect(() => {
    const consulta = termino.trim();
    if (!abierto || consulta.length < 2) {
      establecerClientes([]);
      establecerProductos([]);
      establecerCargando(false);
      establecerError("");
      return;
    }
    const controlador = new AbortController();
    const espera = window.setTimeout(async () => {
      establecerCargando(true);
      establecerError("");
      const solicitudes: [
        Promise<Pagina<ClienteEncontrado>>,
        Promise<Pagina<ProductoEncontrado>> | null,
      ] = [
        api<Pagina<ClienteEncontrado>>(
          `/clientes?pagina=1&limite=6&buscar=${encodeURIComponent(consulta)}`,
          { signal: controlador.signal },
        ),
        puedeAbrirInventario
          ? api<Pagina<ProductoEncontrado>>(
              `/inventario/productos?pagina=1&limite=6&buscar=${encodeURIComponent(consulta)}`,
              { signal: controlador.signal },
            )
          : null,
      ];
      const [clientesResultado, productosResultado] = await Promise.allSettled([
        solicitudes[0],
        solicitudes[1] ?? Promise.resolve(null),
      ]);
      if (controlador.signal.aborted) return;
      establecerClientes(
        clientesResultado.status === "fulfilled"
          ? clientesResultado.value.datos
          : [],
      );
      establecerProductos(
        productosResultado.status === "fulfilled" && productosResultado.value
          ? productosResultado.value.datos
          : [],
      );
      if (
        clientesResultado.status === "rejected" &&
        (productosResultado.status === "rejected" || !puedeAbrirInventario)
      )
        establecerError(
          es
            ? "No pudimos completar la búsqueda. Intenta nuevamente."
            : "We could not complete the search. Please try again.",
        );
      establecerCargando(false);
    }, 280);
    return () => {
      window.clearTimeout(espera);
      controlador.abort();
    };
  }, [abierto, es, puedeAbrirInventario, termino]);

  function abrirRuta(ruta: string) {
    establecerAbierto(false);
    establecerTermino("");
    router.push(ruta);
  }

  const sinResultados =
    termino.trim().length >= 2 &&
    !cargando &&
    !error &&
    clientes.length === 0 &&
    productos.length === 0;

  return (
    <>
      <button
        type="button"
        className="boton-secundario px-3 sm:min-w-44 sm:justify-between"
        onClick={() => establecerAbierto(true)}
        aria-label={es ? "Buscar en Vektra" : "Search Vektra"}
        title={
          es ? "Buscar clientes y productos" : "Search customers and products"
        }
      >
        <span className="flex items-center gap-2">
          <Search aria-hidden size={18} />
          <span className="hidden sm:inline">{es ? "Buscar" : "Search"}</span>
        </span>
        <kbd className="hidden rounded border px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 lg:inline">
          ⌘K
        </kbd>
      </button>
      <Modal
        abierto={abierto}
        cerrar={() => establecerAbierto(false)}
        titulo={es ? "Buscar en todo Vektra" : "Search across Vektra"}
      >
        <div className="space-y-4">
          <label htmlFor="busqueda-global" className="sr-only">
            {es
              ? "Nombre, teléfono, tarjeta, dirección, producto o código"
              : "Name, phone, card, address, product, or code"}
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-3.5 text-slate-400"
              aria-hidden
              size={18}
            />
            <input
              ref={entradaRef}
              id="busqueda-global"
              className="campo pl-10"
              value={termino}
              onChange={(evento) => establecerTermino(evento.target.value)}
              placeholder={
                es
                  ? "Cliente, teléfono, tarjeta, dirección, SKU…"
                  : "Customer, phone, card, address, SKU…"
              }
              autoComplete="off"
            />
          </div>
          <div className="max-h-[min(62vh,34rem)] space-y-5 overflow-y-auto pr-1">
            {termino.trim().length < 2 && (
              <p className="rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                {es
                  ? "Escribe al menos dos caracteres. Puedes buscar una clienta por nombre, teléfono, tarjeta o dirección."
                  : "Enter at least two characters. You can find a customer by name, phone, card, or address."}
              </p>
            )}
            {cargando && (
              <p
                className="py-8 text-center text-sm text-slate-500"
                role="status"
              >
                {es
                  ? "Buscando información actual…"
                  : "Searching current data…"}
              </p>
            )}
            {error && (
              <p className="text-sm font-medium text-red-600">{error}</p>
            )}
            {clientes.length > 0 && (
              <section aria-labelledby="busqueda-clientes-titulo">
                <h3
                  id="busqueda-clientes-titulo"
                  className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500"
                >
                  {es ? "Clientes" : "Customers"}
                </h3>
                <div className="space-y-2">
                  {clientes.map((cliente) => (
                    <button
                      key={cliente.id}
                      type="button"
                      onClick={() => abrirRuta(`/clientes/${cliente.id}`)}
                      className="flex min-h-16 w-full items-center gap-3 rounded-lg border p-3 text-left transition hover:border-blue-300 hover:bg-blue-50/60 dark:hover:border-blue-700 dark:hover:bg-blue-950/30"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                        <UserRound aria-hidden size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm">
                          {cliente.nombreCompleto}
                        </strong>
                        <span className="block truncate text-xs text-slate-500">
                          {cliente.numeroTarjeta
                            ? `${cliente.numeroTarjeta} · `
                            : ""}
                          {cliente.telefono} · {cliente.localidad.nombre}
                        </span>
                      </span>
                      <span className="text-right text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {dinero.format(Number(cliente.saldo?.saldoActual ?? 0))}
                      </span>
                      <ArrowRight aria-hidden className="shrink-0" size={16} />
                    </button>
                  ))}
                </div>
              </section>
            )}
            {productos.length > 0 && (
              <section aria-labelledby="busqueda-productos-titulo">
                <h3
                  id="busqueda-productos-titulo"
                  className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500"
                >
                  {es ? "Productos" : "Products"}
                </h3>
                <div className="space-y-2">
                  {productos.map((producto) => (
                    <button
                      key={producto.id}
                      type="button"
                      onClick={() =>
                        abrirRuta(
                          `/inventario?buscar=${encodeURIComponent(producto.sku)}`,
                        )
                      }
                      className="flex min-h-16 w-full items-center gap-3 rounded-lg border p-3 text-left transition hover:border-blue-300 hover:bg-blue-50/60 dark:hover:border-blue-700 dark:hover:bg-blue-950/30"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200">
                        <Boxes aria-hidden size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm">
                          {producto.nombre}
                        </strong>
                        <span className="block truncate text-xs text-slate-500">
                          {producto.marca} · {producto.sku} ·{" "}
                          {producto.existencia}{" "}
                          {es ? "disponibles" : "available"}
                        </span>
                      </span>
                      <span className="text-xs font-semibold">
                        {dinero.format(Number(producto.precioVenta))}
                      </span>
                      <ArrowRight aria-hidden className="shrink-0" size={16} />
                    </button>
                  ))}
                </div>
              </section>
            )}
            {sinResultados && (
              <p className="py-8 text-center text-sm text-slate-500">
                {es
                  ? "No encontramos coincidencias con esa búsqueda."
                  : "No matches were found for that search."}
              </p>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
