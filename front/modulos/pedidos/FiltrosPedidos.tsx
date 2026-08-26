import {
  estadosPedido,
  etiquetaEstadoPedido,
  etiquetaEstadoPedidoEn,
} from "./tipos";

export function FiltrosPedidos({
  estado,
  es,
  alCambiar,
}: {
  estado: string;
  es: boolean;
  alCambiar: (estado: string) => void;
}) {
  return (
    <div
      className="mb-4 flex gap-2 overflow-x-auto pb-1"
      data-capacitacion="pedidos.filtros"
    >
      {estadosPedido.map((opcion) => (
        <button
          key={opcion}
          onClick={() => alCambiar(opcion)}
          className={`${estado === opcion ? "boton-primario" : "boton-secundario"} whitespace-nowrap`}
          data-capacitacion={`pedidos.filtro.${opcion || "TODOS"}`}
        >
          {opcion
            ? es
              ? etiquetaEstadoPedido[opcion]
              : etiquetaEstadoPedidoEn[opcion]
            : es
              ? "Todos"
              : "All"}
        </button>
      ))}
    </div>
  );
}
