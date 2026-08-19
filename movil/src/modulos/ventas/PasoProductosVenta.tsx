import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text } from "react-native";

import { colores, type usarTema } from "../../tema";
import { dinero } from "../../utilidades/formato";
import type { ControlVenta } from "./usarVentaCampo";
import { ConfiguracionVenta } from "./ConfiguracionVenta";
import { ListaProductosVenta } from "./ListaProductosVenta";

export function PasoProductosVenta({
  control,
  es,
  tema,
}: {
  control: ControlVenta;
  es: boolean;
  tema: ReturnType<typeof usarTema>;
}) {
  return (
    <>
      <ListaProductosVenta
        catalogoVacio={!control.catalogo.length}
        productos={control.visibles}
        carrito={control.carrito}
        busqueda={control.busqueda}
        es={es}
        tema={tema}
        alBuscar={control.establecerBusqueda}
        alCambiarCantidad={control.cambiarCantidad}
      />
      <ConfiguracionVenta
        tipo={control.tipo}
        montoTotal={control.total}
        anticipo={control.anticipo}
        periodicidad={control.periodicidad}
        cuota={control.cuota}
        primerVencimiento={control.primerVencimiento}
        numeroTarjeta={control.numeroTarjeta}
        es={es}
        tema={tema}
        alCambiarTipo={control.establecerTipo}
        alCambiarAnticipo={control.establecerAnticipo}
        alCambiarPeriodicidad={control.establecerPeriodicidad}
        alCambiarCuota={control.establecerCuota}
        alCambiarVencimiento={control.establecerPrimerVencimiento}
        alCambiarNumeroTarjeta={control.establecerNumeroTarjeta}
      />
      <Pressable
        disabled={!control.carrito.length}
        onPress={control.revisar}
        style={[
          estilos.boton,
          !control.carrito.length && estilos.deshabilitado,
        ]}
      >
        <Text style={estilos.texto}>
          {es
            ? `Revisar venta · ${dinero.format(control.total)}`
            : `Review sale · ${dinero.format(control.total)}`}
        </Text>
        <Ionicons name="arrow-forward" color="white" size={18} />
      </Pressable>
    </>
  );
}

const estilos = StyleSheet.create({
  boton: {
    backgroundColor: colores.azul,
    minHeight: 53,
    borderRadius: 12,
    marginTop: 18,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  texto: { color: "white", fontWeight: "800", fontSize: 15 },
  deshabilitado: { opacity: 0.42 },
});
