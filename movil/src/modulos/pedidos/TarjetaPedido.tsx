import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colores, type usarTema } from "../../tema";
import type { PedidoMovil } from "../../tipos";
import { dinero } from "../../utilidades/formato";
import { siguienteEstado, totalPedido } from "./dominioPedidos";

interface Propiedades {
  pedido: PedidoMovil;
  es: boolean;
  tema: ReturnType<typeof usarTema>;
  puedeAlmacen: boolean;
  puedeEntregar: boolean;
  alAvanzar: () => void;
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
        </View>
        <Text style={estilos.estado}>{pedido.estado.replaceAll("_", " ")}</Text>
      </View>
      <View style={[estilos.items, { borderColor: tema.borde }]}>
        {pedido.items.map((item, indice) => (
          <View key={`${item.descripcion}-${indice}`} style={estilos.fila}>
            <Text style={[estilos.item, { color: tema.texto }]}>
              {item.cantidad} × {item.descripcion}
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
      {permisos.puedeAlmacen && siguienteEstado[pedido.estado] && (
        <Pressable style={estilos.secundario} onPress={permisos.alAvanzar}>
          <Ionicons name="cube-outline" color={colores.azul} size={18} />
          <Text style={estilos.secundarioTexto}>
            {es ? "Avanzar estado" : "Advance status"}
          </Text>
        </Pressable>
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
});
