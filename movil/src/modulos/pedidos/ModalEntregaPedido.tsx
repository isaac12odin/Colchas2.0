import { StyleSheet, Text, View } from "react-native";

import {
  BotonMovil,
  EstadoMovil,
  HojaFormulario,
  TarjetaMovil,
} from "../../componentes/ui";
import { type usarTema } from "../../tema";
import { dinero } from "../../utilidades/formato";
import { parsearDineroCapturado } from "../../utilidades/dinero";
import { ConfiguracionVenta } from "../ventas/ConfiguracionVenta";
import { totalPedido } from "./dominioPedidos";
import type { ControlPedidos } from "./usarPedidosMoviles";

export function ModalEntregaPedido({
  control,
  es,
  tema,
}: {
  control: ControlPedidos;
  es: boolean;
  tema: ReturnType<typeof usarTema>;
}) {
  const total = control.entrega ? totalPedido(control.entrega) : 0;
  const financiado =
    control.tipo === "CREDITO"
      ? Math.max(0, total - (parsearDineroCapturado(control.anticipo) ?? 0))
      : 0;
  return (
    <HojaFormulario
      visible={Boolean(control.entrega)}
      bloqueada={control.guardando}
      alCerrar={control.cerrarEntrega}
      titulo={es ? "Entregar pedido" : "Deliver order"}
      subtitulo={`${control.entrega?.folio ?? ""} · ${control.entrega?.cliente?.nombreCompleto ?? ""}`}
      estiloContenido={estilos.contenido}
      pie={
        <BotonMovil
          texto={
            es
              ? `Confirmar entrega · ${dinero.format(total)}`
              : `Confirm delivery · ${dinero.format(total)}`
          }
          icono="checkmark-circle"
          cargando={control.guardando}
          alPulsar={() => void control.confirmarEntrega()}
        />
      }
    >
      <ConfiguracionVenta
        tipo={control.tipo}
        montoTotal={total}
        anticipo={control.anticipo}
        metodoAnticipo={control.metodoAnticipo}
        periodicidad={control.periodicidad}
        cuota={control.cuota}
        primerVencimiento={control.fechaPlan}
        numeroTarjeta={control.numeroTarjeta}
        es={es}
        alCambiarTipo={control.establecerTipo}
        alCambiarAnticipo={control.establecerAnticipo}
        alCambiarMetodoAnticipo={control.establecerMetodoAnticipo}
        alCambiarPeriodicidad={control.establecerPeriodicidad}
        alCambiarCuota={control.establecerCuota}
        alCambiarVencimiento={control.establecerFechaPlan}
        alCambiarNumeroTarjeta={control.establecerNumeroTarjeta}
      />

      <TarjetaMovil estilo={estilos.trazabilidad}>
        <Text style={[estilos.seccion, { color: tema.texto }]}>
          {es ? "Mercancía y proveedor" : "Merchandise and supplier"}
        </Text>
        {control.entrega?.items.map((item) => (
          <View
            key={item.id}
            style={[estilos.item, { borderColor: tema.borde }]}
          >
            <View style={estilos.expandir}>
              <Text style={[estilos.itemNombre, { color: tema.texto }]}>
                {item.cantidad} × {item.descripcion}
              </Text>
              <Text style={[estilos.proveedor, { color: tema.primario }]}>
                {item.proveedor?.nombre ??
                  (es ? "Sin proveedor" : "No supplier")}
              </Text>
            </View>
          </View>
        ))}
        <Text style={[estilos.nota, { color: tema.textoSecundario }]}>
          {es
            ? "El proveedor sólo lo asignan Administración, Contabilidad o Almacén."
            : "Only Administration, Accounting, or Warehouse can assign the supplier."}
        </Text>
      </TarjetaMovil>

      <TarjetaMovil estilo={estilos.resultado}>
        <Text style={[estilos.seccion, { color: tema.texto }]}>
          {es ? "Al confirmar" : "After confirmation"}
        </Text>
        <Fila
          etiqueta={es ? "Venta creada" : "Sale created"}
          valor={dinero.format(total)}
          tema={tema}
        />
        <Fila
          etiqueta={es ? "Saldo de la clienta" : "Customer balance"}
          valor={
            financiado
              ? `+${dinero.format(financiado)}`
              : es
                ? "Sin deuda"
                : "No debt"
          }
          tema={tema}
          destacado={financiado > 0}
        />
        <Fila
          etiqueta={es ? "Pedido" : "Order"}
          valor={es ? "Quedará entregado" : "Marked delivered"}
          tema={tema}
        />
      </TarjetaMovil>

      <EstadoMovil
        tipo="exito"
        texto={
          es
            ? "Se guarda primero en el equipo. Reintentar no duplica venta, saldo ni entrega."
            : "Saved on the device first. Retrying does not duplicate the sale, balance, or delivery."
        }
      />
    </HojaFormulario>
  );
}

function Fila({
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
    <View style={estilos.fila}>
      <Text style={[estilos.filaEtiqueta, { color: tema.textoSecundario }]}>
        {etiqueta}
      </Text>
      <Text
        style={[
          estilos.filaValor,
          { color: destacado ? tema.primario : tema.texto },
        ]}
      >
        {valor}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenido: { gap: 15 },
  trazabilidad: { gap: 9 },
  resultado: { gap: 10 },
  seccion: { fontSize: 15, lineHeight: 20, fontWeight: "900" },
  item: { borderTopWidth: 1, paddingTop: 9, flexDirection: "row" },
  itemNombre: { fontSize: 13, lineHeight: 18, fontWeight: "800" },
  proveedor: { fontSize: 12, lineHeight: 17, fontWeight: "800", marginTop: 3 },
  nota: { fontSize: 12, lineHeight: 18 },
  fila: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  filaEtiqueta: { flex: 1, fontSize: 13, lineHeight: 18 },
  filaValor: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
    textAlign: "right",
  },
  expandir: { flex: 1 },
});
