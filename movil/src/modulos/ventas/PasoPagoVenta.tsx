import { StyleSheet, View } from "react-native";

import { BotonMovil } from "../../componentes/ui";
import type { usarTema } from "../../tema";
import { ConfiguracionVenta } from "./ConfiguracionVenta";
import type { ControlVenta } from "./usarVentaCampo";

export function PasoPagoVenta({
  control,
  es,
  tema: _tema,
}: {
  control: ControlVenta;
  es: boolean;
  tema: ReturnType<typeof usarTema>;
}) {
  return (
    <>
      <ConfiguracionVenta
        tipo={control.tipo}
        montoTotal={control.total}
        anticipo={control.anticipo}
        metodoAnticipo={control.metodoAnticipo}
        periodicidad={control.periodicidad}
        cuota={control.cuota}
        primerVencimiento={control.primerVencimiento}
        numeroTarjeta={control.numeroTarjeta}
        es={es}
        permiteCredito={control.permiteCredito}
        alCambiarTipo={control.establecerTipo}
        alCambiarAnticipo={control.establecerAnticipo}
        alCambiarMetodoAnticipo={control.establecerMetodoAnticipo}
        alCambiarPeriodicidad={control.establecerPeriodicidad}
        alCambiarCuota={control.establecerCuota}
        alCambiarVencimiento={control.establecerPrimerVencimiento}
        alCambiarNumeroTarjeta={control.establecerNumeroTarjeta}
      />
      <View style={estilos.acciones}>
        <BotonMovil
          texto={es ? "Revisar venta" : "Review sale"}
          icono="arrow-forward"
          alPulsar={control.revisar}
        />
        <BotonMovil
          texto={es ? "Volver a productos" : "Back to products"}
          variante="texto"
          icono="arrow-back"
          alPulsar={control.volverProductos}
        />
      </View>
    </>
  );
}

const estilos = StyleSheet.create({
  acciones: { gap: 4, marginTop: 20 },
});
