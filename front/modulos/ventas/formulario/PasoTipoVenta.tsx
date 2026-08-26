import { Banknote, CreditCard } from "lucide-react";

export function PasoTipoVenta({
  es,
  alElegir,
}: {
  es: boolean;
  alElegir: (credito: boolean) => void;
}) {
  return (
    <section
      className="grid gap-4 py-3 sm:grid-cols-2"
      data-capacitacion="ventas.tipo"
    >
      <OpcionTipo
        titulo={es ? "Venta de contado" : "Cash sale"}
        descripcion={
          es
            ? "Se cobra completa. Puedes relacionarla con un cliente o dejarla como público general."
            : "Collect the full amount. Link a customer or leave it as general public."
        }
        icono={<Banknote className="text-emerald-600" size={34} />}
        elegir={() => alElegir(false)}
        capacitacion="ventas.tipo.contado"
      />
      <OpcionTipo
        titulo={es ? "Venta a crédito" : "Credit sale"}
        descripcion={
          es
            ? "Lo financiado se suma inmediatamente al saldo del cliente y se genera su calendario de pagos."
            : "The financed amount is added to the customer balance and a payment schedule is created."
        }
        icono={<CreditCard className="text-blue-600" size={34} />}
        elegir={() => alElegir(true)}
        capacitacion="ventas.tipo.credito"
      />
    </section>
  );
}

function OpcionTipo({
  titulo,
  descripcion,
  icono,
  elegir,
  capacitacion,
}: {
  titulo: string;
  descripcion: string;
  icono: React.ReactNode;
  elegir: () => void;
  capacitacion: "ventas.tipo.contado" | "ventas.tipo.credito";
}) {
  return (
    <button
      type="button"
      className="min-h-44 rounded-2xl border-2 border-slate-200 p-6 text-left transition hover:border-blue-500 hover:bg-blue-50 dark:border-slate-700 dark:hover:border-blue-500 dark:hover:bg-blue-950/30"
      onClick={elegir}
      data-capacitacion={capacitacion}
    >
      <span className="mb-5 block">{icono}</span>
      <strong className="block text-xl">{titulo}</strong>
      <span className="mt-2 block text-sm leading-6 text-slate-500">
        {descripcion}
      </span>
    </button>
  );
}
