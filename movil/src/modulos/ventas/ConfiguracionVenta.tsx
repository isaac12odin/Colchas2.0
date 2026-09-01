import { StyleSheet, Text, View } from "react-native";

import {
  CampoMovil,
  EstadoMovil,
  SelectorSegmentado,
  TarjetaMovil,
  usarDisenoResponsivo,
} from "../../componentes/ui";
import { usarTema } from "../../tema";
import { dinero } from "../../utilidades/formato";
import { parsearDineroCapturado } from "../../utilidades/dinero";
import type { MetodoPago, Periodicidad, TipoVenta } from "./dominioVenta";

interface Propiedades {
  tipo: TipoVenta;
  montoTotal: number;
  anticipo: string;
  metodoAnticipo: MetodoPago;
  periodicidad: Periodicidad;
  cuota: string;
  primerVencimiento: string;
  numeroTarjeta: string;
  es: boolean;
  permiteCredito?: boolean;
  alCambiarTipo: (valor: TipoVenta) => void;
  alCambiarAnticipo: (valor: string) => void;
  alCambiarMetodoAnticipo: (valor: MetodoPago) => void;
  alCambiarPeriodicidad: (valor: Periodicidad) => void;
  alCambiarCuota: (valor: string) => void;
  alCambiarVencimiento: (valor: string) => void;
  alCambiarNumeroTarjeta: (valor: string) => void;
}

