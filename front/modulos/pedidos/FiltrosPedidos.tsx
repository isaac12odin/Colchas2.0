import { estadosPedido } from "./tipos";

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
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
      {estadosPedido.map((opcion) => (
        <button
          key={opcion}
          onClick={() => alCambiar(opcion)}
          className={`${estado === opcion ? "boton-primario" : "boton-secundario"} whitespace-nowrap`}
        >
          {opcion || (es ? "Todos" : "All")}
        </button>
      ))}
    </div>
  );
}
