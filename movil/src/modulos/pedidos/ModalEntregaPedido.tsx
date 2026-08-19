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
import { ConfiguracionVenta } from "../ventas/ConfiguracionVenta";
import type { ControlPedidos } from "./usarPedidosMoviles";
import { totalPedido } from "./dominioPedidos";

export function ModalEntregaPedido({
  control,
  es,
  tema,
}: {
  control: ControlPedidos;
  es: boolean;
  tema: ReturnType<typeof usarTema>;
}) {
  return (
    <Modal
      visible={Boolean(control.entrega)}
      transparent
      animationType="slide"
      onRequestClose={control.cerrarEntrega}
    >
      <View style={estilos.fondo}>
        <View style={[estilos.modal, { backgroundColor: tema.panel }]}> 
          <View style={estilos.encabezado}>
            <View>
              <Text style={[estilos.titulo, { color: tema.texto }]}>
                {es ? "Entregar pedido" : "Deliver order"}
              </Text>
              <Text style={estilos.folio}>{control.entrega?.folio}</Text>
            </View>
            <Pressable
              accessibilityLabel={es ? "Cerrar" : "Close"}
              onPress={control.cerrarEntrega}
              style={estilos.cerrar}
            >
              <Ionicons name="close" size={24} color={tema.texto} />
            </Pressable>
          </View>
          <ScrollView style={estilos.desplazable} keyboardShouldPersistTaps="handled">
          <ConfiguracionVenta
            tipo={control.tipo}
            montoTotal={control.entrega ? totalPedido(control.entrega) : 0}
            anticipo={control.anticipo}
            periodicidad={control.periodicidad}
            cuota={control.cuota}
            primerVencimiento={control.fechaPlan}
            numeroTarjeta={control.numeroTarjeta}
            es={es}
            tema={tema}
            alCambiarTipo={control.establecerTipo}
            alCambiarAnticipo={control.establecerAnticipo}
            alCambiarPeriodicidad={control.establecerPeriodicidad}
            alCambiarCuota={control.establecerCuota}
            alCambiarVencimiento={control.establecerFechaPlan}
            alCambiarNumeroTarjeta={control.establecerNumeroTarjeta}
          />
          <View style={[estilos.proveedores, { borderColor: tema.borde }]}> 
            <Text style={[estilos.proveedoresTitulo, { color: tema.texto }]}> 
              {es ? "Proveedor que surtió" : "Supplying vendor"}
            </Text>
            {control.entrega?.items.map((item) => (
              <View key={item.id} style={estilos.itemProveedor}>
                <Text style={[estilos.itemNombre, { color: tema.texto }]}>
                  {item.descripcion}
                </Text>
                <View style={estilos.opcionesProveedor}>
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
                          estilos.proveedor,
                          { borderColor: activo ? colores.azul : tema.borde },
                          activo && estilos.proveedorActivo,
                        ]}
                      >
                        <Text
                          style={{
                            color: activo ? colores.azul : tema.texto,
                            fontWeight: "700",
                            fontSize: 12,
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
          </View>
          <View style={estilos.integridad}>
            <Ionicons name="shield-checkmark" color={colores.verde} size={17} />
            <Text style={estilos.integridadTexto}>
              {es
                ? "Se guarda primero en el equipo. Reintentar no duplicará la entrega."
                : "Saved on the device first. Retrying will not duplicate the delivery."}
            </Text>
          </View>
          </ScrollView>
          <Pressable
            disabled={control.guardando}
            style={[estilos.boton, control.guardando && estilos.deshabilitado]}
            onPress={() => void control.confirmarEntrega()}
          >
            {control.guardando ? (
              <ActivityIndicator color="white" />
            ) : (
              <Ionicons name="checkmark" color="white" size={18} />
            )}
            <Text style={estilos.botonTexto}>
              {control.guardando
                ? es
                  ? "Protegiendo…"
                  : "Securing…"
                : es
                  ? "Guardar entrega"
                  : "Save delivery"}
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 36,
  },
  desplazable: { maxHeight: 590 },
  proveedores: { marginTop: 16, borderWidth: 1, borderRadius: 12, padding: 12 },
  proveedoresTitulo: { fontSize: 14, fontWeight: "800", marginBottom: 8 },
  itemProveedor: { marginTop: 8 },
  itemNombre: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
  opcionesProveedor: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  proveedor: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  proveedorActivo: { backgroundColor: "#edf5ff" },
  encabezado: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  titulo: { fontSize: 19, fontWeight: "900" },
  folio: { color: colores.gris, fontSize: 11, marginTop: 2 },
  cerrar: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  integridad: {
    flexDirection: "row",
    gap: 7,
    backgroundColor: "#defbe6",
    borderRadius: 10,
    padding: 10,
    marginTop: 16,
  },
  integridadTexto: { color: "#0e6027", flex: 1, fontSize: 10, lineHeight: 15 },
  boton: {
    backgroundColor: colores.azul,
    minHeight: 50,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 17,
  },
  botonTexto: { color: "white", fontWeight: "800" },
  deshabilitado: { opacity: 0.45 },
});
