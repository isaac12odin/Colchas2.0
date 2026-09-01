"use client";

import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { SelectorClienteRemoto } from "@/componentes/SelectoresRemotos";
import { MensajeError } from "@/componentes/ui";
import { api, ErrorApi } from "@/lib/api";
import { emitirSaldoActualizado } from "@/lib/eventosOperacion";
import {
  etiquetaEstadoPedido,
  type ClientePedido,
  type PedidoWeb,
} from "@/modulos/pedidos/tipos";

interface ResultadoAbono {
  id: string;
  saldoAnterior: number;
  saldoNuevo: number;
}

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

async function consultarPedidosDelCliente(clienteId: string) {
  const pedidos: PedidoWeb[] = [];
  let pagina = 1;
  let totalPaginas = 1;
  do {
    const respuesta = await api<{
      datos: PedidoWeb[];
      paginacion?: { totalPaginas: number };
    }>(
      `/pedidos?clienteId=${encodeURIComponent(clienteId)}&pagina=${pagina}&limite=100`,
    );
    pedidos.push(...respuesta.datos);
    totalPaginas = respuesta.paginacion?.totalPaginas ?? 1;
    pagina += 1;
  } while (pagina <= totalPaginas);
  return pedidos;
}

export function FormularioAbonoRapido({
  clienteInicial = null,
  es,
  alCancelar,
  alActualizar,
  prefijoCapacitacion = "clientes.abono",
}: {
  clienteInicial?: ClientePedido | null;
  es: boolean;
  alCancelar: () => void;
  alActualizar: () => void | Promise<void>;
  prefijoCapacitacion?: "clientes.abono" | "ventas.abono";
}) {
  const [cliente, establecerCliente] = useState<ClientePedido | null>(
    clienteInicial,
  );
  const [monto, establecerMonto] = useState("");
  const [metodo, establecerMetodo] = useState("EFECTIVO");
  const [referencia, establecerReferencia] = useState("");
  const [guardando, establecerGuardando] = useState(false);
  const [error, establecerError] = useState("");
  const [resultado, establecerResultado] = useState<ResultadoAbono | null>(
    null,
  );
  const [pedidos, establecerPedidos] = useState<PedidoWeb[]>([]);
  const [cargandoPedidos, establecerCargandoPedidos] = useState(false);
  const [errorPedidos, establecerErrorPedidos] = useState("");
  const [intentoPedidos, establecerIntentoPedidos] = useState(0);
  const saldo = Number(cliente?.saldo?.saldoActual ?? 0);

  useEffect(() => {
    let vigente = true;
    if (!cliente) {
      establecerPedidos([]);
      establecerErrorPedidos("");
      return;
    }
    establecerCargandoPedidos(true);
    establecerErrorPedidos("");
    void consultarPedidosDelCliente(cliente.id)
      .then((respuesta) => {
        if (!vigente) return;
        establecerPedidos(
          respuesta.filter(
            (pedido) => !["ENTREGADO", "CANCELADO"].includes(pedido.estado),
          ),
        );
      })
      .catch(() => {
        if (!vigente) return;
        establecerPedidos([]);
        establecerErrorPedidos(
          es
            ? "No fue posible consultar los pedidos. No se asumirá que la lista está vacía."
            : "Orders could not be loaded. The list will not be assumed empty.",
        );
      })
      .finally(() => {
        if (vigente) establecerCargandoPedidos(false);
      });
    return () => {
      vigente = false;
    };
  }, [cliente, es, intentoPedidos]);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!cliente) return;
    establecerGuardando(true);
    establecerError("");
    try {
      const respuesta = await api<ResultadoAbono>("/abonos", {
        method: "POST",
        body: JSON.stringify({
          clienteId: cliente.id,
          monto: Number(monto),
          metodo,
          fechaAbono: new Date().toISOString(),
          ...(referencia.trim() ? { referencia: referencia.trim() } : {}),
        }),
      });
      establecerResultado(respuesta);
      emitirSaldoActualizado({
        clienteId: cliente.id,
        saldoNuevo: respuesta.saldoNuevo,
        origen: "ABONO",
      });
      await alActualizar();
    } catch (e) {
      establecerError(
        e instanceof ErrorApi
          ? e.message
          : es
            ? "No fue posible registrar el abono."
            : "The payment could not be recorded.",
      );
    } finally {
      establecerGuardando(false);
    }
  }

  if (resultado) {
    return (
      <div
        className="py-5 text-center"
        data-capacitacion={`${prefijoCapacitacion}.resultado`}
      >
        <CheckCircle2 className="mx-auto text-emerald-500" size={56} />
        <h3 className="mt-4 text-2xl font-black">
          {es ? "Abono registrado" : "Payment recorded"}
        </h3>
        <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-left dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            {es ? "Saldo actualizado" : "Balance updated"}
          </p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <span className="text-sm text-slate-500">
              {es ? "Antes" : "Before"}
              <strong className="block text-slate-800 dark:text-white">
                {dinero.format(Number(resultado.saldoAnterior))}
              </strong>
            </span>
            <span className="text-right text-sm text-slate-500">
              {es ? "Ahora debe" : "Now owed"}
              <strong className="block text-2xl text-emerald-700 dark:text-emerald-300">
                {dinero.format(Number(resultado.saldoNuevo))}
              </strong>
            </span>
          </div>
        </div>
        <button
          type="button"
          className="boton-primario mt-6"
          onClick={alCancelar}
          data-capacitacion={`${prefijoCapacitacion}.resultado.cerrar`}
        >
          {es ? "Listo" : "Done"}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={enviar}
      className="space-y-5"
      data-capacitacion={`${prefijoCapacitacion}.formulario`}
    >
      {error && <MensajeError mensaje={error} />}
      <SelectorClienteRemoto
        valor={cliente}
        alCambiar={(seleccion) => {
          establecerCliente(seleccion);
          establecerMonto("");
        }}
        es={es}
        prefijoCapacitacion={`${prefijoCapacitacion}.cliente`}
      />

      {cliente && (
        <>
          <div
            className="flex items-center justify-between rounded-xl bg-blue-50 p-4 dark:bg-blue-950/40"
            data-capacitacion={`${prefijoCapacitacion}.saldo-actual`}
          >
            <span className="flex items-center gap-2 text-sm text-blue-900 dark:text-blue-100">
              <Banknote size={19} /> {es ? "Saldo actual" : "Current balance"}
            </span>
            <strong className="text-xl text-blue-800 dark:text-blue-200">
              {dinero.format(saldo)}
            </strong>
          </div>
          <section
            className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20"
            data-capacitacion={`${prefijoCapacitacion}.pedidos-pendientes`}
          >
            <div className="flex items-start gap-3">
              <ClipboardList className="mt-0.5 text-amber-700" size={20} />
              <div className="min-w-0 flex-1">
                <strong className="block text-sm text-amber-950 dark:text-amber-100">
                  {cargandoPedidos
                    ? es
                      ? "Consultando pedidos…"
                      : "Loading orders…"
                    : errorPedidos
                      ? es
                        ? "Pedidos no disponibles"
                        : "Orders unavailable"
                      : pedidos.length === 0
                        ? es
                          ? "Sin pedidos pendientes"
                          : "No pending orders"
                        : es
                          ? `${pedidos.length} pedido${pedidos.length === 1 ? "" : "s"} pendiente${pedidos.length === 1 ? "" : "s"}`
                          : `${pedidos.length} pending order${pedidos.length === 1 ? "" : "s"}`}
                </strong>
                <p className="mt-1 text-xs leading-5 text-amber-900 dark:text-amber-200">
                  {errorPedidos
                    ? errorPedidos
                    : pedidos.length === 0 && !cargandoPedidos
                      ? es
                        ? "Puedes registrar el abono sin acciones adicionales."
                        : "You can record the payment without additional actions."
                      : es
                        ? "Todavía no forman parte del saldo. Al entregarlos se crea la venta y, si es crédito, el saldo aumenta automáticamente."
                        : "They are not part of the balance yet. Delivery creates the sale and credit balance."}
                </p>
              </div>
            </div>
            {errorPedidos && (
              <button
                type="button"
                className="boton-secundario mt-3"
                onClick={() => establecerIntentoPedidos((actual) => actual + 1)}
                data-capacitacion={`${prefijoCapacitacion}.pedidos-reintentar`}
              >
                {es ? "Reintentar consulta" : "Retry"}
              </button>
            )}
            {!cargandoPedidos && (
              <div className="mt-3 space-y-2">
                {pedidos.map((pedido) => (
                  <Link
                    key={pedido.id}
                    href={`/pedidos?pedido=${pedido.id}&accion=gestionar`}
                    className="flex items-center justify-between gap-3 rounded-lg bg-white p-3 text-sm shadow-sm transition hover:ring-2 hover:ring-blue-300 dark:bg-slate-900"
                    data-capacitacion={`${prefijoCapacitacion}.pedido.opcion`}
                  >
                    <span className="min-w-0">
                      <strong className="block truncate">{pedido.folio}</strong>
                      <small className="text-slate-500">
                        {es
                          ? (etiquetaEstadoPedido[pedido.estado] ??
                            pedido.estado)
                          : pedido.estado}
                        {" · "}
                        {pedido.items
                          .map(
                            (item) => `${item.cantidad}× ${item.descripcion}`,
                          )
                          .join(", ")}
                      </small>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 font-semibold text-blue-700">
                      {es ? "Atender" : "Open"} <ArrowRight size={16} />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
          {saldo > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="etiqueta">
                  {es ? "Monto recibido" : "Amount received"}
                </span>
                <div className="flex gap-2">
                  <input
                    className="campo"
                    type="number"
                    min="0.01"
                    max={saldo}
                    step="0.01"
                    value={monto}
                    onChange={(evento) => establecerMonto(evento.target.value)}
                    autoFocus
                    required
                    data-capacitacion={`${prefijoCapacitacion}.monto`}
                  />
                  <button
                    type="button"
                    className="boton-secundario whitespace-nowrap px-3"
                    onClick={() => establecerMonto(String(saldo))}
                    data-capacitacion={`${prefijoCapacitacion}.liquidar`}
                  >
                    {es ? "Liquidar" : "Pay off"}
                  </button>
                </div>
              </label>
              <label>
                <span className="etiqueta">{es ? "Método" : "Method"}</span>
                <select
                  className="campo"
                  value={metodo}
                  onChange={(evento) => establecerMetodo(evento.target.value)}
                  data-capacitacion={`${prefijoCapacitacion}.metodo`}
                >
                  <option
                    value="EFECTIVO"
                    data-capacitacion={`${prefijoCapacitacion}.metodo.opcion`}
                  >
                    {es ? "Efectivo" : "Cash"}
                  </option>
                  <option
                    value="TRANSFERENCIA"
                    data-capacitacion={`${prefijoCapacitacion}.metodo.opcion`}
                  >
                    {es ? "Transferencia" : "Transfer"}
                  </option>
                  <option
                    value="TARJETA"
                    data-capacitacion={`${prefijoCapacitacion}.metodo.opcion`}
                  >
                    {es ? "Tarjeta" : "Card"}
                  </option>
                  <option
                    value="OTRO"
                    data-capacitacion={`${prefijoCapacitacion}.metodo.opcion`}
                  >
                    {es ? "Otro" : "Other"}
                  </option>
                </select>
              </label>
              {metodo !== "EFECTIVO" && (
                <label className="sm:col-span-2">
                  <span className="etiqueta">
                    {es ? "Referencia (opcional)" : "Reference (optional)"}
                  </span>
                  <input
                    className="campo"
                    maxLength={120}
                    value={referencia}
                    onChange={(evento) =>
                      establecerReferencia(evento.target.value)
                    }
                    data-capacitacion={`${prefijoCapacitacion}.referencia`}
                    placeholder={
                      es
                        ? "Folio o últimos dígitos"
                        : "Reference or last digits"
                    }
                  />
                </label>
              )}
            </div>
          ) : (
            <p
              className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
              data-capacitacion={`${prefijoCapacitacion}.sin-saldo`}
            >
              {es
                ? "Este cliente está al corriente y no tiene saldo pendiente."
                : "This customer is current and has no outstanding balance."}
            </p>
          )}
        </>
      )}

      <div
        className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end"
        data-capacitacion={`${prefijoCapacitacion}.revision`}
      >
        <button
          type="button"
          className="boton-secundario"
          onClick={alCancelar}
          data-capacitacion={`${prefijoCapacitacion}.cancelar`}
        >
          {es ? "Cancelar" : "Cancel"}
        </button>
        <button
          className="boton-primario"
          disabled={
            guardando ||
            !cliente ||
            saldo <= 0 ||
            Number(monto) <= 0 ||
            Number(monto) > saldo
          }
          data-capacitacion={`${prefijoCapacitacion}.guardar`}
        >
          {guardando
            ? es
              ? "Registrando…"
              : "Recording…"
            : es
              ? "Registrar abono"
              : "Record payment"}
        </button>
      </div>
    </form>
  );
}
