import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import {
  EstadoMovil,
  PantallaMovil,
  ProgresoPasos,
} from "@/src/componentes/ui";
import { PasoPagoVenta } from "@/src/modulos/ventas/PasoPagoVenta";
import { PasoProductosVenta } from "@/src/modulos/ventas/PasoProductosVenta";
import { ResumenVenta } from "@/src/modulos/ventas/ResumenVenta";
import { usarVentaCampo } from "@/src/modulos/ventas/usarVentaCampo";
import { usarSesion } from "@/src/sesion";
import { usarTema } from "@/src/tema";

export default function VentaCampo() {
  const parametros = useLocalSearchParams<{
    clienteId?: string;
    cliente?: string;
    numeroTarjeta?: string;
    rutaId?: string;
    fecha?: string;
  }>();
  const tema = usarTema();
  const { idioma } = usarSesion();
  const es = idioma === "es";
  const control = usarVentaCampo(parametros, es);
  const numeroPaso =
    control.paso === "PRODUCTOS" ? 1 : control.paso === "PAGO" ? 2 : 3;

  return (
    <PantallaMovil conTeclado estiloContenido={estilos.contenido}>
      <ProgresoPasos
        actual={numeroPaso}
        pasos={
          es
            ? ["Productos", "Pago", "Confirmar"]
            : ["Products", "Payment", "Confirm"]
        }
      />
      <View style={estilos.identidad}>
        <Text style={[estilos.cliente, { color: tema.texto }]}>
          {parametros.cliente ?? (es ? "Venta al público" : "Public sale")}
        </Text>
        <Text style={[estilos.contexto, { color: tema.textoSecundario }]}>
          {parametros.clienteId
            ? es
              ? "La deuda se aplicará a esta clienta sólo si eliges crédito."
              : "Debt is applied to this customer only when credit is selected."
            : es
              ? "Una venta al público debe quedar pagada de contado."
              : "A public sale must be paid in full."}
        </Text>
      </View>
      <EstadoMovil
        tipo="exito"
        texto={
          es
            ? "Se guarda cifrada sin conexión y se envía una sola vez."
            : "It is encrypted offline and sent exactly once."
        }
      />

      <View style={estilos.paso}>
        {control.paso === "PRODUCTOS" ? (
          <PasoProductosVenta control={control} es={es} tema={tema} />
        ) : control.paso === "PAGO" ? (
          <PasoPagoVenta control={control} es={es} tema={tema} />
        ) : (
          <ResumenVenta control={control} es={es} tema={tema} />
        )}
      </View>
    </PantallaMovil>
  );
}

const estilos = StyleSheet.create({
  contenido: { paddingTop: 12 },
  identidad: { marginTop: 17 },
  cliente: { fontSize: 23, lineHeight: 29, fontWeight: "900" },
  contexto: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  paso: { marginTop: 21 },
});
