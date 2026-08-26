import type { FormEvent } from "react";

import { CampoContrasena } from "@/componentes/CampoContrasena";
import { Modal } from "@/componentes/ui";
import type {
  AbonoCliente,
  ClienteDetalle,
  Localidad,
} from "./tiposExpediente";

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

interface Propiedades {
  cliente: ClienteDetalle | null;
  localidades: Localidad[];
  puedeGestionarFinanzas: boolean;
  es: boolean;
  editar: boolean;
  ajustarSaldo: boolean;
  abonoAnular: AbonoCliente | null;
  cerrarEdicion: () => void;
  cerrarAjuste: () => void;
  cerrarAnulacion: () => void;
  guardarCliente: (evento: FormEvent<HTMLFormElement>) => void;
  guardarAjusteSaldo: (evento: FormEvent<HTMLFormElement>) => void;
  anular: (evento: FormEvent<HTMLFormElement>) => void;
}

export function ModalesExpedienteCliente({
  cliente,
  localidades,
  puedeGestionarFinanzas,
  es,
  editar,
  ajustarSaldo,
  abonoAnular,
  cerrarEdicion,
  cerrarAjuste,
  cerrarAnulacion,
  guardarCliente,
  guardarAjusteSaldo,
  anular,
}: Propiedades) {
  return (
    <>
      <Modal abierto={editar} cerrar={cerrarEdicion} titulo="Editar cliente">
        {cliente && (
          <form
            onSubmit={guardarCliente}
            className="grid gap-4 sm:grid-cols-2"
            data-capacitacion="clientes.edicion.formulario"
          >
            <label className="sm:col-span-2">
              <span className="etiqueta">Nombre completo</span>
              <input
                name="nombreCompleto"
                className="campo"
                data-capacitacion="clientes.edicion.nombre"
                defaultValue={cliente.nombreCompleto}
                required
              />
            </label>
            <label>
              <span className="etiqueta">Teléfono</span>
              <input
                name="telefono"
                className="campo"
                data-capacitacion="clientes.edicion.telefono"
                defaultValue={cliente.telefono}
                required
              />
            </label>
            <label>
              <span className="etiqueta">Localidad</span>
              <select
                name="localidadId"
                className="campo"
                defaultValue={cliente.localidad.id}
                data-capacitacion="clientes.edicion.localidad"
              >
                {localidades.map((localidad) => (
                  <option
                    key={localidad.id}
                    value={localidad.id}
                    data-capacitacion="clientes.edicion.localidad.opcion"
                  >
                    {localidad.nombre}, {localidad.estado}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2">
              <span className="etiqueta">Dirección</span>
              <textarea
                name="direccion"
                className="campo min-h-24 py-3"
                data-capacitacion="clientes.edicion.direccion"
                defaultValue={cliente.direccion}
                required
              />
            </label>
            {Number(cliente.saldo?.saldoActual ?? 0) > 0 && (
              <label>
                <span className="etiqueta">Número de tarjeta</span>
                <input
                  name="numeroTarjeta"
                  className="campo"
                  data-capacitacion="clientes.edicion.tarjeta"
                  defaultValue={cliente.numeroTarjeta ?? ""}
                  minLength={3}
                />
              </label>
            )}
            {puedeGestionarFinanzas && (
              <label>
                <span className="etiqueta">Límite de crédito</span>
                <input
                  name="limiteCredito"
                  className="campo"
                  data-capacitacion="clientes.edicion.limite-credito"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={cliente.limiteCredito}
                />
              </label>
            )}
            <label>
              <span className="etiqueta">Notas</span>
              <input
                name="notas"
                className="campo"
                data-capacitacion="clientes.edicion.notas"
                defaultValue={cliente.notas ?? ""}
              />
            </label>
            <div
              className="sm:col-span-2 flex justify-end gap-2"
              data-capacitacion="clientes.edicion.revision"
            >
              <button
                type="button"
                className="boton-secundario"
                onClick={cerrarEdicion}
                data-capacitacion="clientes.edicion.cancelar"
              >
                Cancelar
              </button>
              <button
                className="boton-primario"
                data-capacitacion="clientes.edicion.guardar"
              >
                Guardar cambios
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        abierto={ajustarSaldo}
        cerrar={cerrarAjuste}
        titulo={`${es ? "Ajustar saldo" : "Adjust balance"} · ${cliente?.nombreCompleto ?? ""}`}
      >
        <form
          onSubmit={guardarAjusteSaldo}
          className="space-y-4"
          data-capacitacion="clientes.saldo.formulario"
        >
          <div
            className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
            data-capacitacion="clientes.saldo.explicacion"
          >
            <strong>
              {es
                ? "Corrección financiera auditable"
                : "Auditable financial correction"}
            </strong>
            <p className="mt-1 leading-6">
              {es
                ? "No borra ventas ni abonos. Creará un cargo o abono de ajuste y guardará quién lo autorizó y el motivo."
                : "This does not delete sales or payments. It creates an adjustment and records who authorized it and why."}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="etiqueta">
                {es ? "Saldo actual" : "Current balance"}
              </span>
              <input
                className="campo bg-slate-100 dark:bg-slate-800"
                value={Number(cliente?.saldo?.saldoActual ?? 0).toFixed(2)}
                readOnly
                data-capacitacion="clientes.saldo.actual"
              />
            </label>
            <label>
              <span className="etiqueta">
                {es ? "Nuevo saldo" : "New balance"}
              </span>
              <input
                name="nuevoSaldo"
                className="campo"
                data-capacitacion="clientes.saldo.nuevo"
                type="number"
                min="0"
                step="0.01"
                defaultValue={Number(cliente?.saldo?.saldoActual ?? 0).toFixed(
                  2,
                )}
                autoFocus
                required
              />
            </label>
          </div>
          <label>
            <span className="etiqueta">
              {es ? "Motivo obligatorio" : "Required reason"}
            </span>
            <textarea
              name="motivo"
              className="campo min-h-24 py-3"
              data-capacitacion="clientes.saldo.motivo"
              minLength={10}
              maxLength={500}
              placeholder={
                es
                  ? "Explica por qué se corrige el saldo"
                  : "Explain why the balance is corrected"
              }
              required
            />
          </label>
          <div>
            <label htmlFor="ajuste-saldo-contrasena" className="etiqueta">
              {es ? "Confirma con tu contraseña" : "Confirm with your password"}
            </label>
            <CampoContrasena
              id="ajuste-saldo-contrasena"
              name="contrasenaActual"
              autoComplete="current-password"
              minLength={8}
              required
              data-capacitacion="clientes.saldo.contrasena"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="boton-secundario"
              onClick={cerrarAjuste}
              data-capacitacion="clientes.saldo.cancelar"
            >
              {es ? "Cancelar" : "Cancel"}
            </button>
            <button
              className="boton-primario"
              data-capacitacion="clientes.saldo.guardar"
            >
              {es ? "Registrar ajuste" : "Record adjustment"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        abierto={Boolean(abonoAnular)}
        cerrar={cerrarAnulacion}
        titulo="Anular abono"
      >
        <form
          onSubmit={anular}
          className="space-y-4"
          data-capacitacion="clientes.abono.anular.formulario"
        >
          <p
            className="text-sm"
            data-capacitacion="clientes.abono.anular.revision"
          >
            El saldo aumentará {dinero.format(Number(abonoAnular?.monto ?? 0))}{" "}
            y las cuotas se reabrirán. El registro original se conservará.
          </p>
          <label>
            <span className="etiqueta">Motivo obligatorio</span>
            <textarea
              name="motivo"
              className="campo min-h-28 py-3"
              data-capacitacion="clientes.abono.anular.motivo"
              minLength={10}
              required
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="boton-secundario"
              onClick={cerrarAnulacion}
              data-capacitacion="clientes.abono.anular.cancelar"
            >
              Cancelar
            </button>
            <button
              className="boton-primario bg-red-600 hover:bg-red-700"
              data-capacitacion="clientes.abono.anular.confirmar"
            >
              Confirmar anulación
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
