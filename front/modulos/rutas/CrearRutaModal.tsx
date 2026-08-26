import { Modal } from "@/componentes/ui";
import { OrdenClientesRuta } from "./constructor/OrdenClientesRuta";
import { PasoDatosRuta } from "./constructor/PasoDatosRuta";
import { ResumenRuta } from "./constructor/ResumenRuta";
import { SelectorClientesRuta } from "./constructor/SelectorClientesRuta";
import { SelectorLocalidadesRuta } from "./constructor/SelectorLocalidadesRuta";
import { usarConstructorRuta } from "./constructor/usarConstructorRuta";
import type { RutaWeb } from "./tipos";

export function CrearRutaModal({
  abierto,
  es,
  cancelar,
  guardar,
  ruta,
  alCerrar,
  alCrear,
}: {
  abierto: boolean;
  es: boolean;
  cancelar: string;
  guardar: string;
  ruta?: RutaWeb;
  alCerrar: () => void;
  alCrear: () => void;
}) {
  const control = usarConstructorRuta({
    abierto,
    ruta,
    es,
    alCerrar,
    alGuardar: alCrear,
  });

  return (
    <Modal
      abierto={abierto}
      cerrar={alCerrar}
      ancho="pantalla"
      titulo={
        ruta
          ? es
            ? "Configurar ruta y orden de cobranza"
            : "Configure route and collection order"
          : es
            ? "Nueva ruta de cobranza"
            : "New collection route"
      }
    >
      <form
        onSubmit={control.enviar}
        className="space-y-5"
        data-capacitacion="rutas.configuracion.formulario"
      >
        {control.error && (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
            {control.error}
          </p>
        )}

        {control.cargando ? (
          <p className="py-16 text-center text-sm text-slate-500">
            {es
              ? "Cargando lugares y clientes…"
              : "Loading locations and customers…"}
          </p>
        ) : (
          <>
            <PasoDatosRuta
              es={es}
              nombre={control.nombre}
              dia={control.dia}
              cobradorId={control.cobradorId}
              cobradores={control.cobradores}
              cambiarNombre={control.establecerNombre}
              cambiarDia={control.establecerDia}
              cambiarCobrador={control.establecerCobradorId}
            />
            <SelectorLocalidadesRuta
              es={es}
              localidades={control.localidades}
              clientes={control.clientes}
              seleccionadas={control.localidadesSeleccionadas}
              alternar={control.alternarLocalidad}
            />
            <SelectorClientesRuta
              es={es}
              clientes={control.clientes}
              localidades={control.localidadesSeleccionadas}
              seleccionados={control.clientesOrdenados}
              alternar={control.alternarCliente}
            />
            <OrdenClientesRuta
              es={es}
              orden={control.clientesOrdenados}
              clientes={control.clientesPorId}
              cambiar={control.establecerClientesOrdenados}
            />
            <ResumenRuta
              es={es}
              orden={control.clientesOrdenados}
              clientes={control.clientesPorId}
            />
            <label>
              <span className="etiqueta">
                {es
                  ? "Notas opcionales para el cobrador"
                  : "Optional collector notes"}
              </span>
              <textarea
                className="campo min-h-20 py-3"
                value={control.notas}
                onChange={(evento) =>
                  control.establecerNotas(evento.target.value)
                }
                data-capacitacion="rutas.configuracion.notas"
              />
            </label>
          </>
        )}

        <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-white py-3 dark:bg-slate-950">
          <button type="button" className="boton-secundario" onClick={alCerrar}>
            {cancelar}
          </button>
          <button
            disabled={!control.puedeGuardar}
            className="boton-primario disabled:opacity-50"
            data-capacitacion="rutas.configuracion.guardar"
          >
            {control.guardando ? (es ? "Guardando…" : "Saving…") : guardar}
          </button>
        </div>
      </form>
    </Modal>
  );
}
