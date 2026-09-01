import { type FormEvent, useState } from "react";

import type { DatosEntregaPedidoWeb, PedidoWeb } from "./tipos";

export type TipoCobroEntrega = "" | "CREDITO" | "CONTADO";

function fechaLocal(fecha: Date) {
  const compensada = new Date(
    fecha.getTime() - fecha.getTimezoneOffset() * 60_000,
  );
  return compensada.toISOString().slice(0, 10);
}

export function fechaMinimaPrimerVencimiento() {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 1);
  return fechaLocal(fecha);
}

function fechaSugeridaPrimerVencimiento(
  periodicidad: "SEMANAL" | "QUINCENAL" | "MENSUAL",
) {
  const fecha = new Date();
  if (periodicidad === "MENSUAL") fecha.setMonth(fecha.getMonth() + 1);
  else fecha.setDate(fecha.getDate() + (periodicidad === "SEMANAL" ? 7 : 15));
  return fechaLocal(fecha);
}

export function usarFormularioEntregaPedido({
  pedido,
  total,
  alGuardar,
}: {
  pedido: PedidoWeb;
  total: number;
  alGuardar: (datos: DatosEntregaPedidoWeb) => Promise<void>;
}) {
  const [paso, establecerPaso] = useState(1);
  const [verificados, establecerVerificados] = useState<string[]>([]);
  const [tipo, establecerTipo] = useState<TipoCobroEntrega>("");
  const [anticipo, establecerAnticipo] = useState("0");
  const [metodo, establecerMetodo] =
    useState<DatosEntregaPedidoWeb["metodoAnticipo"]>("EFECTIVO");
  const [numeroTarjeta, establecerNumeroTarjeta] = useState(
    pedido.cliente.numeroTarjeta ?? "",
  );
  const [periodicidad, establecerPeriodicidad] = useState<
    "SEMANAL" | "QUINCENAL" | "MENSUAL"
  >("SEMANAL");
  const [montoCuota, establecerMontoCuota] = useState("");
  const [primerVencimiento, establecerPrimerVencimiento] = useState(
    fechaSugeridaPrimerVencimiento("SEMANAL"),
  );

  const anticipoNumero = Number(anticipo || 0);
  const financiado =
    tipo === "CREDITO" ? Math.max(0, total - anticipoNumero) : 0;
  const fechaMinima = fechaMinimaPrimerVencimiento();
  const primerVencimientoValido = primerVencimiento >= fechaMinima;
  const todosVerificados = pedido.items.every((item) =>
    verificados.includes(item.id),
  );
  const cobroValido =
    tipo !== "" &&
    anticipoNumero >= 0 &&
    anticipoNumero <= total &&
    (tipo === "CONTADO"
      ? anticipoNumero === total
      : financiado > 0 &&
        numeroTarjeta.trim().length >= 3 &&
        Number(montoCuota) > 0 &&
        primerVencimientoValido);

  function cambiarTipo(nuevo: Exclude<TipoCobroEntrega, "">) {
    establecerTipo(nuevo);
    if (nuevo === "CONTADO") establecerAnticipo(String(total));
    else if (Number(anticipo) >= total) establecerAnticipo("0");
  }

  function cambiarPeriodicidad(nueva: "SEMANAL" | "QUINCENAL" | "MENSUAL") {
    establecerPeriodicidad(nueva);
    establecerPrimerVencimiento(fechaSugeridaPrimerVencimiento(nueva));
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (paso !== 3 || !todosVerificados || !cobroValido || !tipo) return;
    await alGuardar({
      tipo,
      anticipo: tipo === "CONTADO" ? 0 : anticipoNumero,
      metodoAnticipo: metodo,
      ...(tipo === "CREDITO"
        ? {
            numeroTarjeta: numeroTarjeta.trim(),
            plan: {
              periodicidad,
              montoCuota: Number(montoCuota),
              primerVencimiento: new Date(
                `${primerVencimiento}T12:00:00`,
              ).toISOString(),
            },
          }
        : {}),
    });
  }

  return {
    paso,
    verificados,
    tipo,
    anticipo,
    metodo,
    numeroTarjeta,
    periodicidad,
    montoCuota,
    primerVencimiento,
    fechaMinima,
    primerVencimientoValido,
    financiado,
    todosVerificados,
    cobroValido,
    establecerVerificados,
    cambiarTipo,
    establecerAnticipo,
    establecerMetodo,
    establecerNumeroTarjeta,
    cambiarPeriodicidad,
    establecerMontoCuota,
    establecerPrimerVencimiento,
    siguiente: () => establecerPaso((actual) => Math.min(3, actual + 1)),
    anterior: () => establecerPaso((actual) => Math.max(1, actual - 1)),
    enviar,
  };
}

export type ControlEntregaPedido = ReturnType<
  typeof usarFormularioEntregaPedido
>;
