import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  BotonMovil,
  TarjetaMovil,
  usarDisenoResponsivo,
} from "../../componentes/ui";
import { radios, type usarTema } from "../../tema";
import type { PedidoMovil } from "../../tipos";
import { dinero } from "../../utilidades/formato";
import { siguienteEstado, totalPedido } from "./dominioPedidos";

const estadosEs: Record<string, string> = {
  PENDIENTE_PEDIR: "Falta proveedor",
  PEDIDO_PROVEEDOR: "Pedido al proveedor",
  RECIBIDO_ALMACEN: "En almacén",
  LISTO_ENTREGA: "Listo para entregar",
};
const estadosEn: Record<string, string> = {
  PENDIENTE_PEDIR: "Supplier needed",
  PEDIDO_PROVEEDOR: "Ordered from supplier",
  RECIBIDO_ALMACEN: "In warehouse",
  LISTO_ENTREGA: "Ready to deliver",
};
const accionesEs: Record<string, string> = {
  RECIBIDO_ALMACEN: "Confirmar que llegó",
  LISTO_ENTREGA: "Marcar listo para entregar",
};

interface Propiedades {
  pedido: PedidoMovil;
  es: boolean;
  tema: ReturnType<typeof usarTema>;
  puedeAlmacen: boolean;
  puedeAsignarProveedor: boolean;
  puedeEntregar: boolean;
  alAvanzar: () => void;
  alAsignarProveedor: () => void;
  alEntregar: () => void;
}

export function TarjetaPedido({ pedido, es, tema, ...permisos }: Propiedades) {
  const diseno = usarDisenoResponsivo();
  const apilar = diseno.compacto || diseno.fontScale > 1.2;
  const pendienteProveedor = pedido.estado === "PENDIENTE_PEDIR";
  const listoParaOperacion = ["RECIBIDO_ALMACEN", "LISTO_ENTREGA"].includes(
    pedido.estado,
  );

  return (
    <TarjetaMovil estilo={estilos.tarjeta} elevada>
      <View style={[estilos.encabezado, apilar && estilos.encabezadoApilado]}>
        <View style={estilos.expandir}>
          <Text style={[estilos.folio, { color: tema.textoSecundario }]}>
            {pedido.folio}
          </Text>
          <Text style={[estilos.nombre, { color: tema.texto }]}>
            {pedido.cliente?.nombreCompleto ??
              (es ? "Cliente de la ruta" : "Route customer")}
          </Text>
          {pedido.fechaCompromiso ? (
            <View style={estilos.compromisoFila}>
              <Ionicons
                name="calendar-outline"
                size={15}
                color={tema.textoTenue}
              />
              <Text
                style={[estilos.compromiso, { color: tema.textoSecundario }]}
              >
                {es ? "Compromiso" : "Due"}:{" "}
                {pedido.fechaCompromiso.slice(0, 10)}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={[estilos.estado, { backgroundColor: tema.primarioSuave }]}>
          <Text style={[estilos.estadoTexto, { color: tema.primario }]}>
            {(es ? estadosEs : estadosEn)[pedido.estado] ?? pedido.estado}
          </Text>
        </View>
      </View>

      <View style={[estilos.items, { borderColor: tema.borde }]}>
        {pedido.items.map((item, indice) => (
          <View
            key={`${item.id ?? item.descripcion}-${indice}`}
            style={[estilos.itemFila, apilar && estilos.itemFilaApilada]}
          >
            <View style={estilos.expandir}>
              <Text style={[estilos.itemNombre, { color: tema.texto }]}>
                {item.cantidad} × {item.descripcion}
              </Text>
              <Text
                style={[
                  estilos.proveedor,
                  {
                    color: item.proveedor?.nombre
                      ? tema.textoSecundario
                      : tema.advertencia,
                  },
                ]}
              >
                {item.proveedor?.nombre ??
                  (es ? "Proveedor sin asignar" : "Supplier not assigned")}
              </Text>
            </View>
            <Text style={[estilos.itemImporte, { color: tema.texto }]}>
              {dinero.format(Number(item.precioEstimado) * item.cantidad)}
            </Text>
          </View>
        ))}
        <View style={[estilos.totalFila, { borderColor: tema.borde }]}>
          <Text
            style={[estilos.totalEtiqueta, { color: tema.textoSecundario }]}
          >
            {es ? "Total estimado" : "Estimated total"}
          </Text>
          <Text style={[estilos.total, { color: tema.primario }]}>
            {dinero.format(totalPedido(pedido))}
          </Text>
        </View>
      </View>

      <View style={estilos.acciones}>
        {permisos.puedeAsignarProveedor && pendienteProveedor ? (
          <BotonMovil
            texto={es ? "Asignar proveedor" : "Assign supplier"}
            icono="business-outline"
            alPulsar={permisos.alAsignarProveedor}
          />
        ) : null}

        {permisos.puedeAlmacen &&
        !pendienteProveedor &&
        siguienteEstado[pedido.estado] ? (
          <BotonMovil
            texto={
              es
                ? (accionesEs[siguienteEstado[pedido.estado]] ??
                  "Avanzar pedido")
                : siguienteEstado[pedido.estado] === "RECIBIDO_ALMACEN"
                  ? "Confirm arrival"
                  : "Mark ready to deliver"
            }
            icono="cube-outline"
            variante="secundario"
            alPulsar={permisos.alAvanzar}
          />
        ) : null}

        {!permisos.puedeAsignarProveedor && pendienteProveedor ? (
          <View
            style={[estilos.espera, { backgroundColor: tema.advertenciaSuave }]}
          >
            <Ionicons name="time-outline" color={tema.advertencia} size={20} />
            <Text style={[estilos.esperaTexto, { color: tema.advertencia }]}>
              {es
                ? "Esperando a que Administración, Contabilidad o Almacén asignen proveedor."
                : "Waiting for Administration, Accounting, or Warehouse to assign a supplier."}
            </Text>
          </View>
        ) : null}

        {permisos.puedeEntregar && listoParaOperacion ? (
          <BotonMovil
            texto={es ? "Entregar y crear venta" : "Deliver and create sale"}
            icono="shield-checkmark"
            alPulsar={permisos.alEntregar}
          />
        ) : null}
      </View>
    </TarjetaMovil>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { gap: 14 },
  encabezado: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  encabezadoApilado: { flexDirection: "column" },
  expandir: { flex: 1, minWidth: 0 },
  folio: { fontSize: 12, lineHeight: 17, fontWeight: "800" },
  nombre: { fontSize: 17, lineHeight: 23, fontWeight: "900", marginTop: 2 },
  compromisoFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
  },
  compromiso: { fontSize: 12, lineHeight: 17 },
  estado: {
    alignSelf: "flex-start",
    borderRadius: radios.pastilla,
    paddingHorizontal: 10,
    paddingVertical: 7,
    maxWidth: 180,
  },
  estadoTexto: { fontSize: 12, lineHeight: 16, fontWeight: "900" },
  items: { borderTopWidth: 1, gap: 11, paddingTop: 13 },
  itemFila: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  itemFilaApilada: { flexDirection: "column", gap: 4 },
  itemNombre: { fontSize: 14, lineHeight: 20, fontWeight: "800" },
  proveedor: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  itemImporte: { fontSize: 14, lineHeight: 20, fontWeight: "800" },
  totalFila: {
    borderTopWidth: 1,
    paddingTop: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  totalEtiqueta: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: "700" },
  total: { fontSize: 18, lineHeight: 24, fontWeight: "900" },
  acciones: { gap: 9 },
  espera: {
    borderRadius: radios.campo,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  esperaTexto: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "700" },
});
