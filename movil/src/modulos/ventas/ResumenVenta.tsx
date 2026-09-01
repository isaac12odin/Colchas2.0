import { StyleSheet, Text, View } from "react-native";

import { BotonMovil, EstadoMovil, TarjetaMovil } from "../../componentes/ui";
import type { usarTema } from "../../tema";
import { dinero } from "../../utilidades/formato";
import { parsearDineroCapturado } from "../../utilidades/dinero";
import type { ControlVenta } from "./usarVentaCampo";

export function ResumenVenta({
  control,
  es,
  tema,
}: {
  control: ControlVenta;
  es: boolean;
  tema: ReturnType<typeof usarTema>;
}) {
  const unidades = control.carrito.reduce(
    (total, linea) => total + linea.cantidad,
    0,
  );
  const creditoFinanciado =
    control.tipo === "CREDITO" && control.financiado > 0;
  return (
    <>
      <View>
        <Text style={[estilos.titulo, { color: tema.texto }]}>
          {es ? "Confirma la venta" : "Confirm the sale"}
        </Text>
        <Text style={[estilos.detalle, { color: tema.textoSecundario }]}>
          {es
            ? "Revisa qué cambiará antes de guardar."
            : "Review what will change before saving."}
        </Text>
      </View>

      <TarjetaMovil estilo={estilos.resumen}>
        <Text style={[estilos.seccion, { color: tema.textoSecundario }]}>
          {es ? "PRODUCTOS" : "PRODUCTS"}
        </Text>
        {control.carrito.map((linea) => (
          <View key={linea.id} style={estilos.fila}>
            <Text style={[estilos.producto, { color: tema.texto }]}>
              {linea.cantidad} × {linea.nombre}
            </Text>
            <Text style={[estilos.importe, { color: tema.texto }]}>
              {dinero.format(linea.cantidad * Number(linea.precioVenta))}
            </Text>
          </View>
        ))}
        <View style={[estilos.totalFila, { borderColor: tema.borde }]}>
          <Text style={[estilos.totalEtiqueta, { color: tema.texto }]}>
            Total
          </Text>
          <Text style={[estilos.total, { color: tema.primario }]}>
            {dinero.format(control.total)}
          </Text>
        </View>
      </TarjetaMovil>

      <TarjetaMovil estilo={estilos.consecuencias}>
        <Text style={[estilos.seccion, { color: tema.textoSecundario }]}>
          {es ? "RESULTADO" : "RESULT"}
        </Text>
        <Resultado
          etiqueta={es ? "Tipo" : "Type"}
          valor={
            creditoFinanciado
              ? es
                ? "Venta a crédito"
                : "Credit sale"
              : es
                ? "Venta de contado"
                : "Paid-in-full sale"
          }
          tema={tema}
        />
        <Resultado
          etiqueta={es ? "Inventario" : "Inventory"}
          valor={`−${unidades} ${es ? "unidades" : "units"}`}
          tema={tema}
        />
        {creditoFinanciado ? (
          <>
            <Resultado
              etiqueta={es ? "Anticipo" : "Deposit"}
              valor={
                control.anticipoNumero > 0
                  ? `${dinero.format(control.anticipoNumero)} · ${control.metodoAnticipo}`
                  : es
                    ? "Sin anticipo recibido"
                    : "No deposit received"
              }
              tema={tema}
            />
            <Resultado
              etiqueta={es ? "Saldo de la clienta" : "Customer balance"}
              valor={`+${dinero.format(control.financiado)}`}
              tema={tema}
              destacado
            />
            {control.financiado > 0 ? (
              <Text
                style={[
                  estilos.plan,
                  {
                    color: tema.textoSecundario,
                    backgroundColor: tema.primarioSuave,
                  },
                ]}
              >
                {dinero.format(parsearDineroCapturado(control.cuota) ?? 0)} ·{" "}
                {control.periodicidad} · {es ? "inicia" : "starts"}{" "}
                {control.primerVencimiento}
              </Text>
            ) : null}
          </>
        ) : (
          <>
            <Resultado
              etiqueta={es ? "Pago recibido" : "Payment received"}
              valor={`${dinero.format(control.total)} · ${control.metodoAnticipo}`}
              tema={tema}
              destacado
            />
            <Resultado
              etiqueta={es ? "Saldo de la clienta" : "Customer balance"}
              valor={es ? "Sin cambio" : "No change"}
              tema={tema}
            />
          </>
        )}
      </TarjetaMovil>

      <EstadoMovil
        tipo="informacion"
        texto={
          es
            ? "El teléfono proyecta saldo e inventario al instante. El servidor valida el movimiento al sincronizar."
            : "The phone projects balance and inventory immediately. The server validates it during sync."
        }
      />
      <View style={estilos.acciones}>
        <BotonMovil
          texto={es ? "Confirmar y guardar" : "Confirm and save"}
          icono="checkmark-circle"
          cargando={control.guardando}
          alPulsar={() => void control.confirmar()}
        />
        <BotonMovil
          texto={es ? "Editar forma de pago" : "Edit payment"}
          variante="texto"
          icono="arrow-back"
          deshabilitado={control.guardando}
          alPulsar={control.editar}
        />
      </View>
    </>
  );
}

function Resultado({
  etiqueta,
  valor,
  tema,
  destacado = false,
}: {
  etiqueta: string;
  valor: string;
  tema: ReturnType<typeof usarTema>;
  destacado?: boolean;
}) {
  return (
    <View style={estilos.resultadoFila}>
      <Text
        style={[estilos.resultadoEtiqueta, { color: tema.textoSecundario }]}
      >
        {etiqueta}
      </Text>
      <Text
        style={[
          estilos.resultadoValor,
          { color: destacado ? tema.primario : tema.texto },
        ]}
      >
        {valor}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: 20, lineHeight: 26, fontWeight: "900" },
  detalle: { fontSize: 13, lineHeight: 19, marginTop: 3 },
  resumen: { marginTop: 17 },
  consecuencias: { marginTop: 12, gap: 11 },
  seccion: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  fila: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 12,
  },
  producto: { flex: 1, fontSize: 13, lineHeight: 19 },
  importe: { fontSize: 13, lineHeight: 19, fontWeight: "700" },
  totalFila: {
    borderTopWidth: 1,
    marginTop: 15,
    paddingTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalEtiqueta: { fontWeight: "900", fontSize: 17 },
  total: { fontWeight: "900", fontSize: 20 },
  resultadoFila: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  resultadoEtiqueta: { flex: 1, fontSize: 13, lineHeight: 18 },
  resultadoValor: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
    textAlign: "right",
  },
  plan: {
    borderRadius: 10,
    padding: 11,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  acciones: { gap: 4, marginTop: 18 },
});
