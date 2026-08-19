import { useState, type FormEvent } from "react";

import { CamposPlanCredito } from "@/componentes/CamposPlanCredito";
import {
  SelectorClienteRemoto,
  SelectorProductoRemoto,
} from "@/componentes/SelectoresRemotos";
import type { ClientePedido, ProductoPedido } from "@/modulos/pedidos/tipos";

export function FormularioVentaWeb({
  tipo,
  es,
  cancelar,
  guardar,
  alCambiarTipo,
  alCancelar,
  alEnviar,
}: {
  tipo: string;
  es: boolean;
  cancelar: string;
  guardar: string;
  alCambiarTipo: (tipo: string) => void;
  alCancelar: () => void;
  alEnviar: (evento: FormEvent<HTMLFormElement>) => void;
}) {
  const [cliente, establecerCliente] = useState<ClientePedido | null>(null);
  const [producto, establecerProducto] = useState<ProductoPedido | null>(null);
  const [numeroTarjeta, establecerNumeroTarjeta] = useState("");
  const [cantidad, establecerCantidad] = useState("1");
  const [descuento, establecerDescuento] = useState("0");
  const [anticipo, establecerAnticipo] = useState("0");

  const total = Math.max(
    0,
    Number(producto?.precioVenta ?? 0) * Number(cantidad || 0) -
      Number(descuento || 0),
  );
  const saldoNuevo =
    tipo === "CREDITO" ? Math.max(0, total - Number(anticipo || 0)) : 0;
  const requiereFinanciamiento = saldoNuevo > 0;

  function seleccionarCliente(seleccion: ClientePedido | null) {
    establecerCliente(seleccion);
    establecerNumeroTarjeta(seleccion?.numeroTarjeta ?? "");
  }

  return (
    <form onSubmit={alEnviar} className="grid gap-4 sm:grid-cols-2">
      <label>
        <span className="etiqueta">{es ? "Tipo de venta" : "Sale type"}</span>
        <select
          className="campo"
          value={tipo}
          onChange={(evento) => alCambiarTipo(evento.target.value)}
        >
          <option value="CREDITO">{es ? "Crédito" : "Credit"}</option>
          <option value="CONTADO">{es ? "Contado" : "Cash"}</option>
          <option value="PUBLICO">
            {es ? "Público general" : "General public"}
          </option>
        </select>
      </label>
      {tipo !== "PUBLICO" && (
        <div className="sm:col-span-2">
          <SelectorClienteRemoto
            valor={cliente}
            alCambiar={seleccionarCliente}
            es={es}
          />
        </div>
      )}
      {tipo === "CREDITO" && cliente && requiereFinanciamiento && (
        <label className="sm:col-span-2">
          <span className="etiqueta">
            {es
              ? "Número de tarjeta asignado por ti"
              : "Card number assigned by you"}
          </span>
          <input
            name="numeroTarjeta"
            className="campo"
            value={numeroTarjeta}
            onChange={(evento) => establecerNumeroTarjeta(evento.target.value)}
            minLength={3}
            maxLength={30}
            placeholder={es ? "Ej. 0042" : "E.g. 0042"}
            required
          />
          <small className="mt-1 block text-slate-500">
            {es
              ? "Nunca se genera automáticamente. Puedes conservar o cambiar la actual."
              : "It is never generated automatically. Keep or replace the current one."}
          </small>
        </label>
      )}
      <div className="sm:col-span-2">
        <SelectorProductoRemoto
          valor={producto}
          alCambiar={establecerProducto}
          es={es}
          requiereExistencia
        />
      </div>
      <CampoNumero
        nombre="cantidad"
        etiqueta={es ? "Cantidad" : "Quantity"}
        minimo="1"
        valor={cantidad}
        alCambiar={establecerCantidad}
        requerido
      />
      <CampoNumero
        nombre="descuento"
        etiqueta={es ? "Descuento" : "Discount"}
        minimo="0"
        paso="0.01"
        valor={descuento}
        alCambiar={establecerDescuento}
      />
      <CampoNumero
        nombre="anticipo"
        etiqueta={es ? "Anticipo" : "Deposit"}
        minimo="0"
        paso="0.01"
        valor={anticipo}
        alCambiar={establecerAnticipo}
      />
      <label>
        <span className="etiqueta">
          {es ? "Método anticipo" : "Deposit method"}
        </span>
        <select name="metodoAnticipo" className="campo">
          <option value="EFECTIVO">{es ? "Efectivo" : "Cash"}</option>
          <option value="TRANSFERENCIA">
            {es ? "Transferencia" : "Transfer"}
          </option>
          <option value="TARJETA">{es ? "Tarjeta" : "Card"}</option>
        </select>
      </label>
      {tipo === "CREDITO" && producto && (
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
      {tipo === "CREDITO" && requiereFinanciamiento && (
        <CamposPlanCredito es={es} />
      )}
      <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
        <button type="button" className="boton-secundario" onClick={alCancelar}>
          {cancelar}
        </button>
        <button
          className="boton-primario disabled:cursor-not-allowed disabled:opacity-50"
          disabled={
            !producto ||
            Number(anticipo || 0) > total ||
            (tipo === "CREDITO" &&
              (!cliente || (requiereFinanciamiento && !numeroTarjeta.trim())))
          }
        >
          {guardar}
        </button>
      </div>
    </form>
  );
}

function CampoNumero({
  nombre,
  etiqueta,
  minimo,
  paso,
  valor,
  alCambiar,
  requerido = false,
}: {
  nombre: string;
  etiqueta: string;
  minimo: string;
  paso?: string;
  valor: string;
  alCambiar: (valor: string) => void;
  requerido?: boolean;
}) {
  return (
    <label>
      <span className="etiqueta">{etiqueta}</span>
      <input
        name={nombre}
        type="number"
        min={minimo}
        step={paso}
        value={valor}
        onChange={(evento) => alCambiar(evento.target.value)}
        className="campo"
        required={requerido}
      />
    </label>
  );
}
