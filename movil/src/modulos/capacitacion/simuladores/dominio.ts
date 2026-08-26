export interface ResultadoPractica {
  correcta: boolean;
  mensaje: { es: string; en: string };
}

const no = (es: string, en: string): ResultadoPractica => ({
  correcta: false,
  mensaje: { es, en },
});
const si = (es: string, en: string): ResultadoPractica => ({
  correcta: true,
  mensaje: { es, en },
});

function fechaLocal(fecha: Date) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

function fechaCalendarioValida(valor: string) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!partes) return false;
  const [, anio, mes, dia] = partes;
  const fecha = new Date(Number(anio), Number(mes) - 1, Number(dia));
  return fechaLocal(fecha) === valor;
}

export function fechaSugeridaEntregaPractica(dias = 7, desde = new Date()) {
  const fecha = new Date(desde);
  fecha.setHours(12, 0, 0, 0);
  fecha.setDate(fecha.getDate() + dias);
  return fechaLocal(fecha);
}

function validarFechaPlan(valor: string, hoy: Date) {
  if (!fechaCalendarioValida(valor))
    return no(
      "Captura el primer vencimiento como AAAA-MM-DD.",
      "Enter the first due date as YYYY-MM-DD.",
    );
  if (valor < fechaLocal(hoy))
    return no(
      "El primer vencimiento no puede ser una fecha pasada.",
      "The first due date cannot be in the past.",
    );
  return null;
}

export interface VentaCreditoPractica {
  cliente: string;
  producto: string;
  cantidad: number;
  anticipo: number;
  tarjeta: string;
  cuota: number;
  periodicidad: "" | "SEMANAL" | "QUINCENAL" | "MENSUAL";
  vencimiento: string;
}

export function validarVentaCreditoPractica(
  valor: VentaCreditoPractica,
  hoy = new Date(),
) {
  if (!valor.cliente)
    return no(
      "Selecciona una clienta: el crédito no puede quedar a público general.",
      "Select a customer: credit cannot belong to the general public.",
    );
  if (!valor.producto || valor.cantidad < 1 || valor.cantidad > 3)
    return no(
      "Elige producto y una cantidad entre 1 y las 3 piezas disponibles.",
      "Choose a product and a quantity from 1 to the 3 available units.",
    );
  const financiado = valor.cantidad * 1200 - valor.anticipo;
  if (valor.anticipo < 0 || financiado <= 0)
    return no(
      "El anticipo debe dejar un monto por financiar.",
      "The deposit must leave an amount to finance.",
    );
  if (valor.tarjeta.trim().length < 3)
    return no(
      "Asigna el número de tarjeta mientras exista saldo.",
      "Assign a card number while a balance exists.",
    );
  if (!valor.periodicidad || valor.cuota <= 0 || valor.cuota > financiado)
    return no(
      "La periodicidad y cuota deben ser coherentes con el saldo.",
      "Frequency and installment must be consistent with the balance.",
    );
  const errorFecha = validarFechaPlan(valor.vencimiento, hoy);
  if (errorFecha) return errorFecha;
  return si(
    "Correcto: baja stock, el anticipo entra al corte y sólo lo financiado aumenta saldo.",
    "Correct: stock decreases, the deposit enters closing, and only financing increases balance.",
  );
}

export interface AbonoPractica {
  cliente: string;
  monto: number;
  metodo: "EFECTIVO" | "TRANSFERENCIA" | "TARJETA";
  referencia: string;
}

export function validarAbonoPractica(valor: AbonoPractica) {
  if (!valor.cliente)
    return no("Confirma a la clienta.", "Confirm the customer.");
  if (valor.monto <= 0)
    return no("El monto debe ser mayor a cero.", "Amount must be above zero.");
  if (valor.monto > 800)
    return no(
      "El abono supera el saldo de $800.00.",
      "The payment exceeds the $800.00 balance.",
    );
  if (valor.metodo !== "EFECTIVO" && valor.referencia.trim().length < 4)
    return no(
      "El pago electrónico necesita referencia.",
      "Electronic payment requires a reference.",
    );
  return si(
    "Correcto: baja saldo y el método queda en el corte.",
    "Correct: balance decreases and the method enters closing.",
  );
}

