import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colores, type usarTema } from "../../tema";
import type { ControlPedidos } from "./usarPedidosMoviles";

/**
 * Etapa independiente de la entrega: aquí Administración, Contabilidad o
 * Almacén dejan documentado quién surtirá cada artículo.
 */
export function ModalAsignarProveedor({
  control,
  es,
  tema,
}: {
  control: ControlPedidos;
  es: boolean;
  tema: ReturnType<typeof usarTema>;
}) {
  const completo = Boolean(
    control.gestion?.items.every((item) => control.proveedoresPorItem[item.id]),
  );
  return (
    <Modal
      visible={Boolean(control.gestion)}
      transparent
      animationType="slide"
      onRequestClose={control.cerrarGestion}
    >
      <View style={estilos.fondo}>
        <View style={[estilos.modal, { backgroundColor: tema.panel }]}>
          <View style={estilos.encabezado}>
            <View style={{ flex: 1 }}>
              <Text style={[estilos.titulo, { color: tema.texto }]}>
                {es ? "Asignar proveedor" : "Assign supplier"}
              </Text>
              <Text style={estilos.ayuda}>
                {es
                  ? "Paso 1 de 3 · define quién surtirá; no es una entrega."
                  : "Step 1 of 3 · choose who will supply; this is not a delivery."}
              </Text>
            </View>
            <Pressable onPress={control.cerrarGestion} style={estilos.cerrar}>
              <Ionicons name="close" size={24} color={tema.texto} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={estilos.items}>
            {control.gestion?.items.map((item) => (
              <View
                key={item.id}
                style={[estilos.item, { borderColor: tema.borde }]}
              >
                <Text style={[estilos.itemNombre, { color: tema.texto }]}>
                  {item.cantidad} × {item.descripcion}
                </Text>
                <View style={estilos.opciones}>
                  {control.proveedores.map((proveedor) => {
                    const activo =
                      control.proveedoresPorItem[item.id] === proveedor.id;
                    return (
                      <Pressable
                        key={proveedor.id}
                        onPress={() =>
                          control.establecerProveedor(item.id, proveedor.id)
                        }
                        style={[
                          estilos.opcion,
                          { borderColor: activo ? colores.azul : tema.borde },
                          activo && estilos.opcionActiva,
                        ]}
                      >
                        <Ionicons
                          name={activo ? "checkmark-circle" : "ellipse-outline"}
                          size={17}
                          color={activo ? colores.azul : colores.gris}
                        />
                        <Text
                          style={{
                            color: activo ? colores.azul : tema.texto,
                            fontWeight: "700",
                            flexShrink: 1,
                          }}
                        >
                          {proveedor.nombre}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
          <Pressable
            disabled={!completo || control.guardando}
            style={[
              estilos.boton,
              (!completo || control.guardando) && estilos.deshabilitado,
            ]}
            onPress={() => void control.confirmarProveedor()}
          >
            {control.guardando ? (
              <ActivityIndicator color="white" />
            ) : (
              <Ionicons name="send" color="white" size={18} />
            )}
            <Text style={estilos.botonTexto}>
              {es ? "Confirmar pedido al proveedor" : "Confirm supplier order"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.48)",
    justifyContent: "flex-end",
  },
  modal: {
    maxHeight: "86%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 36,
  },
  encabezado: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  titulo: { fontSize: 20, fontWeight: "900" },
  ayuda: { color: colores.gris, fontSize: 12, lineHeight: 18, marginTop: 4 },
  cerrar: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  items: { gap: 12, paddingVertical: 18 },
  item: { borderWidth: 1, borderRadius: 14, padding: 14 },
  itemNombre: { fontSize: 14, fontWeight: "800", marginBottom: 10 },
  opciones: { gap: 8 },
  opcion: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  opcionActiva: { backgroundColor: "#edf5ff" },
  boton: {
    minHeight: 52,
    borderRadius: 11,
    backgroundColor: colores.azul,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  botonTexto: { color: "white", fontWeight: "800" },
  deshabilitado: { opacity: 0.45 },
});
