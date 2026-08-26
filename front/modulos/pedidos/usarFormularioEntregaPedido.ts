import { useState, type FormEvent } from "react";

import type { DatosEntregaPedidoWeb, PedidoWeb } from "./tipos";

function fechaManana() {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 1);
  return fecha.toISOString().slice(0, 10);
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
  const [tipo, establecerTipo] = useState<"CREDITO" | "CONTADO">("CREDITO");
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
  const [primerVencimiento, establecerPrimerVencimiento] =
    useState(fechaManana());

  const anticipoNumero = Number(anticipo || 0);
  const financiado =
    tipo === "CREDITO" ? Math.max(0, total - anticipoNumero) : 0;
  const todosVerificados = pedido.items.every((item) =>
    verificados.includes(item.id),
  );
  const cobroValido =
    anticipoNumero >= 0 &&
    anticipoNumero <= total &&
    (tipo === "CONTADO"
      ? anticipoNumero === total
      : financiado > 0 &&
        numeroTarjeta.trim().length >= 3 &&
        Number(montoCuota) > 0 &&
        Boolean(primerVencimiento));

  function cambiarTipo(nuevo: "CREDITO" | "CONTADO") {
    establecerTipo(nuevo);
    if (nuevo === "CONTADO") establecerAnticipo(String(total));
    else if (Number(anticipo) >= total) establecerAnticipo("0");
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (paso !== 3 || !todosVerificados || !cobroValido) return;
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
    financiado,
    todosVerificados,
    cobroValido,
    establecerVerificados,
    cambiarTipo,
    establecerAnticipo,
    establecerMetodo,
    establecerNumeroTarjeta,
    establecerPeriodicidad,
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
