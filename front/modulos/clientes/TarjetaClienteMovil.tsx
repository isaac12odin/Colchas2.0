import { Banknote, CreditCard, Edit3, Eye, MapPin, Phone } from "lucide-react";
import Link from "next/link";

export interface ClienteListadoWeb {
  id: string;
  nombreCompleto: string;
  telefono: string;
  direccion: string;
  numeroTarjeta: string | null;
  localidad: { nombre: string; estado: string };
  saldo: { saldoActual: string; vencidoActual: string } | null;
  evaluacionesRiesgo: Array<{ nivel: string; puntuacion: number }>;
}

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function TarjetaClienteMovil({
  cliente,
  es,
  puedeCapturar,
  puedeAbonar,
  alAsignarTarjeta,
  alAbonar,
}: {
  cliente: ClienteListadoWeb;
  es: boolean;
  puedeCapturar: boolean;
  puedeAbonar: boolean;
  alAsignarTarjeta: () => void;
  alAbonar: () => void;
}) {
  const saldo = Number(cliente.saldo?.saldoActual ?? 0);
  const riesgo = cliente.evaluacionesRiesgo[0]?.nivel;
  const riesgoAlto = riesgo === "ALTO" || riesgo === "CRITICO";
  const telefonoMarcable = cliente.telefono.replace(/[^+\d]/g, "");

  return (
    <article
      className="space-y-4 border-b p-4 last:border-b-0"
      data-capacitacion="clientes.lista.fila"
      data-testid="cliente-tarjeta-movil"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-semibold">{cliente.nombreCompleto}</h2>
          <p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-slate-500">
            <MapPin className="mt-0.5 shrink-0" size={14} aria-hidden />
            <span>
              {cliente.localidad.nombre}, {cliente.localidad.estado}
            </span>
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
            riesgoAlto
              ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          {riesgo ?? (es ? "Sin riesgo" : "Not rated")}
        </span>
      </div>

      <p className="line-clamp-2 text-xs leading-5 text-slate-500">
        {cliente.direccion}
      </p>

      <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
        <div>
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {es ? "Saldo" : "Balance"}
          </span>
          <strong
            className={
              saldo > 0
                ? "text-blue-700 dark:text-blue-300"
                : "text-emerald-700 dark:text-emerald-300"
            }
          >
            {dinero.format(saldo)}
          </strong>
        </div>
        <div>
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {es ? "Tarjeta" : "Card"}
          </span>
          {puedeCapturar && saldo > 0 ? (
            <button
              type="button"
              className="mt-0.5 inline-flex max-w-full items-center gap-1 font-mono text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
              onClick={alAsignarTarjeta}
              data-capacitacion="clientes.tarjeta.abrir"
            >
              <CreditCard className="shrink-0" size={14} aria-hidden />
              <span className="truncate">
                {cliente.numeroTarjeta ?? (es ? "Asignar" : "Assign")}
              </span>
            </button>
          ) : (
            <span className="font-mono text-sm">
              {cliente.numeroTarjeta ?? "—"}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <a
          href={`tel:${telefonoMarcable}`}
          className="boton-secundario px-3"
          aria-label={`${es ? "Llamar a" : "Call"} ${cliente.nombreCompleto}`}
        >
          <Phone size={16} aria-hidden />
          <span className="truncate">{cliente.telefono}</span>
        </a>
        <Link
          href={`/clientes/${cliente.id}`}
          className="boton-secundario px-3"
          data-capacitacion="clientes.expediente.abrir"
        >
          <Eye size={16} aria-hidden />
          {es ? "Expediente" : "Account"}
        </Link>
        {puedeCapturar && (
          <Link
            href={`/clientes/${cliente.id}?accion=editar`}
            className="boton-secundario px-3"
            aria-label={`${es ? "Editar" : "Edit"} ${cliente.nombreCompleto}`}
            data-capacitacion="clientes.edicion.abrir"
          >
            <Edit3 size={16} aria-hidden />
            {es ? "Editar" : "Edit"}
          </Link>
        )}
        {puedeAbonar && saldo > 0 && (
          <button
            type="button"
            className="boton-primario px-3"
            onClick={alAbonar}
            data-capacitacion="clientes.abono.cliente-actual.abrir"
          >
            <Banknote size={16} aria-hidden />
            {es ? "Registrar abono" : "Payment"}
          </button>
        )}
      </div>
    </article>
  );
}
