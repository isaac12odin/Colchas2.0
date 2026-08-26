import { Banknote } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Modal } from "@/componentes/ui";
import { CamposNoCobroRuta } from "./CamposNoCobroRuta";
import { CamposPagoRuta } from "./CamposPagoRuta";
import { ResumenCobroRuta } from "./ResumenCobroRuta";
import type { ClienteJornadaWeb } from "./tipos";
import { VisitaRegistradaRuta } from "./VisitaRegistradaRuta";

export interface RegistroVisitaRuta {
  resultado: string;
  monto?: number;
  metodo?: string;
  referencia?: string;
  motivoNoCobro?: string;
  promesaPagoFecha?: string;
  promesaPagoMonto?: number;
  notas?: string;
}

const resultadosSinCobro = new Set(["NO_PAGO", "AUSENTE", "REPROGRAMADO"]);

export function ModalRegistrarVisita({
  cliente,
  es,
  cancelar,
  guardar,
  cerrar,
  registrar,
}: {
  cliente: ClienteJornadaWeb | null;
  es: boolean;
  cancelar: string;
  guardar: string;
  cerrar: () => void;
  registrar: (datos: RegistroVisitaRuta) => Promise<void>;
}) {
  const [resultado, establecerResultado] = useState(
    Number(cliente?.estadoCuenta.saldoTotal ?? 0) > 0 ? "PAGO" : "ENTREGA",
  );
  const [monto, establecerMonto] = useState("");
  const [metodo, establecerMetodo] = useState("EFECTIVO");
  const [referencia, establecerReferencia] = useState("");
  const [motivo, establecerMotivo] = useState("");
  const [promesaFecha, establecerPromesaFecha] = useState("");
  const [promesaMonto, establecerPromesaMonto] = useState("");
  const [notas, establecerNotas] = useState("");
  const [guardando, establecerGuardando] = useState(false);

  if (!cliente) return null;

  const sinCobro = resultadosSinCobro.has(resultado);
  const recibido = Number(monto || 0);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (guardando || cliente?.visita) return;
    establecerGuardando(true);
    try {
      await registrar({
        resultado,
        monto: resultado === "PAGO" ? recibido : undefined,
        metodo: resultado === "PAGO" ? metodo : undefined,
        referencia:
          resultado === "PAGO" && referencia.trim()
            ? referencia.trim()
            : undefined,
        motivoNoCobro: sinCobro ? motivo : undefined,
        promesaPagoFecha: sinCobro ? promesaFecha : undefined,
        promesaPagoMonto: sinCobro ? Number(promesaMonto) : undefined,
        notas: notas.trim() || undefined,
      });
    } finally {
      establecerGuardando(false);
    }
  }

  return (
    <Modal
      abierto
      cerrar={cerrar}
      titulo={cliente.nombreCompleto}
      ancho="amplio"
    >
      {cliente.visita ? (
        <VisitaRegistradaRuta cliente={cliente} es={es} cerrar={cerrar} />
      ) : (
        <form
          onSubmit={enviar}
          className="space-y-4"
          data-capacitacion="rutas.visita.formulario"
        >
          <ResumenCobroRuta cliente={cliente} es={es} />
          <label>
            <span className="etiqueta">{es ? "Resultado" : "Result"}</span>
            <select
              className="campo"
              value={resultado}
              onChange={(evento) => establecerResultado(evento.target.value)}
              data-capacitacion="rutas.visita.resultado"
            >
              <option value="PAGO">
                {es ? "Recibí dinero" : "Payment received"}
              </option>
              <option value="NO_PAGO">{es ? "No cobré" : "No payment"}</option>
              <option value="AUSENTE">
                {es ? "Cliente ausente" : "Customer absent"}
              </option>
              <option value="REPROGRAMADO">
                {es ? "Se reprogramó" : "Rescheduled"}
              </option>
              <option value="ENTREGA">
                {es ? "Sólo entrega" : "Delivery only"}
              </option>
            </select>
          </label>

          {resultado === "PAGO" && (
            <CamposPagoRuta
              es={es}
              saldo={cliente.estadoCuenta.saldoTotal}
              cobrarHoy={cliente.estadoCuenta.cobrarHoy}
              monto={monto}
              metodo={metodo}
              referencia={referencia}
              cambiarMonto={establecerMonto}
              cambiarMetodo={establecerMetodo}
              cambiarReferencia={establecerReferencia}
            />
          )}

          {sinCobro && (
            <CamposNoCobroRuta
              es={es}
              saldo={cliente.estadoCuenta.saldoTotal}
              motivo={motivo}
              promesaFecha={promesaFecha}
              promesaMonto={promesaMonto}
              cambiarMotivo={establecerMotivo}
              cambiarFecha={establecerPromesaFecha}
              cambiarMonto={establecerPromesaMonto}
            />
          )}

          <label>
            <span className="etiqueta">{es ? "Notas" : "Notes"}</span>
            <textarea
              className="campo min-h-20 py-3"
              value={notas}
              onChange={(evento) => establecerNotas(evento.target.value)}
              data-capacitacion="rutas.visita.notas"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className="boton-secundario" onClick={cerrar}>
              {cancelar}
            </button>
            <button
              disabled={guardando}
              className="boton-primario disabled:opacity-50"
              data-capacitacion="rutas.visita.guardar"
            >
              <Banknote size={17} />
              {guardando ? (es ? "Guardando…" : "Saving…") : guardar}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
