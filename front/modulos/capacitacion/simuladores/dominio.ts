export interface RetroalimentacionSimulador {
  correcta: boolean;
  mensaje: { es: string; en: string };
}

const error = (es: string, en: string): RetroalimentacionSimulador => ({
  correcta: false,
  mensaje: { es, en },
});

const bien = (es: string, en: string): RetroalimentacionSimulador => ({
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

export function fechaSugeridaSimulador(dias = 7, desde = new Date()) {
  const fecha = new Date(desde);
  fecha.setHours(12, 0, 0, 0);
  fecha.setDate(fecha.getDate() + dias);
  return fechaLocal(fecha);
}

function validarFechaPlan(valor: string, hoy: Date) {
  if (!fechaCalendarioValida(valor))
    return error(
      "Captura el primer vencimiento con formato AAAA-MM-DD.",
      "Enter the first due date using YYYY-MM-DD.",
    );
  if (valor < fechaLocal(hoy))
    return error(
      "El primer vencimiento no puede ser una fecha pasada.",
      "The first due date cannot be in the past.",
    );
  return null;
}

export interface CapturaVentaCreditoSimulada {
  clienteId: string;
  productoId: string;
  cantidad: number;
  anticipo: number;
  numeroTarjeta: string;
  cuota: number;
  periodicidad: "SEMANAL" | "QUINCENAL" | "MENSUAL" | "";
  primerVencimiento: string;
}

export function validarVentaCreditoSimulada(
  captura: CapturaVentaCreditoSimulada,
  hoy = new Date(),
): RetroalimentacionSimulador {
  if (!captura.clienteId)
    return error(
      "Selecciona una clienta registrada; una deuda no puede quedar a público general.",
      "Select a registered customer; debt cannot belong to the general public.",
    );
  if (!captura.productoId || captura.cantidad < 1)
    return error(
      "Elige un producto registrado y una cantidad válida.",
      "Choose a registered product and a valid quantity.",
    );
  if (captura.cantidad > 3)
    return error(
      "Sólo hay 3 piezas. No confirmes una venta sin existencia.",
      "Only 3 units are available. Do not confirm a sale without stock.",
    );
  const total = captura.cantidad * 1200;
  if (captura.anticipo < 0 || captura.anticipo >= total)
    return error(
      "En esta práctica el anticipo debe ser menor al total para que exista financiamiento.",
      "In this practice, the deposit must be below the total so financing remains.",
    );
  if (captura.numeroTarjeta.trim().length < 3)
    return error(
      "Asigna el número de tarjeta capturado por el negocio mientras exista saldo.",
      "Assign the business-entered card number while a balance exists.",
    );
  const financiado = total - captura.anticipo;
  if (!captura.periodicidad || captura.cuota <= 0 || captura.cuota > financiado)
    return error(
      "Define una periodicidad y una cuota mayor a cero que no exceda el saldo financiado.",
      "Set a frequency and an installment above zero that does not exceed the financed balance.",
    );
  const errorFecha = validarFechaPlan(captura.primerVencimiento, hoy);
  if (errorFecha) return errorFecha;
  return bien(
    "Correcto: baja inventario, el anticipo entra al corte y sólo lo financiado aumenta el saldo.",
    "Correct: stock decreases, the deposit enters the cash closing, and only the financed amount increases the balance.",
  );
}

export interface CapturaAbonoSimulado {
  clienteId: string;
  monto: number;
  metodo: "EFECTIVO" | "TRANSFERENCIA" | "TARJETA";
  referencia: string;
}

export function validarAbonoSimulado(
  captura: CapturaAbonoSimulado,
): RetroalimentacionSimulador {
  if (!captura.clienteId)
    return error(
      "Confirma primero a la clienta; el abono debe afectar un expediente concreto.",
      "Confirm the customer first; the payment must affect a specific record.",
    );
  if (captura.monto <= 0)
    return error(
      "El monto debe ser mayor a cero.",
      "The amount must be greater than zero.",
    );
  if (captura.monto > 800)
    return error(
      "El abono supera el saldo de $800.00. Verifica el monto antes de cobrar.",
      "The payment exceeds the $800.00 balance. Verify the amount before collecting.",
    );
  if (captura.metodo !== "EFECTIVO" && captura.referencia.trim().length < 4)
    return error(
      "Transferencia o tarjeta requieren una referencia comprobable.",
      "Transfer or card payments require a verifiable reference.",
    );
  return bien(
    "Correcto: el saldo baja y el mismo método queda disponible para cuadrar el corte.",
    "Correct: the balance decreases and the same method is available for cash reconciliation.",
  );
}

export interface CapturaEntregaSimulada {
  tipo: "CONTADO" | "CREDITO";
  anticipo: number;
  numeroTarjeta: string;
  cuota: number;
  periodicidad: "SEMANAL" | "QUINCENAL" | "MENSUAL" | "";
  primerVencimiento: string;
}

export function validarEntregaSimulada(
  captura: CapturaEntregaSimulada,
  hoy = new Date(),
): RetroalimentacionSimulador {
  if (captura.tipo === "CONTADO") {
    if (captura.anticipo !== 1000)
      return error(
        "En contado se cobra el total de $1,000.00; no se crea saldo.",
        "Cash delivery collects the full $1,000.00; no balance is created.",
      );
    return bien(
      "Correcto: la entrega crea una venta de contado, baja inventario y suma $1,000.00 al corte.",
      "Correct: delivery creates a cash sale, reduces stock, and adds $1,000.00 to the closing.",
    );
  }
  if (captura.anticipo < 0 || captura.anticipo >= 1000)
    return error(
      "Para practicar crédito, el anticipo debe ser menor a $1,000.00.",
      "To practice credit, the deposit must be below $1,000.00.",
    );
  if (captura.numeroTarjeta.trim().length < 3)
    return error(
      "El crédito exige número de tarjeta mientras exista saldo.",
      "Credit requires a card number while a balance exists.",
    );
  if (
    !captura.periodicidad ||
    captura.cuota <= 0 ||
    captura.cuota > 1000 - captura.anticipo
  )
    return error(
      "Captura un plan coherente con el monto financiado.",
      "Enter a plan consistent with the financed amount.",
    );
  const errorFecha = validarFechaPlan(captura.primerVencimiento, hoy);
  if (errorFecha) return errorFecha;
  return bien(
    "Correcto: la entrega crea la venta, baja inventario y suma sólo lo financiado al saldo.",
    "Correct: delivery creates the sale, reduces stock, and adds only the financed amount to the balance.",
  );
}

export interface CapturaDevolucionSimulada {
  cantidad: number;
  motivo: string;
  evidencia: boolean;
  autorizador: "ADMINISTRADOR" | "CONTABLE" | "ALMACENISTA" | "";
  operadorCaja: "ADMINISTRADOR" | "COBRADOR" | "CONTABLE" | "";
}

export function calcularDevolucionSimulada(cantidad: number) {
  const total = Math.max(0, cantidad) * 500;
  const aplicadoSaldo = Math.min(600, total);
  return { total, aplicadoSaldo, reembolso: total - aplicadoSaldo };
}

export function validarDevolucionSimulada(
  captura: CapturaDevolucionSimulada,
): RetroalimentacionSimulador {
  if (captura.cantidad < 1 || captura.cantidad > 2)
    return error(
      "La venta contiene 2 piezas; devuelve una cantidad entre 1 y 2.",
      "The sale contains 2 units; return a quantity from 1 to 2.",
    );
  if (captura.motivo.trim().length < 10)
    return error(
      "Describe el motivo con suficiente detalle para que la auditoría sea útil.",
      "Describe the reason in enough detail for a useful audit trail.",
    );
  if (!captura.evidencia)
    return error(
      "Adjunta la fotografía de evidencia antes de solicitar autorización.",
      "Attach photo evidence before requesting authorization.",
    );
  if (
    !(["ADMINISTRADOR", "CONTABLE"] as string[]).includes(captura.autorizador)
  )
    return error(
      "Sólo Administración o Contabilidad pueden autorizar la devolución.",
      "Only Administration or Accounting may authorize the return.",
    );
  const { reembolso } = calcularDevolucionSimulada(captura.cantidad);
  if (
    reembolso > 0 &&
    !(["ADMINISTRADOR", "COBRADOR"] as string[]).includes(captura.operadorCaja)
  )
    return error(
      "Indica la caja de Administración o Cobranza que realmente entregará el reembolso.",
      "Identify the Administration or Collections cash desk that will actually issue the refund.",
    );
  return bien(
    "Correcto: se conserva la venta, se compensa saldo, el remanente sale de la caja indicada y el inventario recibe la mercancía.",
    "Correct: the sale remains, balance is offset, the remainder leaves the selected cash desk, and stock receives the goods.",
  );
}

export type DecisionConflictoSimulado =
  | ""
  | "BORRAR"
  | "FORZAR"
  | "CONSERVAR_REVISAR";

export function validarConflictoSincronizacion(
  sincronizado: boolean,
  decision: DecisionConflictoSimulado,
): RetroalimentacionSimulador {
  if (!sincronizado)
    return error(
      "Primero envía los pendientes para recibir la respuesta del servidor.",
      "Send pending operations first to receive the server response.",
    );
  if (decision === "BORRAR")
    return error(
      "Borrar elimina la evidencia local y puede ocultar una operación legítima.",
      "Deleting removes local evidence and may hide a legitimate operation.",
    );
  if (decision === "FORZAR")
    return error(
      "No fuerces un stock desactualizado: podrías vender una pieza inexistente.",
      "Do not force stale stock: you could sell a nonexistent unit.",
    );
  if (decision !== "CONSERVAR_REVISAR")
    return error(
      "Interpreta el conflicto y elige una acción.",
      "Interpret the conflict and choose an action.",
    );
  return bien(
    "Correcto: conservas folio y evidencia, separas el conflicto y envías la corrección a revisión.",
    "Correct: you preserve the receipt and evidence, isolate the conflict, and send the correction for review.",
  );
}
