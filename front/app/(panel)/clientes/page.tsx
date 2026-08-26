"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  CreditCard,
  Edit3,
  Eye,
  MapPin,
  Plus,
  Route as RouteIcon,
  Search,
} from "lucide-react";
import { api, ErrorApi } from "@/lib/api";
import type { Pagina } from "@/lib/tipos";
import {
  EncabezadoPagina,
  EstadoVacio,
  MensajeError,
  Modal,
  Paginador,
} from "@/componentes/ui";
import { usarAplicacion } from "@/componentes/proveedores";
import { FormularioAbonoRapido } from "@/modulos/cobranza/FormularioAbonoRapido";
import { usarDatosVivos } from "@/lib/usarDatosVivos";
import { usarAccionInicial } from "@/lib/usarAccionInicial";

interface Cliente {
  id: string;
  nombreCompleto: string;
  telefono: string;
  direccion: string;
  numeroTarjeta: string | null;
  localidad: { nombre: string; estado: string };
  saldo: { saldoActual: string; vencidoActual: string } | null;
  evaluacionesRiesgo: Array<{ nivel: string; puntuacion: number }>;
}
interface Localidad {
  id: string;
  nombre: string;
  estado: string;
}
const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export default function PaginaClientes() {
  const { t, idioma, usuario } = usarAplicacion();
  const [pagina, establecerPagina] = useState(1);
  const [buscar, establecerBuscar] = useState("");
  const [respuesta, establecerRespuesta] = useState<Pagina<Cliente> | null>(
    null,
  );
  const [localidades, establecerLocalidades] = useState<Localidad[]>([]);
  const [localidadSeleccionada, establecerLocalidadSeleccionada] = useState("");
  const [buscarLocalidad, establecerBuscarLocalidad] = useState("");
  const [modalNuevo, establecerModalNuevo] = useState(false);
  const [modalLocalidad, establecerModalLocalidad] = useState(false);
  const [clienteAbono, establecerClienteAbono] = useState<Cliente | null>(null);
  const [abonoAbierto, establecerAbonoAbierto] = useState(false);
  const [tarjetaCliente, establecerTarjetaCliente] = useState<Cliente | null>(
    null,
  );
  const [error, establecerError] = useState("");
  const [errorLocalidad, establecerErrorLocalidad] = useState("");
  const es = idioma === "es";

  const cargar = useCallback(() => {
    establecerError("");
    api<Pagina<Cliente>>(
      `/clientes?pagina=${pagina}&limite=15&buscar=${encodeURIComponent(buscar)}`,
    )
      .then(establecerRespuesta)
      .catch((e) => establecerError(e.message));
  }, [pagina, buscar]);
  useEffect(cargar, [cargar]);
  usarDatosVivos(cargar);
  useEffect(() => {
    api<{ datos: Localidad[] }>("/localidades")
      .then((r) => {
        establecerLocalidades(r.datos);
        establecerLocalidadSeleccionada(
          (actual) => actual || r.datos[0]?.id || "",
        );
      })
      .catch(() => undefined);
  }, []);

  async function crearLocalidad(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    establecerErrorLocalidad("");
    const form = new FormData(evento.currentTarget);
    try {
      const localidad = await api<Localidad>("/localidades", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form)),
      });
      establecerLocalidades((actuales) =>
        [...actuales, localidad].sort((a, b) =>
          `${a.estado}${a.nombre}`.localeCompare(
            `${b.estado}${b.nombre}`,
            "es",
          ),
        ),
      );
      establecerLocalidadSeleccionada(localidad.id);
      establecerModalLocalidad(false);
    } catch (e) {
      establecerErrorLocalidad(
        e instanceof ErrorApi
          ? e.message
          : "No fue posible crear la localidad.",
      );
    }
  }

  async function crear(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    try {
      await api("/clientes", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form)),
      });
      establecerModalNuevo(false);
      cargar();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    }
  }
  async function guardarTarjeta(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!tarjetaCliente) return;
    const form = new FormData(evento.currentTarget);
    try {
      await api(`/clientes/${tarjetaCliente.id}/tarjeta`, {
        method: "PATCH",
        body: JSON.stringify({ numeroTarjeta: form.get("numeroTarjeta") }),
      });
      establecerTarjetaCliente(null);
      cargar();
    } catch (e) {
      establecerError(e instanceof ErrorApi ? e.message : "Error");
    }
  }
  const puedeCapturar =
    usuario?.rol === "ADMINISTRADOR" ||
    usuario?.rol === "CONTABLE" ||
    usuario?.rol === "VENDEDOR";
  const puedeCobrarRuta =
    usuario?.rol === "ADMINISTRADOR" || usuario?.rol === "COBRADOR";
  const puedeAbonarDirecto =
    usuario?.rol === "ADMINISTRADOR" || usuario?.rol === "CONTABLE";
  usarAccionInicial((accion) => {
    if (accion === "nuevo" && puedeCapturar) establecerModalNuevo(true);
    if (accion === "abono" && puedeAbonarDirecto) {
      establecerClienteAbono(null);
      establecerAbonoAbierto(true);
    }
  });

  return (
    <>
      <EncabezadoPagina
        titulo={t.clientes}
        descripcion={
          es
            ? "Expediente, saldo, tarjeta e historial de cada cliente."
            : "Customer records, balance, card, and history."
        }
        accion={
          puedeCapturar || puedeAbonarDirecto || puedeCobrarRuta ? (
            <div className="flex flex-wrap gap-2">
              {puedeCobrarRuta && (
                <Link
                  href="/rutas?accion=cobrar"
                  className="boton-primario"
                  data-capacitacion="clientes.cobranza-ruta.abrir"
                >
                  <RouteIcon size={18} />
                  {es ? "Capturar cobranza" : "Record collections"}
                </Link>
              )}
              {puedeAbonarDirecto && (
                <button
                  className="boton-secundario"
                  data-capacitacion="clientes.abono.abrir"
                  onClick={() => {
                    establecerClienteAbono(null);
                    establecerAbonoAbierto(true);
                  }}
                >
                  <Banknote size={18} />
                  {es ? "Abono directo" : "Direct payment"}
                </button>
              )}
              {usuario?.rol === "ADMINISTRADOR" && (
                <button
                  className="boton-secundario"
                  onClick={() => establecerModalLocalidad(true)}
                  data-capacitacion="clientes.localidad.abrir"
                >
                  <MapPin size={18} />
                  {es ? "Localidad" : "Location"}
                </button>
              )}
              {puedeCapturar && (
                <button
                  className="boton-primario"
                  onClick={() => establecerModalNuevo(true)}
                  data-capacitacion="clientes.alta.abrir"
                >
                  <Plus size={18} />
                  {t.nuevo}
                </button>
              )}
            </div>
          ) : undefined
        }
      />
      {error && <MensajeError mensaje={error} />}
      <div className="panel overflow-hidden" data-capacitacion="clientes.lista">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            establecerPagina(1);
            cargar();
          }}
          className="flex gap-2 border-b p-4"
          data-capacitacion="clientes.busqueda"
        >
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-3 text-slate-400"
              size={18}
            />
            <input
              className="campo pl-10"
              data-capacitacion="clientes.busqueda.campo"
              placeholder={
                es
                  ? "Nombre, teléfono, dirección, tarjeta o localidad"
                  : "Name, phone, address, card, or location"
              }
              value={buscar}
              onChange={(e) => establecerBuscar(e.target.value)}
            />
          </div>
          <button
            className="boton-secundario"
            data-capacitacion="clientes.busqueda.ejecutar"
          >
            {t.buscar}
          </button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950">
              <tr>
                <th className="px-4 py-3">{es ? "Cliente" : "Customer"}</th>
                <th className="px-4 py-3">{es ? "Contacto" : "Contact"}</th>
                <th className="px-4 py-3">{es ? "Localidad" : "Location"}</th>
                <th className="px-4 py-3">{es ? "Tarjeta" : "Card"}</th>
                <th className="px-4 py-3 text-right">
                  {es ? "Saldo" : "Balance"}
                </th>
                <th className="px-4 py-3">{es ? "Riesgo" : "Risk"}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {respuesta?.datos.map((cliente) => (
                <tr
                  key={cliente.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  data-capacitacion="clientes.lista.fila"
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold">{cliente.nombreCompleto}</p>
                    <p className="max-w-xs truncate text-xs text-slate-500">
                      {cliente.direccion}
                    </p>
                  </td>
                  <td className="px-4 py-3">{cliente.telefono}</td>
                  <td className="px-4 py-3">
                    {cliente.localidad.nombre}
                    <p className="text-xs text-slate-500">
                      {cliente.localidad.estado}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {puedeCapturar &&
                    Number(cliente.saldo?.saldoActual ?? 0) > 0 ? (
                      <button
                        className="inline-flex items-center gap-1.5 font-mono font-semibold text-blue-700 hover:underline"
                        onClick={() => establecerTarjetaCliente(cliente)}
                        data-capacitacion="clientes.tarjeta.abrir"
                      >
                        <CreditCard size={15} />
                        {cliente.numeroTarjeta ?? (es ? "Asignar" : "Assign")}
                      </button>
                    ) : (
                      <span className="font-mono">
                        {cliente.numeroTarjeta ?? "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {dinero.format(Number(cliente.saldo?.saldoActual ?? 0))}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${cliente.evaluacionesRiesgo[0]?.nivel === "ALTO" || cliente.evaluacionesRiesgo[0]?.nivel === "CRITICO" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
                    >
                      {cliente.evaluacionesRiesgo[0]?.nivel ??
                        (es ? "Sin calcular" : "Not rated")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/clientes/${cliente.id}`}
                        className="boton-secundario whitespace-nowrap px-3"
                        title={es ? "Ver expediente" : "View account"}
                        data-capacitacion="clientes.expediente.abrir"
                      >
                        <Eye size={17} />
                      </Link>
                      {puedeCapturar && (
                        <Link
                          href={`/clientes/${cliente.id}?accion=editar`}
                          className="boton-secundario whitespace-nowrap px-3"
                          title={es ? "Editar cliente" : "Edit customer"}
                          aria-label={`${es ? "Editar" : "Edit"} ${cliente.nombreCompleto}`}
                          data-capacitacion="clientes.edicion.abrir"
                        >
                          <Edit3 size={17} />
                        </Link>
                      )}
                      {puedeAbonarDirecto &&
                        Number(cliente.saldo?.saldoActual ?? 0) > 0 && (
                          <button
                            className="boton-secundario whitespace-nowrap"
                            data-capacitacion="clientes.abono.cliente-actual.abrir"
                            onClick={() => {
                              establecerClienteAbono(cliente);
                              establecerAbonoAbierto(true);
                            }}
                          >
                            <Banknote size={17} />
                            {es ? "Abonar" : "Payment"}
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {respuesta && respuesta.datos.length === 0 && (
          <EstadoVacio
            texto={es ? "No se encontraron clientes." : "No customers found."}
          />
        )}
        {respuesta && (
          <Paginador
            pagina={respuesta.paginacion.pagina}
            totalPaginas={respuesta.paginacion.totalPaginas}
            cambiar={establecerPagina}
          />
        )}
      </div>
      <Modal
        abierto={modalNuevo}
        cerrar={() => establecerModalNuevo(false)}
        titulo={es ? "Nuevo cliente" : "New customer"}
      >
        <form
          onSubmit={crear}
          className="grid gap-4 sm:grid-cols-2"
          data-capacitacion="clientes.alta.formulario"
        >
          <label className="sm:col-span-2">
            <span className="etiqueta">
              {es ? "Nombre completo" : "Full name"}
            </span>
            <input
              name="nombreCompleto"
              className="campo"
              data-capacitacion="clientes.alta.nombre"
              required
              minLength={3}
            />
          </label>
          <label>
            <span className="etiqueta">{es ? "Teléfono" : "Phone"}</span>
            <input
              name="telefono"
              className="campo"
              required
              inputMode="tel"
              data-capacitacion="clientes.alta.telefono"
            />
          </label>
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="etiqueta mb-0">
                {es ? "Localidad" : "Location"}
              </span>
              {usuario?.rol === "ADMINISTRADOR" && (
                <button
                  type="button"
                  className="text-xs font-semibold text-blue-600 hover:underline"
                  onClick={() => establecerModalLocalidad(true)}
                  data-capacitacion="clientes.alta.localidad-crear"
                >
                  {es ? "+ Crear localidad" : "+ Create location"}
                </button>
              )}
            </div>
            <input
              className="campo mb-2"
              data-capacitacion="clientes.alta.localidad-buscar"
              value={buscarLocalidad}
              onChange={(evento) =>
                establecerBuscarLocalidad(evento.target.value)
              }
              placeholder={
                es
                  ? "Filtrar localidad por nombre o estado"
                  : "Filter location by name or state"
              }
            />
            <select
              name="localidadId"
              className="campo"
              data-capacitacion="clientes.alta.localidad"
              required
              value={localidadSeleccionada}
              onChange={(evento) =>
                establecerLocalidadSeleccionada(evento.target.value)
              }
            >
              <option
                value=""
                data-capacitacion="clientes.alta.localidad.opcion"
              >
                {localidades.length
                  ? "—"
                  : es
                    ? "Primero crea una localidad"
                    : "Create a location first"}
              </option>
              {localidades
                .filter((localidad) =>
                  `${localidad.nombre} ${localidad.estado}`
                    .toLocaleLowerCase("es-MX")
                    .includes(buscarLocalidad.toLocaleLowerCase("es-MX")),
                )
                .map((l) => (
                  <option
                    key={l.id}
                    value={l.id}
                    data-capacitacion="clientes.alta.localidad.opcion"
                  >
                    {l.nombre}, {l.estado}
                  </option>
                ))}
            </select>
          </div>
          <label className="sm:col-span-2">
            <span className="etiqueta">{es ? "Dirección" : "Address"}</span>
            <textarea
              name="direccion"
              className="campo min-h-24 py-3"
              data-capacitacion="clientes.alta.direccion"
              required
            />
          </label>
          <label>
            <span className="etiqueta">
              {es
                ? "Límite de crédito (0 = sin límite)"
                : "Credit limit (0 = unlimited)"}
            </span>
            <input
              name="limiteCredito"
              className="campo"
              data-capacitacion="clientes.alta.limite-credito"
              type="number"
              min="0"
              step="0.01"
              defaultValue="0"
            />
          </label>
          <div
            className="sm:col-span-2 flex justify-end gap-2 pt-2"
            data-capacitacion="clientes.alta.revision"
          >
            <button
              type="button"
              className="boton-secundario"
              onClick={() => establecerModalNuevo(false)}
              data-capacitacion="clientes.alta.cancelar"
            >
              {t.cancelar}
            </button>
            <button
              className="boton-primario disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!localidadSeleccionada}
              data-capacitacion="clientes.alta.guardar"
            >
              {t.guardar}
            </button>
          </div>
        </form>
      </Modal>
      <Modal
        abierto={modalLocalidad}
        cerrar={() => {
          establecerModalLocalidad(false);
          establecerErrorLocalidad("");
        }}
        titulo={es ? "Nueva localidad" : "New location"}
      >
        <form
          onSubmit={crearLocalidad}
          className="space-y-4"
          data-capacitacion="clientes.localidad.formulario"
        >
          {errorLocalidad && <MensajeError mensaje={errorLocalidad} />}
          <label>
            <span className="etiqueta">
              {es ? "Nombre de la localidad" : "Location name"}
            </span>
            <input
              name="nombre"
              className="campo"
              data-capacitacion="clientes.localidad.nombre"
              placeholder={es ? "Ej. San Miguel" : "E.g. San Miguel"}
              minLength={2}
              maxLength={120}
              autoFocus
              required
            />
          </label>
          <label>
            <span className="etiqueta">{es ? "Estado" : "State"}</span>
            <input
              name="estado"
              className="campo"
              data-capacitacion="clientes.localidad.estado"
              placeholder={es ? "Ej. Puebla" : "E.g. Puebla"}
              minLength={2}
              maxLength={120}
              required
            />
          </label>
          <p
            className="text-xs leading-5 text-slate-500"
            data-capacitacion="clientes.localidad.revision"
          >
            {es
              ? "Al guardarla quedará seleccionada automáticamente en el cliente nuevo."
              : "After saving, it will be selected automatically for the new customer."}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="boton-secundario"
              onClick={() => establecerModalLocalidad(false)}
              data-capacitacion="clientes.localidad.cancelar"
            >
              {t.cancelar}
            </button>
            <button
              className="boton-primario"
              data-capacitacion="clientes.localidad.guardar"
            >
              {t.guardar}
            </button>
          </div>
        </form>
      </Modal>
      <Modal
        abierto={Boolean(tarjetaCliente)}
        cerrar={() => establecerTarjetaCliente(null)}
        titulo={`${es ? "Asignar tarjeta" : "Assign card"} · ${tarjetaCliente?.nombreCompleto ?? ""}`}
      >
        <form
          onSubmit={guardarTarjeta}
          className="space-y-4"
          data-capacitacion="clientes.tarjeta.formulario"
        >
          <p
            className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100"
            data-capacitacion="clientes.tarjeta.revision"
          >
            {es
              ? "Tú decides el número. Permanecerá mientras el cliente tenga saldo y se quitará al liquidar."
              : "You choose the number. It remains while a balance exists and is removed after payoff."}
          </p>
          <label>
            <span className="etiqueta">
              {es ? "Número de tarjeta" : "Card number"}
            </span>
            <input
              name="numeroTarjeta"
              className="campo"
              data-capacitacion="clientes.tarjeta.numero"
              defaultValue={tarjetaCliente?.numeroTarjeta ?? ""}
              minLength={3}
              maxLength={30}
              autoFocus
              required
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="boton-secundario"
              onClick={() => establecerTarjetaCliente(null)}
              data-capacitacion="clientes.tarjeta.cancelar"
            >
              {t.cancelar}
            </button>
            <button
              className="boton-primario"
              data-capacitacion="clientes.tarjeta.guardar"
            >
              {t.guardar}
            </button>
          </div>
        </form>
      </Modal>
      <Modal
        abierto={abonoAbierto}
        cerrar={() => {
          establecerAbonoAbierto(false);
          establecerClienteAbono(null);
        }}
        titulo={`${es ? "Registrar abono" : "Record payment"}${clienteAbono ? ` · ${clienteAbono.nombreCompleto}` : ""}`}
      >
        <FormularioAbonoRapido
          key={`${clienteAbono?.id ?? "buscar"}-${String(abonoAbierto)}`}
          clienteInicial={clienteAbono}
          es={es}
          alCancelar={() => {
            establecerAbonoAbierto(false);
            establecerClienteAbono(null);
          }}
          alActualizar={cargar}
        />
      </Modal>
    </>
  );
}
