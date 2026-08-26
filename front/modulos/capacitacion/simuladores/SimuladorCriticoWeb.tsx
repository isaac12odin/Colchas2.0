"use client";

import {
  AlertTriangle,
  Banknote,
  Box,
  Camera,
  CheckCircle2,
  CircleDollarSign,
  CloudUpload,
  CreditCard,
  PackageCheck,
  RefreshCw,
  Search,
  ShoppingCart,
  UserRound,
} from "lucide-react";
import { useState } from "react";

import { IndicadorPasosVenta } from "@/modulos/ventas/formulario/IndicadorPasosVenta";
import { PasoTipoVenta } from "@/modulos/ventas/formulario/PasoTipoVenta";
import type { TipoSimuladorCapacitacion } from "../tipos";
import {
  calcularDevolucionSimulada,
  type CapturaAbonoSimulado,
  type CapturaDevolucionSimulada,
  type CapturaEntregaSimulada,
  type CapturaVentaCreditoSimulada,
  type DecisionConflictoSimulado,
  fechaSugeridaSimulador,
  type RetroalimentacionSimulador,
  validarAbonoSimulado,
  validarConflictoSincronizacion,
  validarDevolucionSimulada,
  validarEntregaSimulada,
  validarVentaCreditoSimulada,
} from "./dominio";

type Idioma = "es" | "en";

export function SimuladorCriticoWeb({
  tipo,
  idioma,
  alCompletar,
}: {
  tipo: TipoSimuladorCapacitacion;
  idioma: Idioma;
  alCompletar: () => void;
}) {
  const propiedades = { idioma, alCompletar };
  switch (tipo) {
    case "VENTA_CREDITO":
      return <SimuladorVentaCredito {...propiedades} />;
    case "ABONO":
      return <SimuladorAbono {...propiedades} />;
    case "ENTREGA_PEDIDO":
      return <SimuladorEntrega {...propiedades} />;
    case "DEVOLUCION":
      return <SimuladorDevolucion {...propiedades} />;
    case "SINCRONIZACION_CORRECCION":
      return <SimuladorSincronizacion {...propiedades} />;
  }
}

function MarcoSimulador({
  titulo,
  subtitulo,
  icono,
  testId,
  idioma,
  children,
}: {
  titulo: string;
  subtitulo: string;
  icono: React.ReactNode;
  testId: string;
  idioma: Idioma;
  children: React.ReactNode;
}) {
  const es = idioma === "es";
  return (
    <div
      className="bg-slate-100 p-3 dark:bg-slate-900 sm:p-6"
      data-testid={testId}
    >
      <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-slate-950">
        <header className="flex flex-col gap-3 border-b bg-slate-50 p-5 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600 text-white">
              {icono}
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-blue-600">
                Vektra · {subtitulo}
              </p>
              <h3 className="mt-1 text-xl font-black">{titulo}</h3>
            </div>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            {es ? "DATOS DE PRÁCTICA · SIN API" : "PRACTICE DATA · NO API"}
          </span>
        </header>
        <div className="p-5 sm:p-7">{children}</div>
      </div>
    </div>
  );
}

function Retroalimentacion({
  valor,
  consecuencia,
  idioma,
  alCompletar,
}: {
  valor: RetroalimentacionSimulador | null;
  consecuencia?: React.ReactNode;
  idioma: Idioma;
  alCompletar: () => void;
}) {
  if (!valor) return null;
  const es = idioma === "es";
  return (
    <div
      className={`mt-5 rounded-2xl border p-4 ${
        valor.correcta
          ? "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-100"
          : "border-red-200 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/35 dark:text-red-100"
      }`}
      data-testid={
        valor.correcta
          ? "retroalimentacion-correcta"
          : "retroalimentacion-error"
      }
      role="status"
    >
      <div className="flex items-start gap-3">
        {valor.correcta ? (
          <CheckCircle2
            className="mt-0.5 shrink-0 text-emerald-600"
            size={20}
          />
        ) : (
          <AlertTriangle className="mt-0.5 shrink-0 text-red-600" size={20} />
        )}
        <div className="flex-1">
          <strong className="block text-sm">
            {valor.correcta
              ? es
                ? "Decisión correcta"
                : "Correct decision"
              : es
                ? "Revisa esta decisión"
                : "Review this decision"}
          </strong>
          <p className="mt-1 text-sm leading-6">{valor.mensaje[idioma]}</p>
          {valor.correcta && consecuencia}
        </div>
      </div>
      {valor.correcta && (
        <div className="mt-4 flex justify-end">
          <button className="boton-primario" onClick={alCompletar}>
            <CheckCircle2 size={18} />
            {es ? "Completar práctica" : "Complete practice"}
          </button>
        </div>
      )}
    </div>
  );
}

