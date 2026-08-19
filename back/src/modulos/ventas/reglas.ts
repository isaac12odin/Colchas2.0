import { TipoVenta } from "@prisma/client";

export function faltaTarjetaParaCredito(entrada: {
  tipo: TipoVenta;
  financiado: number;
  tarjetaActual?: string | null;
  tarjetaPropuesta?: string;
}) {
  return (
    entrada.tipo === TipoVenta.CREDITO &&
    entrada.financiado > 0 &&
    !entrada.tarjetaActual &&
    !entrada.tarjetaPropuesta
  );
}
