import { Download, FileCheck2, Printer } from "lucide-react";

export function AccionesDocumentoRuta({
  rutaId,
  fecha,
  es,
}: {
  rutaId: string;
  fecha: string;
  es: boolean;
}) {
  const consulta = new URLSearchParams({ fecha }).toString();

  return (
    <div className="flex flex-wrap gap-2">
      <a
        className="boton-secundario"
        href={`/api/rutas/${rutaId}/hoja.pdf?${consulta}`}
        target="_blank"
        rel="noreferrer"
        data-capacitacion="rutas.jornada.imprimir"
      >
        <Printer size={17} />
        {es ? "Imprimir hoja de ruta" : "Print route sheet"}
      </a>
      <a
        className="boton-secundario"
        href={`/api/rutas/${rutaId}/resultado.pdf?${consulta}`}
        download
      >
        <Download size={17} />
        <FileCheck2 size={15} />
        {es ? "Descargar resultados" : "Download results"}
      </a>
    </div>
  );
}