export interface EntregaPractica {
  tipo: "CONTADO" | "CREDITO";
  anticipo: number;
  tarjeta: string;
  cuota: number;
  periodicidad: "" | "SEMANAL" | "QUINCENAL" | "MENSUAL";
  primerVencimiento: string;
}

export function validarEntregaPractica(
  valor: EntregaPractica,
  hoy = new Date(),
) {
  if (valor.tipo === "CONTADO")
    return valor.anticipo === 1000
      ? si(
          "Correcto: cobra el total, crea la venta y no crea saldo.",
          "Correct: collect the total, create the sale, and create no balance.",
        )
      : no(
          "Contado exige cobrar los $1,000.00 completos.",
          "Cash requires collecting the full $1,000.00.",
        );
  const saldo = 1000 - valor.anticipo;
  if (valor.anticipo < 0 || saldo <= 0)
    return no(
      "El anticipo debe dejar un saldo financiado.",
      "The deposit must leave a financed balance.",
    );
  if (valor.tarjeta.trim().length < 3)
    return no(
      "El crédito exige número de tarjeta.",
      "Credit requires a card number.",
    );
  if (!valor.periodicidad || valor.cuota <= 0 || valor.cuota > saldo)
    return no(
      "Captura un plan coherente con el saldo.",
      "Enter a plan consistent with the balance.",
    );
  const errorFecha = validarFechaPlan(valor.primerVencimiento, hoy);
  if (errorFecha) return errorFecha;
  return si(
    "Correcto: la entrega crea venta, saldo financiado y salida de inventario.",
    "Correct: delivery creates the sale, financed balance, and stock issue.",
  );
}

export interface DevolucionPractica {
  cantidad: number;
  motivo: string;
  evidencia: boolean;
  autorizador: "" | "ADMINISTRADOR" | "CONTABLE" | "ALMACENISTA";
  operadorCaja: "" | "ADMINISTRADOR" | "COBRADOR" | "CONTABLE";
}

export function importesDevolucionPractica(cantidad: number) {
  const total = Math.max(0, cantidad) * 500;
  const saldo = Math.min(600, total);
  return { total, saldo, reembolso: total - saldo };
}

export function validarDevolucionPractica(valor: DevolucionPractica) {
  if (valor.cantidad < 1 || valor.cantidad > 2)
    return no(
      "La venta contiene sólo 2 piezas.",
      "The sale contains only 2 units.",
    );
  if (valor.motivo.trim().length < 10 || !valor.evidencia)
    return no(
      "Captura un motivo detallado y fotografía.",
      "Enter a detailed reason and photo.",
    );
  if (!(["ADMINISTRADOR", "CONTABLE"] as string[]).includes(valor.autorizador))
    return no(
      "Almacén no autoriza: sólo Administración o Contabilidad.",
      "Warehouse does not approve: only Administration or Accounting.",
    );
  if (
    importesDevolucionPractica(valor.cantidad).reembolso > 0 &&
    !(["ADMINISTRADOR", "COBRADOR"] as string[]).includes(valor.operadorCaja)
  )
    return no(
      "Selecciona la caja que realmente entrega el reembolso.",
      "Select the cash desk that actually issues the refund.",
    );
  return si(
    "Correcto: compensa saldo, reintegra stock y afecta la caja indicada.",
    "Correct: offsets balance, restores stock, and affects the selected cash desk.",
  );
}

export type DecisionConflicto = "" | "BORRAR" | "FORZAR" | "REVISAR";

export function validarSincronizacionPractica(
  enviado: boolean,
  decision: DecisionConflicto,
) {
  if (!enviado)
    return no(
      "Envía los pendientes antes de decidir.",
      "Send pending operations before deciding.",
    );
  if (decision === "BORRAR")
    return no(
      "No borres evidencia local de una operación.",
      "Do not delete local operation evidence.",
    );
  if (decision === "FORZAR")
    return no(
      "No fuerces una venta contra stock cero.",
      "Do not force a sale against zero stock.",
    );
  if (decision !== "REVISAR")
    return no(
      "Interpreta el conflicto y elige una acción.",
      "Interpret the conflict and choose an action.",
    );
  return si(
    "Correcto: conserva folio y evidencia y manda el conflicto a revisión.",
    "Correct: keep receipt and evidence and send the conflict for review.",
  );
}
