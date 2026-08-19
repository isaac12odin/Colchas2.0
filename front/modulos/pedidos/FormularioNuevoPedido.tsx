import { useState, type FormEvent } from "react";

import {
  SelectorClienteRemoto,
  SelectorProductoRemoto,
} from "@/componentes/SelectoresRemotos";
import type { ClientePedido, ProductoPedido } from "./tipos";

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function FormularioNuevoPedido({
  es,
  cancelar,
  guardar,
  alCancelar,
  alEnviar,
}: {
  es: boolean;
  cancelar: string;
  guardar: string;
  alCancelar: () => void;
  alEnviar: (evento: FormEvent<HTMLFormElement>) => void;
}) {
  const [cliente, establecerCliente] = useState<ClientePedido | null>(null);
  const [producto, establecerProducto] = useState<ProductoPedido | null>(null);
  return (
    <form onSubmit={alEnviar} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <SelectorClienteRemoto
          valor={cliente}
          alCambiar={establecerCliente}
          es={es}
        />
      </div>
      <div className="sm:col-span-2">
        <SelectorProductoRemoto
          valor={producto}
          alCambiar={establecerProducto}
          es={es}
        />
      </div>
      <CampoNumerico
        nombre="cantidad"
        etiqueta={es ? "Cantidad" : "Quantity"}
        minimo="1"
        valorInicial="1"
      />
      {producto && (
        <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950">
          {es ? "Precio automático" : "Automatic price"}:{" "}
          <strong>{dinero.format(Number(producto.precioVenta))}</strong>
        </div>
      )}
      <label>
        <span className="etiqueta">{es ? "Fecha compromiso" : "Due date"}</span>
        <input name="fechaCompromiso" type="date" className="campo" />
      </label>
      <div className="sm:col-span-2 flex justify-end gap-2">
        <button type="button" className="boton-secundario" onClick={alCancelar}>
          {cancelar}
        </button>
        <button
          className="boton-primario disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!cliente || !producto}
        >
          {guardar}
        </button>
      </div>
    </form>
  );
}

function CampoNumerico({
  nombre,
  etiqueta,
  minimo,
  paso,
  valorInicial,
}: {
  nombre: string;
  etiqueta: string;
  minimo: string;
  paso?: string;
  valorInicial?: string;
}) {
  return (
    <label>
      <span className="etiqueta">{etiqueta}</span>
      <input
        name={nombre}
        type="number"
        min={minimo}
        step={paso}
        defaultValue={valorInicial}
        className="campo"
        required
      />
    </label>
  );
}
