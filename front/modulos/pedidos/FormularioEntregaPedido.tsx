import { useState, type FormEvent } from "react";
import { CamposPlanCredito } from "@/componentes/CamposPlanCredito";

export function FormularioEntregaPedido({
  tipoVenta,
  numeroTarjetaActual,
  totalPedido,
  es,
  cancelar,
  alCambiarTipo,
  alCancelar,
  alEnviar,
  items,
  proveedores,
}: {
  tipoVenta: string;
  numeroTarjetaActual?: string | null;
  totalPedido: number;
  es: boolean;
  cancelar: string;
  alCambiarTipo: (tipo: string) => void;
  alCancelar: () => void;
  alEnviar: (evento: FormEvent<HTMLFormElement>) => void;
  items: Array<{
    id: string;
    descripcion: string;
    proveedor: { id: string; nombre: string } | null;
  }>;
  proveedores: Array<{ id: string; nombre: string }>;
}) {
  const [anticipo, establecerAnticipo] = useState("0");
  const saldoNuevo =
    tipoVenta === "CREDITO"
      ? Math.max(0, totalPedido - Number(anticipo || 0))
      : 0;
  const requiereFinanciamiento = saldoNuevo > 0;
  return (
    <form onSubmit={alEnviar} className="grid gap-4 sm:grid-cols-2">
      <label>
        <span className="etiqueta">{es ? "Tipo de venta" : "Sale type"}</span>
        <select
          className="campo"
          value={tipoVenta}
          onChange={(evento) => alCambiarTipo(evento.target.value)}
        >
          <option value="CREDITO">{es ? "Crédito" : "Credit"}</option>
          <option value="CONTADO">{es ? "Contado" : "Cash"}</option>
        </select>
      </label>
      <label>
        <span className="etiqueta">{es ? "Anticipo" : "Deposit"}</span>
        <input
          name="anticipo"
          className="campo"
          type="number"
          min="0"
          step="0.01"
          value={anticipo}
          onChange={(evento) => establecerAnticipo(evento.target.value)}
        />
      </label>
      {tipoVenta === "CREDITO" && requiereFinanciamiento && (
        <label className="sm:col-span-2">
          <span className="etiqueta">
            {es
              ? "Número de tarjeta asignado por ti"
              : "Card number assigned by you"}
          </span>
          <input
            name="numeroTarjeta"
            className="campo"
            defaultValue={numeroTarjetaActual ?? ""}
            minLength={3}
            maxLength={30}
            required
          />
        </label>
      )}
      <div className="sm:col-span-2 rounded-lg border p-4">
        <h3 className="font-semibold">
          {es ? "Proveedor que surtió la mercancía" : "Supplying vendor"}
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          {es
            ? "Es obligatorio para conservar la trazabilidad de cada artículo."
            : "Required for item-level traceability."}
        </p>
        <div className="mt-3 space-y-3">
          {items.map((item) => (
            <label key={item.id} className="block">
              <span className="etiqueta">{item.descripcion}</span>
              <select
                name={`proveedor_${item.id}`}
                className="campo"
                defaultValue={item.proveedor?.id ?? ""}
                required
              >
                <option value="">Seleccione proveedor</option>
                {proveedores.map((proveedor) => (
                  <option key={proveedor.id} value={proveedor.id}>
                    {proveedor.nombre}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>
      {tipoVenta === "CREDITO" && (
        <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100">
          {es ? "Saldo que se financiará" : "Balance to finance"}:{" "}
          <strong>
            {saldoNuevo.toLocaleString(es ? "es-MX" : "en-US", {
              style: "currency",
              currency: "MXN",
            })}
          </strong>
        </div>
      )}
      {tipoVenta === "CREDITO" && requiereFinanciamiento && (
        <CamposPlanCredito es={es} />
      )}
      <div className="sm:col-span-2 flex justify-end gap-2">
        <button type="button" className="boton-secundario" onClick={alCancelar}>
          {cancelar}
        </button>
        <button
          className="boton-primario disabled:cursor-not-allowed disabled:opacity-50"
          disabled={Number(anticipo || 0) > totalPedido}
        >
          {es ? "Confirmar entrega y venta" : "Confirm delivery and sale"}
        </button>
      </div>
    </form>
  );
}
