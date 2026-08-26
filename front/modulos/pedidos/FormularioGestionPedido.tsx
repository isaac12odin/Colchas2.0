"use client";

import { Plus, Send } from "lucide-react";
import { useMemo, useState } from "react";

import type { PedidoWeb } from "./tipos";

interface ProveedorBreve {
  id: string;
  nombre: string;
}

/**
 * Convierte "pendiente" en una acción concreta: cada artículo debe quedar
 * ligado al proveedor que se encargará de surtirlo antes de avanzar.
 */
export function FormularioGestionPedido({
  pedido,
  proveedores,
  es,
  guardando,
  puedeCrearProveedor,
  alCancelar,
  alConfirmar,
  alCrearProveedor,
}: {
  pedido: PedidoWeb;
  proveedores: ProveedorBreve[];
  es: boolean;
  guardando: boolean;
  puedeCrearProveedor: boolean;
  alCancelar: () => void;
  alConfirmar: (
    asignaciones: Array<{ itemPedidoId: string; proveedorId: string }>,
  ) => Promise<void>;
  alCrearProveedor: (datos: {
    nombre: string;
    contacto?: string;
    telefono?: string;
  }) => Promise<ProveedorBreve | null>;
}) {
  const [selecciones, establecerSelecciones] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        pedido.items.map((item) => [item.id, item.proveedor?.id ?? ""]),
      ),
  );
  const [mostrarProveedor, establecerMostrarProveedor] = useState(false);
  const [nombre, establecerNombre] = useState("");
  const [contacto, establecerContacto] = useState("");
  const [telefono, establecerTelefono] = useState("");
  const completo = useMemo(
    () => pedido.items.every((item) => Boolean(selecciones[item.id])),
    [pedido.items, selecciones],
  );

  async function crearProveedor() {
    if (nombre.trim().length < 2) return;
    const creado = await alCrearProveedor({
      nombre: nombre.trim(),
      ...(contacto.trim() ? { contacto: contacto.trim() } : {}),
      ...(telefono.trim() ? { telefono: telefono.trim() } : {}),
    });
    if (!creado) return;
    establecerSelecciones((actual) => {
      const pendientes = pedido.items.filter((item) => !actual[item.id]);
      if (pendientes.length !== 1) return actual;
      return { ...actual, [pendientes[0]!.id]: creado.id };
    });
    establecerNombre("");
    establecerContacto("");
    establecerTelefono("");
    establecerMostrarProveedor(false);
  }

  return (
    <div className="space-y-5" data-capacitacion="pedidos.proveedor.formulario">
      <div
        className="rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-950 dark:bg-blue-950/40 dark:text-blue-100"
        data-capacitacion="pedidos.proveedor.resumen"
      >
        <strong className="block">{pedido.cliente.nombreCompleto}</strong>
        {es
          ? "Asigna quién surtirá cada artículo. Al confirmar quedará como pedido al proveedor."
          : "Assign a supplier to every item before sending the order."}
      </div>

      <div
        className="space-y-3"
        data-capacitacion="pedidos.proveedor.articulos"
      >
        {pedido.items.map((item) => (
          <label
            key={item.id}
            className="block rounded-xl border p-4"
            data-capacitacion="pedidos.proveedor.articulo"
          >
            <span className="etiqueta">
              {item.cantidad} × {item.descripcion}
            </span>
            <select
              className="campo"
              value={selecciones[item.id] ?? ""}
              onChange={(evento) =>
                establecerSelecciones((actual) => ({
                  ...actual,
                  [item.id]: evento.target.value,
                }))
              }
              required
              data-capacitacion="pedidos.proveedor.seleccionar"
            >
              <option value="">
                {es ? "Seleccione proveedor" : "Select supplier"}
              </option>
              {proveedores.map((proveedor) => (
                <option key={proveedor.id} value={proveedor.id}>
                  {proveedor.nombre}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {puedeCrearProveedor ? (
        <button
          type="button"
          className="boton-secundario"
          onClick={() => establecerMostrarProveedor((actual) => !actual)}
          data-capacitacion="pedidos.proveedor.nuevo-abrir"
        >
          <Plus size={17} />
          {es ? "Agregar proveedor sin salir" : "Add supplier here"}
        </button>
      ) : (
        <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          {es
            ? "Contabilidad puede asignar proveedores existentes. Sólo Administración o Almacén pueden crear uno nuevo."
            : "Accounting can assign existing suppliers. Only Administration or Warehouse can create one."}
        </p>
      )}

      {mostrarProveedor && (
        <div
          className="grid gap-3 rounded-xl border border-dashed p-4 sm:grid-cols-2"
          data-capacitacion="pedidos.proveedor.nuevo-formulario"
        >
          <label className="sm:col-span-2">
            <span className="etiqueta">{es ? "Nombre" : "Name"}</span>
            <input
              className="campo"
              value={nombre}
              onChange={(evento) => establecerNombre(evento.target.value)}
              minLength={2}
              autoFocus
              required
              data-capacitacion="pedidos.proveedor.nuevo-nombre"
            />
          </label>
          <label>
            <span className="etiqueta">{es ? "Contacto" : "Contact"}</span>
            <input
              className="campo"
              value={contacto}
              onChange={(evento) => establecerContacto(evento.target.value)}
              data-capacitacion="pedidos.proveedor.nuevo-contacto"
            />
          </label>
          <label>
            <span className="etiqueta">{es ? "Teléfono" : "Phone"}</span>
            <input
              className="campo"
              value={telefono}
              onChange={(evento) => establecerTelefono(evento.target.value)}
              data-capacitacion="pedidos.proveedor.nuevo-telefono"
            />
          </label>
          <button
            type="button"
            className="boton-secundario sm:col-span-2"
            disabled={guardando || nombre.trim().length < 2}
            onClick={() => void crearProveedor()}
            data-capacitacion="pedidos.proveedor.nuevo-guardar"
          >
            <Plus size={17} /> {es ? "Guardar proveedor" : "Save supplier"}
          </button>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
        <button type="button" className="boton-secundario" onClick={alCancelar}>
          {es ? "Cancelar" : "Cancel"}
        </button>
        <button
          type="button"
          className="boton-primario"
          disabled={guardando || !completo}
          onClick={() =>
            void alConfirmar(
              pedido.items.map((item) => ({
                itemPedidoId: item.id,
                proveedorId: selecciones[item.id]!,
              })),
            )
          }
          data-capacitacion="pedidos.proveedor.confirmar"
        >
          <Send size={17} />
          {guardando
            ? es
              ? "Guardando…"
              : "Saving…"
            : es
              ? "Confirmar pedido al proveedor"
              : "Confirm supplier order"}
        </button>
      </div>
    </div>
  );
}
