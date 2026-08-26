import type { CobradorRuta } from "./tipos";

const dias = [
  "LUNES",
  "MARTES",
  "MIERCOLES",
  "JUEVES",
  "VIERNES",
  "SABADO",
  "DOMINGO",
];

export function PasoDatosRuta({
  es,
  nombre,
  dia,
  cobradorId,
  cobradores,
  cambiarNombre,
  cambiarDia,
  cambiarCobrador,
}: {
  es: boolean;
  nombre: string;
  dia: string;
  cobradorId: string;
  cobradores: CobradorRuta[];
  cambiarNombre: (valor: string) => void;
  cambiarDia: (valor: string) => void;
  cambiarCobrador: (valor: string) => void;
}) {
  return (
    <fieldset className="rounded-2xl border p-4">
      <legend className="px-2 text-sm font-black text-blue-700 dark:text-blue-300">
        {es ? "1. Programa la ruta" : "1. Schedule the route"}
      </legend>
      <div className="grid gap-4 md:grid-cols-3">
        <label>
          <span className="etiqueta">
            {es ? "Nombre de ruta" : "Route name"}
          </span>
          <input
            className="campo"
            value={nombre}
            onChange={(evento) => cambiarNombre(evento.target.value)}
            required
            minLength={3}
            data-capacitacion="rutas.configuracion.nombre"
          />
        </label>
        <label>
          <span className="etiqueta">
            {es ? "Día de cobranza" : "Collection day"}
          </span>
          <select
            className="campo"
            value={dia}
            onChange={(evento) => cambiarDia(evento.target.value)}
            data-capacitacion="rutas.configuracion.dia"
          >
            {dias.map((valor) => (
              <option key={valor}>{valor}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="etiqueta">
            {es
              ? "Cobrador responsable en móvil (opcional)"
              : "Assigned mobile collector (optional)"}
          </span>
          <select
            className="campo"
            value={cobradorId}
            onChange={(evento) => cambiarCobrador(evento.target.value)}
            data-capacitacion="rutas.configuracion.cobrador"
          >
            <option value="">
              {es
                ? "Sin cobrador · Operar desde web"
                : "No collector · Web operation"}
            </option>
            {cobradores.map((cobrador) => (
              <option key={cobrador.id} value={cobrador.id}>
                {cobrador.nombre} · {cobrador.correo}
              </option>
            ))}
          </select>
          <small className="mt-1 block text-xs leading-5 text-slate-500">
            {cobradorId
              ? es
                ? "Aparecerá en el móvil de ese cobrador y Administración también podrá capturarla en web."
                : "It will appear on that collector's phone and Administration can also operate it on the web."
              : es
                ? "No aparecerá en ningún móvil. Administración hará visitas y abonos desde la web."
                : "It will not appear on any phone. Administration will record visits and payments on the web."}
          </small>
        </label>
      </div>
    </fieldset>
  );
}