export function ConfiguracionVenta({ es, ...control }: Propiedades) {
  const tema = usarTema();
  const diseno = usarDisenoResponsivo();
  const anticipoCapturado = parsearDineroCapturado(control.anticipo);
  const anticipoNumero = anticipoCapturado ?? 0;
  const anticipoInvalido =
    control.anticipo.trim().length > 0 && anticipoCapturado === null;
  const cuotaCapturada = parsearDineroCapturado(control.cuota);
  const cuotaInvalida =
    control.cuota.trim().length > 0 &&
    (cuotaCapturada === null || cuotaCapturada <= 0);
  const saldoNuevo =
    control.tipo === "CREDITO"
      ? Math.max(0, control.montoTotal - anticipoNumero)
      : 0;
  const requiereFinanciamiento = saldoNuevo > 0;
  const opcionesMetodo = [
    { valor: "EFECTIVO" as const, texto: es ? "Efectivo" : "Cash" },
    {
      valor: "TRANSFERENCIA" as const,
      texto: es ? "Transfer." : "Transfer",
    },
    { valor: "TARJETA" as const, texto: es ? "Tarjeta" : "Card" },
    { valor: "OTRO" as const, texto: es ? "Otro" : "Other" },
  ];

  return (
    <View style={estilos.contenido}>
      <View>
        <Text style={[estilos.titulo, { color: tema.texto }]}>
          {es ? "¿Cómo pagará?" : "How will they pay?"}
        </Text>
        <Text style={[estilos.detalle, { color: tema.textoSecundario }]}>
          {es
            ? "Define contado o crédito antes de confirmar."
            : "Choose cash or credit before confirming."}
        </Text>
      </View>

      <SelectorSegmentado
        etiqueta={es ? "Tipo de venta" : "Sale type"}
        valor={control.tipo}
        alCambiar={control.alCambiarTipo}
        opciones={[
          ...(control.permiteCredito !== false
            ? [{ valor: "CREDITO" as const, texto: es ? "Crédito" : "Credit" }]
            : []),
          { valor: "CONTADO" as const, texto: es ? "Contado" : "Paid in full" },
        ]}
      />

      <TarjetaMovil estilo={estilos.resumenImporte}>
        <View style={estilos.filaImporte}>
          <Text
            style={[estilos.importeEtiqueta, { color: tema.textoSecundario }]}
          >
            {es ? "Total de productos" : "Product total"}
          </Text>
          <Text style={[estilos.total, { color: tema.texto }]}>
            {dinero.format(control.montoTotal)}
          </Text>
        </View>
        <View style={[estilos.separador, { backgroundColor: tema.borde }]} />
        <View style={estilos.filaImporte}>
          <Text
            style={[estilos.importeEtiqueta, { color: tema.textoSecundario }]}
          >
            {es ? "Saldo que se agregará" : "Balance to add"}
          </Text>
          <Text style={[estilos.saldo, { color: tema.primario }]}>
            {dinero.format(saldoNuevo)}
          </Text>
        </View>
      </TarjetaMovil>

      {control.tipo === "CONTADO" ? (
        <View style={estilos.bloque}>
          <SelectorSegmentado
            etiqueta={
              es ? "¿Cómo recibió el total?" : "How was the total paid?"
            }
            valor={control.metodoAnticipo}
            alCambiar={control.alCambiarMetodoAnticipo}
            opciones={opcionesMetodo}
          />
          <EstadoMovil
            tipo="exito"
            texto={
              es
                ? "La venta queda liquidada, entra al corte con este método y no aumenta el saldo."
                : "This sale is paid in full, enters the cash close under this method, and adds no balance."
            }
          />
        </View>
      ) : (
        <>
          <View style={estilos.bloque}>
            <CampoMovil
              etiqueta={es ? "Anticipo recibido" : "Deposit received"}
              ayuda={
                es
                  ? "Escribe 0 si no recibes anticipo."
                  : "Enter 0 when no deposit is received."
              }
              valor={control.anticipo}
              alCambiar={control.alCambiarAnticipo}
              teclado="decimal-pad"
              placeholder="0.00"
              icono="cash-outline"
              error={
                anticipoInvalido
                  ? es
                    ? "Escribe un importe válido con máximo dos decimales."
                    : "Enter a valid amount with up to two decimals."
                  : undefined
              }
              requerido
            />
            {anticipoNumero > 0 ? (
              <SelectorSegmentado
                etiqueta={es ? "Método del anticipo" : "Deposit method"}
                valor={control.metodoAnticipo}
                alCambiar={control.alCambiarMetodoAnticipo}
                opciones={opcionesMetodo}
              />
            ) : null}
          </View>

          {requiereFinanciamiento ? (
            <View style={estilos.bloque}>
              <Text style={[estilos.bloqueTitulo, { color: tema.texto }]}>
                {es ? "Datos del crédito" : "Credit details"}
              </Text>
              <CampoMovil
                etiqueta={
                  es ? "Número de tarjeta asignado" : "Assigned card number"
                }
                ayuda={
                  es
                    ? "Este número lo captura el operador; no se genera solo."
                    : "The operator enters this number; it is not generated automatically."
                }
                valor={control.numeroTarjeta}
                alCambiar={control.alCambiarNumeroTarjeta}
                placeholder={es ? "Ej. 0042" : "E.g. 0042"}
                icono="card-outline"
                requerido
              />
              <SelectorSegmentado
                etiqueta={es ? "Cada cuándo pagará" : "Payment frequency"}
                valor={control.periodicidad}
                alCambiar={control.alCambiarPeriodicidad}
                opciones={[
                  { valor: "SEMANAL", texto: es ? "Semanal" : "Weekly" },
                  {
                    valor: "QUINCENAL",
                    texto: es ? "Quincenal" : "Biweekly",
                  },
                  { valor: "MENSUAL", texto: es ? "Mensual" : "Monthly" },
                ]}
              />
              <View
                style={[
                  estilos.camposPlan,
                  (diseno.compacto || diseno.fontScale > 1.2) &&
                    estilos.camposApilados,
                ]}
              >
                <CampoMovil
                  etiqueta={es ? "Monto de cada abono" : "Installment amount"}
                  valor={control.cuota}
                  alCambiar={control.alCambiarCuota}
                  teclado="decimal-pad"
                  placeholder="250.00"
                  icono="wallet-outline"
                  error={
                    cuotaInvalida
                      ? es
                        ? "La cuota debe ser mayor a cero."
                        : "The installment must be greater than zero."
                      : undefined
                  }
                  requerido
                  estilo={estilos.campoPlan}
                />
                <CampoMovil
                  etiqueta={es ? "Primer vencimiento" : "First due date"}
                  ayuda={es ? "Formato AAAA-MM-DD" : "YYYY-MM-DD format"}
                  valor={control.primerVencimiento}
                  alCambiar={control.alCambiarVencimiento}
                  placeholder="AAAA-MM-DD"
                  icono="calendar-outline"
                  requerido
                  estilo={estilos.campoPlan}
                />
              </View>
            </View>
          ) : (
            <EstadoMovil
              tipo="exito"
              texto={
                es
                  ? "El pago cubre toda la venta: se registrará como contado, con este método y sin crear deuda."
                  : "The payment covers the whole sale: it will be recorded as paid in full with this method and no debt."
              }
            />
          )}
        </>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenido: { gap: 18 },
  titulo: { fontSize: 20, lineHeight: 26, fontWeight: "900" },
  detalle: { fontSize: 13, lineHeight: 19, marginTop: 3 },
  resumenImporte: { gap: 11 },
  filaImporte: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  importeEtiqueta: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: "700" },
  total: { fontSize: 18, lineHeight: 24, fontWeight: "900" },
  saldo: { fontSize: 20, lineHeight: 26, fontWeight: "900" },
  separador: { height: 1 },
  bloque: { gap: 15 },
  bloqueTitulo: { fontSize: 16, lineHeight: 21, fontWeight: "900" },
  camposPlan: { flexDirection: "row", gap: 11 },
  camposApilados: { flexDirection: "column" },
  campoPlan: { flex: 1 },
});