function Metricas({
  valores,
}: {
  valores: { etiqueta: string; antes: string; despues: string }[];
}) {
  return (
    <div
      className="mt-4 grid gap-2 sm:grid-cols-3"
      data-testid="consecuencias-simuladas"
    >
      {valores.map((valor) => (
        <div
          key={valor.etiqueta}
          className="rounded-xl bg-white p-3 shadow-sm dark:bg-slate-900"
        >
          <span className="text-[10px] font-black uppercase text-slate-500">
            {valor.etiqueta}
          </span>
          <div className="mt-1 flex items-center gap-2 text-sm font-black">
            <span className="text-slate-400 line-through">{valor.antes}</span>
            <span>→</span>
            <span className="text-blue-700 dark:text-blue-300">
              {valor.despues}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SimuladorVentaCredito({
  idioma,
  alCompletar,
}: {
  idioma: Idioma;
  alCompletar: () => void;
}) {
  const es = idioma === "es";
  const [paso, setPaso] = useState(1);
  const [retro, setRetro] = useState<RetroalimentacionSimulador | null>(null);
  const [captura, setCaptura] = useState<CapturaVentaCreditoSimulada>({
    clienteId: "",
    productoId: "",
    cantidad: 1,
    anticipo: 0,
    numeroTarjeta: "",
    cuota: 0,
    periodicidad: "",
    primerVencimiento: fechaSugeridaSimulador(),
  });
  const total = captura.cantidad * 1200;
  const financiado = total - captura.anticipo;

  return (
    <MarcoSimulador
      titulo={es ? "Nueva venta" : "New sale"}
      subtitulo={es ? "Ventas" : "Sales"}
      icono={<ShoppingCart size={22} />}
      testId="simulador-venta-credito"
      idioma={idioma}
    >
      <IndicadorPasosVenta paso={paso} es={es} />
      {paso === 1 && (
        <>
          <PasoTipoVenta
            es={es}
            alElegir={(credito) => {
              if (!credito) {
                setRetro({
                  correcta: false,
                  mensaje: {
                    es: "La misión pide una venta a crédito. Contado cobra todo y no aumenta el saldo.",
                    en: "This mission requires a credit sale. Cash collects the full amount and does not increase balance.",
                  },
                });
                return;
              }
              setRetro(null);
              setPaso(2);
            }}
          />
          <Retroalimentacion
            valor={retro}
            idioma={idioma}
            alCompletar={alCompletar}
          />
        </>
      )}
      {paso === 2 && (
        <div className="space-y-5">
          <section className="rounded-2xl border p-4">
            <h4 className="flex items-center gap-2 font-black">
              <UserRound size={18} className="text-blue-600" />
              {es ? "Cliente" : "Customer"}
            </h4>
            <label className="mt-3 block">
              <span className="etiqueta">
                {es
                  ? "Buscar por nombre, teléfono o tarjeta"
                  : "Search by name, phone, or card"}
              </span>
              <select
                className="campo"
                aria-label={es ? "Cliente" : "Customer"}
                value={captura.clienteId}
                onChange={(e) =>
                  setCaptura({ ...captura, clienteId: e.target.value })
                }
              >
                <option value="">
                  {es ? "Selecciona una clienta" : "Select a customer"}
                </option>
                <option value="ana">
                  Ana López · 555 010 2244 · saldo $500
                </option>
              </select>
            </label>
          </section>
          <section className="rounded-2xl border p-4">
            <h4 className="flex items-center gap-2 font-black">
              <Box size={18} className="text-blue-600" />
              {es ? "Productos" : "Products"}
            </h4>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_130px]">
              <label>
                <span className="etiqueta">
                  {es ? "Producto registrado" : "Registered product"}
                </span>
                <select
                  className="campo"
                  aria-label={es ? "Producto" : "Product"}
                  value={captura.productoId}
                  onChange={(e) =>
                    setCaptura({ ...captura, productoId: e.target.value })
                  }
                >
                  <option value="">
                    {es ? "Buscar producto" : "Search product"}
                  </option>
                  <option value="colcha">
                    Colcha Viena azul · $1,200 · 3 disponibles
                  </option>
                </select>
              </label>
              <label>
                <span className="etiqueta">{es ? "Cantidad" : "Quantity"}</span>
                <input
                  className="campo"
                  aria-label={es ? "Cantidad" : "Quantity"}
                  type="number"
                  min="1"
                  value={captura.cantidad}
                  onChange={(e) =>
                    setCaptura({ ...captura, cantidad: Number(e.target.value) })
                  }
                />
              </label>
            </div>
          </section>
          <div className="flex justify-end">
            <button
              className="boton-primario"
              onClick={() => {
                if (
                  !captura.clienteId ||
                  !captura.productoId ||
                  captura.cantidad < 1 ||
                  captura.cantidad > 3
                ) {
                  setRetro(validarVentaCreditoSimulada(captura));
                  return;
                }
                setRetro(null);
                setPaso(3);
              }}
            >
              {es ? "Continuar al cobro" : "Continue to payment"}
            </button>
          </div>
          <Retroalimentacion
            valor={retro}
            idioma={idioma}
            alCompletar={alCompletar}
          />
        </div>
      )}
      {paso === 3 && (
        <div className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
          <section className="rounded-2xl border p-5">
            <h4 className="flex items-center gap-2 font-black">
              <CreditCard size={18} className="text-blue-600" />
              {es ? "Crédito y plan" : "Credit and plan"}
            </h4>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <CampoNumero
                etiqueta={es ? "Anticipo" : "Deposit"}
                valor={captura.anticipo}
                alCambiar={(anticipo) => setCaptura({ ...captura, anticipo })}
              />
              <CampoTexto
                etiqueta={es ? "Número de tarjeta" : "Card number"}
                valor={captura.numeroTarjeta}
                alCambiar={(numeroTarjeta) =>
                  setCaptura({ ...captura, numeroTarjeta })
                }
                placeholder="0042"
              />
              <label>
                <span className="etiqueta">
                  {es ? "Periodicidad" : "Frequency"}
                </span>
                <select
                  className="campo"
                  aria-label={es ? "Periodicidad" : "Frequency"}
                  value={captura.periodicidad}
                  onChange={(e) =>
                    setCaptura({
                      ...captura,
                      periodicidad: e.target
                        .value as CapturaVentaCreditoSimulada["periodicidad"],
                    })
                  }
                >
                  <option value="">{es ? "Selecciona" : "Select"}</option>
                  <option value="SEMANAL">{es ? "Semanal" : "Weekly"}</option>
                  <option value="QUINCENAL">
                    {es ? "Quincenal" : "Biweekly"}
                  </option>
                  <option value="MENSUAL">{es ? "Mensual" : "Monthly"}</option>
                </select>
              </label>
              <CampoNumero
                etiqueta={es ? "Cuota" : "Installment"}
                valor={captura.cuota}
                alCambiar={(cuota) => setCaptura({ ...captura, cuota })}
              />
              <CampoTexto
                etiqueta={es ? "Primer vencimiento" : "First due date"}
                valor={captura.primerVencimiento}
                alCambiar={(primerVencimiento) =>
                  setCaptura({ ...captura, primerVencimiento })
                }
                tipo="date"
              />
            </div>
          </section>
          <aside className="rounded-2xl bg-blue-50 p-5 dark:bg-blue-950/30">
            <p className="text-xs font-black uppercase text-blue-600">
              {es ? "Resumen antes de confirmar" : "Review before confirmation"}
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <FilaResumen
                etiqueta={es ? "Total" : "Total"}
                valor={`$${total.toFixed(2)}`}
              />
              <FilaResumen
                etiqueta={es ? "Anticipo al corte" : "Deposit to closing"}
                valor={`$${captura.anticipo.toFixed(2)}`}
              />
              <FilaResumen
                etiqueta={es ? "Saldo financiado" : "Financed balance"}
                valor={`$${Math.max(0, financiado).toFixed(2)}`}
                destacado
              />
            </dl>
            <button
              className="boton-primario mt-5 w-full"
              onClick={() => setRetro(validarVentaCreditoSimulada(captura))}
            >
              {es ? "Confirmar venta de práctica" : "Confirm practice sale"}
            </button>
          </aside>
          <div className="lg:col-span-2">
            <Retroalimentacion
              valor={retro}
              idioma={idioma}
              alCompletar={alCompletar}
              consecuencia={
                retro?.correcta ? (
                  <Metricas
                    valores={[
                      {
                        etiqueta: es ? "Saldo cliente" : "Customer balance",
                        antes: "$500",
                        despues: `$${(500 + financiado).toFixed(0)}`,
                      },
                      {
                        etiqueta: es ? "Inventario" : "Stock",
                        antes: "3",
                        despues: String(3 - captura.cantidad),
                      },
                      {
                        etiqueta: es ? "Corte" : "Closing",
                        antes: "$0",
                        despues: `$${captura.anticipo.toFixed(0)}`,
                      },
                    ]}
                  />
                ) : undefined
              }
            />
          </div>
        </div>
      )}
    </MarcoSimulador>
  );
}

function SimuladorAbono({
  idioma,
  alCompletar,
}: {
  idioma: Idioma;
  alCompletar: () => void;
}) {
  const es = idioma === "es";
  const [retro, setRetro] = useState<RetroalimentacionSimulador | null>(null);
  const [captura, setCaptura] = useState<CapturaAbonoSimulado>({
    clienteId: "",
    monto: 0,
    metodo: "EFECTIVO",
    referencia: "",
  });
  return (
    <MarcoSimulador
      titulo={es ? "Capturar abono" : "Record payment"}
      subtitulo={es ? "Cobranza" : "Collections"}
      icono={<CircleDollarSign size={22} />}
      testId="simulador-abono"
      idioma={idioma}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_.78fr]">
        <section className="rounded-2xl border p-5">
          <label>
            <span className="etiqueta">
              {es
                ? "Buscar cliente por nombre, teléfono o tarjeta"
                : "Search customer by name, phone, or card"}
            </span>
            <select
              className="campo"
              aria-label={es ? "Cliente" : "Customer"}
              value={captura.clienteId}
              onChange={(e) =>
                setCaptura({ ...captura, clienteId: e.target.value })
              }
            >
              <option value="">{es ? "Selecciona" : "Select"}</option>
              <option value="ana">Ana López · tarjeta 0042</option>
            </select>
          </label>
          <div className="mt-4 rounded-xl bg-blue-50 p-4 dark:bg-blue-950/30">
            <span className="text-xs font-bold text-slate-500">
              {es ? "Saldo actual" : "Current balance"}
            </span>
            <strong className="mt-1 block text-2xl text-blue-700">
              $800.00
            </strong>
            <span className="mt-2 block text-xs text-amber-700">
              {es
                ? "Pedido pendiente: Colcha Nórdica (aún no genera deuda)"
                : "Pending order: Nordic bedspread (not debt yet)"}
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <CampoNumero
              etiqueta={es ? "Monto del abono" : "Payment amount"}
              valor={captura.monto}
              alCambiar={(monto) => setCaptura({ ...captura, monto })}
            />
            <label>
              <span className="etiqueta">{es ? "Método" : "Method"}</span>
              <select
                className="campo"
                aria-label={es ? "Método" : "Method"}
                value={captura.metodo}
                onChange={(e) =>
                  setCaptura({
                    ...captura,
                    metodo: e.target.value as CapturaAbonoSimulado["metodo"],
                  })
                }
              >
                <option value="EFECTIVO">{es ? "Efectivo" : "Cash"}</option>
                <option value="TRANSFERENCIA">
                  {es ? "Transferencia" : "Transfer"}
                </option>
                <option value="TARJETA">{es ? "Tarjeta" : "Card"}</option>
              </select>
            </label>
            {captura.metodo !== "EFECTIVO" && (
              <CampoTexto
                etiqueta={es ? "Referencia" : "Reference"}
                valor={captura.referencia}
                alCambiar={(referencia) =>
                  setCaptura({ ...captura, referencia })
                }
                placeholder="TRX-1234"
              />
            )}
          </div>
        </section>
        <aside className="rounded-2xl bg-slate-950 p-5 text-white">
          <p className="text-xs font-black uppercase tracking-wide text-blue-300">
            {es ? "Resultado proyectado" : "Projected result"}
          </p>
          <p className="mt-6 text-sm text-slate-300">
            {es ? "Saldo después del abono" : "Balance after payment"}
          </p>
          <p className="mt-1 text-3xl font-black">
            ${Math.max(0, 800 - captura.monto).toFixed(2)}
          </p>
          <p className="mt-5 text-xs leading-5 text-slate-400">
            {es
              ? "El método seleccionado debe aparecer igual en el corte del cobrador."
              : "The selected method must appear unchanged in the collector closing."}
          </p>
          <button
            className="boton-primario mt-6 w-full"
            onClick={() => setRetro(validarAbonoSimulado(captura))}
          >
            {es ? "Registrar abono de práctica" : "Record practice payment"}
          </button>
        </aside>
      </div>
      <Retroalimentacion
        valor={retro}
        idioma={idioma}
        alCompletar={alCompletar}
        consecuencia={
          retro?.correcta ? (
            <Metricas
              valores={[
                {
                  etiqueta: es ? "Saldo" : "Balance",
                  antes: "$800",
                  despues: `$${(800 - captura.monto).toFixed(0)}`,
                },
                {
                  etiqueta: es ? "Corte" : "Closing",
                  antes: "$0",
                  despues: `$${captura.monto.toFixed(0)}`,
                },
                {
                  etiqueta: es ? "Pedido" : "Order",
                  antes: es ? "Pendiente" : "Pending",
                  despues: es ? "Sin cambio" : "Unchanged",
                },
              ]}
            />
          ) : undefined
        }
      />
    </MarcoSimulador>
  );
}

function SimuladorEntrega({
  idioma,
  alCompletar,
}: {
  idioma: Idioma;
  alCompletar: () => void;
}) {
  const es = idioma === "es";
  const [retro, setRetro] = useState<RetroalimentacionSimulador | null>(null);
  const [captura, setCaptura] = useState<CapturaEntregaSimulada>({
    tipo: "CREDITO",
    anticipo: 0,
    numeroTarjeta: "",
    cuota: 0,
    periodicidad: "",
    primerVencimiento: fechaSugeridaSimulador(),
  });
  const saldo = captura.tipo === "CREDITO" ? 1000 - captura.anticipo : 0;
  return (
    <MarcoSimulador
      titulo={es ? "Entregar pedido PED-1042" : "Deliver order PED-1042"}
      subtitulo={es ? "Pedidos" : "Orders"}
      icono={<PackageCheck size={22} />}
      testId="simulador-entrega-pedido"
      idioma={idioma}
    >
      <div className="rounded-2xl border p-4">
        <div className="grid gap-3 text-sm sm:grid-cols-4">
          <FilaDato etiqueta={es ? "Cliente" : "Customer"} valor="Ana López" />
          <FilaDato
            etiqueta={es ? "Producto" : "Product"}
            valor="Colcha Nórdica"
          />
          <FilaDato
            etiqueta={es ? "Proveedor" : "Supplier"}
            valor="Textiles del Centro"
          />
          <FilaDato etiqueta="Total" valor="$1,000.00" />
        </div>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_.75fr]">
        <section className="rounded-2xl border p-5">
          <span className="etiqueta">
            {es ? "¿Cómo se entrega?" : "How is it delivered?"}
          </span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["CONTADO", "CREDITO"] as const).map((tipo) => (
              <button
                key={tipo}
                type="button"
                className={
                  captura.tipo === tipo ? "boton-primario" : "boton-secundario"
                }
                onClick={() =>
                  setCaptura({
                    ...captura,
                    tipo,
                    anticipo: tipo === "CONTADO" ? 1000 : 0,
                  })
                }
              >
                {tipo === "CONTADO" ? (
                  <Banknote size={17} />
                ) : (
                  <CreditCard size={17} />
                )}
                {tipo === "CONTADO"
                  ? es
                    ? "Contado"
                    : "Cash"
                  : es
                    ? "Crédito"
                    : "Credit"}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <CampoNumero
              etiqueta={
                captura.tipo === "CONTADO"
                  ? es
                    ? "Cobro total"
                    : "Full payment"
                  : es
                    ? "Anticipo"
                    : "Deposit"
              }
              valor={captura.anticipo}
              alCambiar={(anticipo) => setCaptura({ ...captura, anticipo })}
            />
            {captura.tipo === "CREDITO" && (
              <>
                <CampoTexto
                  etiqueta={es ? "Número de tarjeta" : "Card number"}
                  valor={captura.numeroTarjeta}
                  alCambiar={(numeroTarjeta) =>
                    setCaptura({ ...captura, numeroTarjeta })
                  }
                  placeholder="0042"
                />
                <label>
                  <span className="etiqueta">
                    {es ? "Periodicidad" : "Frequency"}
                  </span>
                  <select
                    className="campo"
                    aria-label={es ? "Periodicidad" : "Frequency"}
                    value={captura.periodicidad}
                    onChange={(e) =>
                      setCaptura({
                        ...captura,
                        periodicidad: e.target
                          .value as CapturaEntregaSimulada["periodicidad"],
                      })
                    }
                  >
                    <option value="">{es ? "Selecciona" : "Select"}</option>
                    <option value="SEMANAL">{es ? "Semanal" : "Weekly"}</option>
                    <option value="QUINCENAL">
                      {es ? "Quincenal" : "Biweekly"}
                    </option>
                    <option value="MENSUAL">
                      {es ? "Mensual" : "Monthly"}
                    </option>
                  </select>
                </label>
                <CampoNumero
                  etiqueta={es ? "Cuota" : "Installment"}
                  valor={captura.cuota}
                  alCambiar={(cuota) => setCaptura({ ...captura, cuota })}
                />
                <CampoTexto
                  etiqueta={es ? "Primer vencimiento" : "First due date"}
                  valor={captura.primerVencimiento}
                  alCambiar={(primerVencimiento) =>
                    setCaptura({ ...captura, primerVencimiento })
                  }
                  tipo="date"
                />
              </>
            )}
          </div>
        </section>
        <aside className="rounded-2xl bg-blue-50 p-5 dark:bg-blue-950/30">
          <p className="text-xs font-black uppercase text-blue-600">
            {es ? "Al confirmar" : "On confirmation"}
          </p>
          <div className="mt-4 space-y-3">
            <FilaResumen
              etiqueta={es ? "Venta creada" : "Sale created"}
              valor="$1,000"
            />
            <FilaResumen
              etiqueta={es ? "Saldo nuevo" : "New balance"}
              valor={`$${Math.max(0, saldo).toFixed(0)}`}
              destacado
            />
            <FilaResumen etiqueta={es ? "Inventario" : "Stock"} valor="2 → 1" />
          </div>
          <button
            className="boton-primario mt-5 w-full"
            onClick={() => setRetro(validarEntregaSimulada(captura))}
          >
            {es ? "Confirmar entrega de práctica" : "Confirm practice delivery"}
          </button>
        </aside>
      </div>
      <Retroalimentacion
        valor={retro}
        idioma={idioma}
        alCompletar={alCompletar}
        consecuencia={
          retro?.correcta ? (
            <Metricas
              valores={[
                {
                  etiqueta: es ? "Pedido" : "Order",
                  antes: es ? "Listo" : "Ready",
                  despues: es ? "Entregado" : "Delivered",
                },
                {
                  etiqueta: es ? "Saldo" : "Balance",
                  antes: "$0",
                  despues: `$${saldo.toFixed(0)}`,
                },
                { etiqueta: es ? "Stock" : "Stock", antes: "2", despues: "1" },
              ]}
            />
          ) : undefined
        }
      />
    </MarcoSimulador>
  );
}

function SimuladorDevolucion({
  idioma,
  alCompletar,
}: {
  idioma: Idioma;
  alCompletar: () => void;
}) {
  const es = idioma === "es";
  const [retro, setRetro] = useState<RetroalimentacionSimulador | null>(null);
  const [captura, setCaptura] = useState<CapturaDevolucionSimulada>({
    cantidad: 1,
    motivo: "",
    evidencia: false,
    autorizador: "",
    operadorCaja: "",
  });
  const importes = calcularDevolucionSimulada(captura.cantidad);
  return (
    <MarcoSimulador
      titulo={es ? "Nueva devolución" : "New return"}
      subtitulo={es ? "Devoluciones" : "Returns"}
      icono={<RefreshCw size={22} />}
      testId="simulador-devolucion"
      idioma={idioma}
    >
      <div className="flex items-center gap-3 rounded-xl bg-slate-100 p-3 dark:bg-slate-900">
        <Search size={18} className="text-blue-600" />
        <div>
          <span className="text-[10px] font-black uppercase text-slate-500">
            {es ? "Venta encontrada" : "Sale found"}
          </span>
          <strong className="block text-sm">
            VTA-2048 · Ana López · 2 Cobertores Roma
          </strong>
        </div>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_.8fr]">
        <section className="rounded-2xl border p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <CampoNumero
              etiqueta={es ? "Cantidad a devolver" : "Quantity to return"}
              valor={captura.cantidad}
              alCambiar={(cantidad) => setCaptura({ ...captura, cantidad })}
            />
            <CampoTexto
              etiqueta={es ? "Motivo detallado" : "Detailed reason"}
              valor={captura.motivo}
              alCambiar={(motivo) => setCaptura({ ...captura, motivo })}
              placeholder={
                es
                  ? "Ej. costura abierta al entregar"
                  : "E.g. seam open at delivery"
              }
            />
          </div>
          <button
            type="button"
            className={`mt-4 min-h-24 w-full rounded-2xl border-2 border-dashed p-4 text-sm font-bold ${captura.evidencia ? "border-emerald-400 bg-emerald-50 text-emerald-800" : "border-slate-300 text-slate-500"}`}
            onClick={() => setCaptura({ ...captura, evidencia: true })}
            aria-label={es ? "Adjuntar fotografía" : "Attach photo"}
          >
            <Camera className="mx-auto mb-2" size={24} />
            {captura.evidencia
              ? es
                ? "evidencia-devolucion.jpg adjunta"
                : "return-evidence.jpg attached"
              : es
                ? "Adjuntar fotografía de evidencia"
                : "Attach photo evidence"}
          </button>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label>
              <span className="etiqueta">
                {es ? "Autoriza" : "Authorized by"}
              </span>
              <select
                className="campo"
                aria-label={es ? "Autoriza" : "Authorized by"}
                value={captura.autorizador}
                onChange={(e) =>
                  setCaptura({
                    ...captura,
                    autorizador: e.target
                      .value as CapturaDevolucionSimulada["autorizador"],
                  })
                }
              >
                <option value="">{es ? "Selecciona" : "Select"}</option>
                <option value="ADMINISTRADOR">
                  {es ? "Administración" : "Administration"}
                </option>
                <option value="CONTABLE">
                  {es ? "Contabilidad" : "Accounting"}
                </option>
                <option value="ALMACENISTA">
                  {es ? "Almacén (sin permiso)" : "Warehouse (not allowed)"}
                </option>
              </select>
            </label>
            <label>
              <span className="etiqueta">
                {es ? "Caja que entrega el dinero" : "Cash desk issuing money"}
              </span>
              <select
                className="campo"
                aria-label={
                  es ? "Caja que entrega el dinero" : "Cash desk issuing money"
                }
                value={captura.operadorCaja}
                onChange={(e) =>
                  setCaptura({
                    ...captura,
                    operadorCaja: e.target
                      .value as CapturaDevolucionSimulada["operadorCaja"],
                  })
                }
              >
                <option value="">{es ? "Selecciona" : "Select"}</option>
                <option value="ADMINISTRADOR">
                  {es ? "Caja Administración" : "Administration cash desk"}
                </option>
                <option value="COBRADOR">
                  {es ? "Caja Cobrador" : "Collector cash desk"}
                </option>
                <option value="CONTABLE">
                  {es
                    ? "Contabilidad (no opera caja)"
                    : "Accounting (no cash desk)"}
                </option>
              </select>
            </label>
          </div>
        </section>
        <aside className="rounded-2xl bg-amber-50 p-5 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="text-xs font-black uppercase text-amber-700 dark:text-amber-300">
            {es ? "Aplicación segura" : "Safe application"}
          </p>
          <div className="mt-4 space-y-3">
            <FilaResumen
              etiqueta={es ? "Importe devolución" : "Return amount"}
              valor={`$${importes.total.toFixed(0)}`}
            />
            <FilaResumen
              etiqueta={es ? "Compensa saldo" : "Offsets balance"}
              valor={`$${importes.aplicadoSaldo.toFixed(0)}`}
            />
            <FilaResumen
              etiqueta={es ? "Reembolso de caja" : "Cash refund"}
              valor={`$${importes.reembolso.toFixed(0)}`}
              destacado
            />
          </div>
          <p className="mt-4 text-xs leading-5">
            {es
              ? "Quien autoriza y quien entrega dinero son responsabilidades distintas."
              : "The authorizer and the person issuing money are separate responsibilities."}
          </p>
          <button
            className="boton-primario mt-5 w-full"
            onClick={() => setRetro(validarDevolucionSimulada(captura))}
          >
            {es
              ? "Autorizar devolución de práctica"
              : "Authorize practice return"}
          </button>
        </aside>
      </div>
      <Retroalimentacion
        valor={retro}
        idioma={idioma}
        alCompletar={alCompletar}
        consecuencia={
          retro?.correcta ? (
            <Metricas
              valores={[
                {
                  etiqueta: es ? "Saldo cliente" : "Customer balance",
                  antes: "$600",
                  despues: `$${Math.max(0, 600 - importes.aplicadoSaldo).toFixed(0)}`,
                },
                {
                  etiqueta: es ? "Inventario" : "Stock",
                  antes: "5",
                  despues: String(5 + captura.cantidad),
                },
                {
                  etiqueta: es ? "Corte operador" : "Operator closing",
                  antes: "$900",
                  despues: `$${(900 - importes.reembolso).toFixed(0)}`,
                },
              ]}
            />
          ) : undefined
        }
      />
    </MarcoSimulador>
  );
}

function SimuladorSincronizacion({
  idioma,
  alCompletar,
}: {
  idioma: Idioma;
  alCompletar: () => void;
}) {
  const es = idioma === "es";
  const [sincronizado, setSincronizado] = useState(false);
  const [decision, setDecision] = useState<DecisionConflictoSimulado>("");
  const [retro, setRetro] = useState<RetroalimentacionSimulador | null>(null);
  return (
    <MarcoSimulador
      titulo={es ? "Sincronización y conflictos" : "Sync and conflicts"}
      subtitulo={es ? "Trabajo offline" : "Offline work"}
      icono={<CloudUpload size={22} />}
      testId="simulador-sincronizacion"
      idioma={idioma}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <EstadoOperacion
          titulo={es ? "Abono LOC-801" : "Payment LOC-801"}
          detalle="$300 · Ana López"
          estado={
            sincronizado
              ? es
                ? "Confirmado"
                : "Confirmed"
              : es
                ? "Pendiente"
                : "Pending"
          }
          tono={sincronizado ? "bien" : "pendiente"}
        />
        <EstadoOperacion
          titulo={es ? "Venta LOC-802" : "Sale LOC-802"}
          detalle={
            es
              ? "Colcha Viena · stock local 1"
              : "Vienna bedspread · local stock 1"
          }
          estado={
            sincronizado
              ? es
                ? "Conflicto"
                : "Conflict"
              : es
                ? "Pendiente"
                : "Pending"
          }
          tono={sincronizado ? "error" : "pendiente"}
        />
        <EstadoOperacion
          titulo={es ? "Visita LOC-803" : "Visit LOC-803"}
          detalle={
            es ? "No abonó · evidencia local" : "No payment · local evidence"
          }
          estado={
            sincronizado
              ? es
                ? "Confirmada"
                : "Confirmed"
              : es
                ? "Pendiente"
                : "Pending"
          }
          tono={sincronizado ? "bien" : "pendiente"}
        />
      </div>
      {!sincronizado ? (
        <div className="mt-5 rounded-2xl border p-5 text-center">
          <RefreshCw className="mx-auto text-blue-600" size={30} />
          <p className="mt-3 text-sm font-bold">
            {es
              ? "3 movimientos cifrados esperan conexión"
              : "3 encrypted operations await connectivity"}
          </p>
          <button
            className="boton-primario mt-4"
            onClick={() => {
              setSincronizado(true);
              setRetro(null);
            }}
          >
            {es
              ? "Enviar pendientes de práctica"
              : "Send practice pending operations"}
          </button>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_.8fr]">
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-950 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 shrink-0 text-red-600" />
              <div>
                <strong>
                  {es ? "Conflicto de inventario" : "Inventory conflict"}
                </strong>
                <p className="mt-2 text-sm leading-6">
                  {es
                    ? "El servidor ya confirmó otra venta. Stock del servidor: 0; el teléfono intentó vender 1. El abono y la visita sí fueron aceptados."
                    : "The server already confirmed another sale. Server stock: 0; the phone attempted to sell 1. Payment and visit were accepted."}
                </p>
              </div>
            </div>
          </section>
          <section>
            <span className="etiqueta">
              {es
                ? "¿Qué harías con la venta en conflicto?"
                : "What would you do with the conflicting sale?"}
            </span>
            <div className="mt-2 space-y-2">
              {(
                [
                  "BORRAR",
                  "FORZAR",
                  "CONSERVAR_REVISAR",
                ] as DecisionConflictoSimulado[]
              ).map((opcion) => (
                <button
                  key={opcion}
                  type="button"
                  className={`w-full rounded-xl border p-3 text-left text-sm font-bold ${decision === opcion ? "border-blue-600 bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200" : ""}`}
                  onClick={() => setDecision(opcion)}
                >
                  {opcion === "BORRAR"
                    ? es
                      ? "Borrar el movimiento"
                      : "Delete the operation"
                    : opcion === "FORZAR"
                      ? es
                        ? "Forzar la venta"
                        : "Force the sale"
                      : es
                        ? "Conservar folio y enviar a revisión"
                        : "Keep receipt and send for review"}
                </button>
              ))}
            </div>
            <button
              className="boton-primario mt-4 w-full"
              onClick={() =>
                setRetro(validarConflictoSincronizacion(sincronizado, decision))
              }
            >
              {es ? "Resolver decisión" : "Resolve decision"}
            </button>
          </section>
        </div>
      )}
      <Retroalimentacion
        valor={retro}
        idioma={idioma}
        alCompletar={alCompletar}
        consecuencia={
          retro?.correcta ? (
            <Metricas
              valores={[
                {
                  etiqueta: es ? "Confirmadas" : "Confirmed",
                  antes: "0",
                  despues: "2",
                },
                {
                  etiqueta: es ? "En revisión" : "In review",
                  antes: "0",
                  despues: "1",
                },
                {
                  etiqueta: es ? "Evidencia borrada" : "Deleted evidence",
                  antes: "0",
                  despues: "0",
                },
              ]}
            />
          ) : undefined
        }
      />
    </MarcoSimulador>
  );
}

function CampoNumero({
  etiqueta,
  valor,
  alCambiar,
}: {
  etiqueta: string;
  valor: number;
  alCambiar: (valor: number) => void;
}) {
  return (
    <label>
      <span className="etiqueta">{etiqueta}</span>
      <input
        className="campo"
        aria-label={etiqueta}
        type="number"
        value={valor}
        onChange={(e) => alCambiar(Number(e.target.value))}
      />
    </label>
  );
}

function CampoTexto({
  etiqueta,
  valor,
  alCambiar,
  placeholder,
  tipo = "text",
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  placeholder?: string;
  tipo?: "text" | "date";
}) {
  return (
    <label>
      <span className="etiqueta">{etiqueta}</span>
      <input
        className="campo"
        aria-label={etiqueta}
        type={tipo}
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function FilaResumen({
  etiqueta,
  valor,
  destacado,
}: {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{etiqueta}</dt>
      <dd
        className={
          destacado
            ? "text-lg font-black text-blue-700 dark:text-blue-300"
            : "font-black"
        }
      >
        {valor}
      </dd>
    </div>
  );
}

function FilaDato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <span className="text-[10px] font-black uppercase text-slate-500">
        {etiqueta}
      </span>
      <strong className="mt-1 block">{valor}</strong>
    </div>
  );
}

function EstadoOperacion({
  titulo,
  detalle,
  estado,
  tono,
}: {
  titulo: string;
  detalle: string;
  estado: string;
  tono: "bien" | "error" | "pendiente";
}) {
  return (
    <article className="rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-2">
        <strong className="text-sm">{titulo}</strong>
        <span
          className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${tono === "bien" ? "bg-emerald-100 text-emerald-800" : tono === "error" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}
        >
          {estado}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{detalle}</p>
    </article>
  );
}
