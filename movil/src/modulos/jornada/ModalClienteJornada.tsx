import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colores, type usarTema } from "../../tema";
import { dinero } from "../../utilidades/formato";
import type { ControlJornada } from "./usarJornadaRuta";
import { AccionesCliente } from "./AccionesCliente";
import { FormularioAbono } from "./FormularioAbono";

interface Propiedades {
  control: ControlJornada;
  es: boolean;
  tema: ReturnType<typeof usarTema>;
  alVender: () => void;
  alEntregar: () => void;
}

export function ModalClienteJornada({
  control,
  es,
  tema,
  alVender,
  alEntregar,
}: Propiedades) {
  const cliente = control.cliente;
  return (
    <Modal
      visible={Boolean(cliente)}
      animationType="slide"
      transparent
      onRequestClose={control.cerrarCliente}
    >
      <View style={estilos.fondo}>
        <View style={[estilos.modal, { backgroundColor: tema.panel }]}>
          <View style={estilos.encabezado}>
            <View style={estilos.expandir}>
              <Text style={[estilos.titulo, { color: tema.texto }]}>
                {cliente?.nombreCompleto}
              </Text>
              <Text style={estilos.saldo}>
                {es ? "Saldo" : "Balance"}{" "}
                {dinero.format(Number(cliente?.saldo?.saldoActual ?? 0))}
              </Text>
              {cliente?.fueraDeRuta && (
                <Text style={estilos.extraordinaria}>
                  {es
                    ? "Cobranza fuera de ruta · quedará auditada"
                    : "Outside-route collection · audited"}
                </Text>
              )}
            </View>
            <Pressable
              accessibilityLabel={es ? "Cerrar" : "Close"}
              onPress={control.cerrarCliente}
              style={estilos.cerrar}
            >
              <Ionicons name="close" size={22} color={tema.texto} />
            </Pressable>
          </View>

          {cliente && control.modo === "ACCIONES" && (
            <AccionesCliente
              cliente={cliente}
              es={es}
              tema={tema}
              guardando={control.guardando}
              alCobrar={control.mostrarCobro}
              alVender={alVender}
              alEntregar={alEntregar}
              alNoPagar={() => control.confirmarResultado("NO_PAGO")}
              alAusente={() => control.confirmarResultado("AUSENTE")}
            />
          )}
          {cliente && control.modo === "COBRO" && (
            <FormularioAbono
              cliente={cliente}
              es={es}
              tema={tema}
              monto={control.monto}
              metodo={control.metodo}
              referencia={control.referencia}
              notas={control.notas}
              guardando={control.guardando}
              alCambiarMonto={control.establecerMonto}
              alCambiarMetodo={control.establecerMetodo}
              alCambiarReferencia={control.establecerReferencia}
              alCambiarNotas={control.establecerNotas}
              alVolver={control.mostrarAcciones}
              alGuardar={(monto) => void control.guardarVisita("PAGO", monto)}
            />
          )}
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
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    paddingBottom: 34,
    maxHeight: "93%",
  },
  encabezado: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  expandir: { flex: 1 },
  titulo: { fontWeight: "900", fontSize: 20 },
  saldo: { color: colores.gris, fontSize: 12, marginTop: 4 },
  extraordinaria: {
    color: "#0043ce",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 5,
  },
  cerrar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(100,116,139,.1)",
  },
});
