"use client";

interface VentaSeleccionable {
  id: string;
  folio: string;
  total: string;
  cliente: { nombreCompleto: string } | null;
}

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function SelectorVentaDevolucion({
  ventas,
  buscar,
  cambiarBusqueda,
  elegir,
}: {
  ventas: VentaSeleccionable[];
  buscar: string;
  cambiarBusqueda: (valor: string) => void;
  elegir: (id: string) => void;
}) {
  return (
    <div data-capacitacion="devoluciones.venta.seleccion">
      <label>
        <span className="etiqueta">Buscar venta confirmada</span>
        <input
          className="campo"
          data-capacitacion="devoluciones.venta.buscar"
          value={buscar}
          onChange={(evento) => cambiarBusqueda(evento.target.value)}
          placeholder="Folio o cliente"
        />
      </label>
      <div className="mt-3 max-h-72 divide-y overflow-y-auto rounded-lg border">
        {ventas.map((venta) => (
          <button
            key={venta.id}
            type="button"
            data-capacitacion="devoluciones.venta.elegir"
            className="flex w-full justify-between p-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            onClick={() => elegir(venta.id)}
          >
            <span>
              <strong>{venta.folio}</strong>
              <small className="block text-slate-500">
                {venta.cliente?.nombreCompleto ?? "Público general"}
              </small>
            </span>
            <strong>{dinero.format(Number(venta.total))}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}
