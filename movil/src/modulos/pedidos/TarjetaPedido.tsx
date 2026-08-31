import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colores, type usarTema } from "../../tema";
import type { PedidoMovil } from "../../tipos";
import { dinero } from "../../utilidades/formato";
import { siguienteEstado, totalPedido } from "./dominioPedidos";

const estadosEs: Record<string, string> = {
  PENDIENTE_PEDIR: "Pendiente de proveedor",
  PEDIDO_PROVEEDOR: "Pedido al proveedor",
  RECIBIDO_ALMACEN: "Recibido en almacén",
  LISTO_ENTREGA: "Listo para entrega",
};
const estadosEn: Record<string, string> = {
  PENDIENTE_PEDIR: "Pending supplier",
  PEDIDO_PROVEEDOR: "Supplier ordered",
  RECIBIDO_ALMACEN: "Received in warehouse",
  LISTO_ENTREGA: "Ready to deliver",
};
const accionesEs: Record<string, string> = {
  RECIBIDO_ALMACEN: "Confirmar recepción",
  LISTO_ENTREGA: "Marcar listo para entrega",
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
  return (
    <View
      style={[
        estilos.tarjeta,
        { backgroundColor: tema.panel, borderColor: tema.borde },
      ]}
    >
      <View style={estilos.fila}>
        <View style={estilos.expandir}>
          <Text style={estilos.folio}>{pedido.folio}</Text>
          <Text style={[estilos.nombre, { color: tema.texto }]}>
            {pedido.cliente?.nombreCompleto ??
              (es ? "Cliente de la ruta" : "Route customer")}
          </Text>
          {pedido.fechaCompromiso && (
            <Text style={estilos.compromiso}>
              {es ? "Compromiso" : "Promise"}:{" "}
              {pedido.fechaCompromiso.slice(0, 10)}
            </Text>
          )}
        </View>
        <Text style={estilos.estado}>
          {(es ? estadosEs : estadosEn)[pedido.estado] ?? pedido.estado}
        </Text>
      </View>
      <View style={[estilos.items, { borderColor: tema.borde }]}>
        {pedido.items.map((item, indice) => (
          <View key={`${item.descripcion}-${indice}`} style={estilos.fila}>
            <Text style={[estilos.item, { color: tema.texto }]}>
              {item.cantidad} × {item.descripcion}
              {item.proveedor?.nombre ? ` · ${item.proveedor.nombre}` : ""}
            </Text>
            <Text style={[estilos.item, { color: tema.texto }]}>
              {dinero.format(Number(item.precioEstimado) * item.cantidad)}
            </Text>
          </View>
        ))}
        <View style={estilos.fila}>
          <Text style={[estilos.totalEtiqueta, { color: tema.texto }]}>
            Total
          </Text>
          <Text style={estilos.total}>
            {dinero.format(totalPedido(pedido))}
          </Text>
        </View>
      </View>
      {permisos.puedeAsignarProveedor &&
        pedido.estado === "PENDIENTE_PEDIR" && (
          <Pressable
            style={estilos.boton}
            onPress={permisos.alAsignarProveedor}
          >
            <Ionicons name="business-outline" color="white" size={18} />
            <Text style={estilos.botonTexto}>
              {es ? "Asignar proveedor" : "Assign supplier"}
            </Text>
          </Pressable>
        )}
      {permisos.puedeAlmacen &&
        pedido.estado !== "PENDIENTE_PEDIR" &&
        siguienteEstado[pedido.estado] && (
          <Pressable style={estilos.secundario} onPress={permisos.alAvanzar}>
            <Ionicons name="cube-outline" color={colores.azul} size={18} />
            <Text style={estilos.secundarioTexto}>
              {es
                ? (accionesEs[siguienteEstado[pedido.estado]] ?? "Avanzar")
                : siguienteEstado[pedido.estado] === "RECIBIDO_ALMACEN"
                  ? "Confirm receipt"
                  : "Mark ready to deliver"}
            </Text>
          </Pressable>
        )}
      {!permisos.puedeAsignarProveedor &&
        pedido.estado === "PENDIENTE_PEDIR" && (
          <Text style={estilos.espera}>
            {es
              ? "Espera: Administración, Contabilidad o Almacén asignarán al proveedor."
              : "Waiting: Administration, Accounting, or Warehouse will assign the supplier."}
          </Text>
        )}
      {permisos.puedeEntregar &&
        ["RECIBIDO_ALMACEN", "LISTO_ENTREGA"].includes(pedido.estado) && (
          <Pressable style={estilos.boton} onPress={permisos.alEntregar}>
            <Ionicons name="shield-checkmark" color="white" size={18} />
            <Text style={estilos.botonTexto}>
              {es ? "Confirmar entrega" : "Confirm delivery"}
            </Text>
          </Pressable>
        )}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 15, padding: 15 },
  fila: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  expandir: { flex: 1 },
  folio: { color: colores.gris, fontSize: 11, fontWeight: "700" },
  nombre: { fontSize: 16, fontWeight: "800", marginTop: 4 },
  compromiso: { color: colores.gris, fontSize: 10, marginTop: 4 },
  estado: {
    color: colores.azul,
    backgroundColor: colores.azulClaro,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 5,
    fontSize: 8,
    fontWeight: "800",
    maxWidth: 110,
  },
  items: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 10,
    marginVertical: 13,
    gap: 8,
  },
  item: { fontSize: 12, flexShrink: 1 },
  totalEtiqueta: { fontWeight: "800", fontSize: 13 },
  total: { color: colores.azul, fontWeight: "900" },
  boton: {
    backgroundColor: colores.azul,
    minHeight: 46,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 8,
  },
  botonTexto: { color: "white", fontWeight: "800" },
  secundario: {
    borderWidth: 1,
    borderColor: colores.azul,
    minHeight: 46,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  secundarioTexto: { color: colores.azul, fontWeight: "800" },
  espera: {
    color: "#8a3b12",
    backgroundColor: "#fff2e8",
    borderRadius: 10,
    padding: 10,
    fontSize: 11,
    lineHeight: 16,
  },
});
