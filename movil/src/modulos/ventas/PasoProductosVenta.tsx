import { StyleSheet, Text, View } from "react-native";

import { BotonMovil } from "../../componentes/ui";
import { type usarTema } from "../../tema";
import { dinero } from "../../utilidades/formato";
import type { ControlVenta } from "./usarVentaCampo";
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
      <View style={estilos.cabecera}>
        <Text style={[estilos.titulo, { color: tema.texto }]}>
          {es ? "Elige los productos" : "Choose products"}
        </Text>
        <Text style={[estilos.detalle, { color: tema.textoSecundario }]}>
          {es
            ? "Busca y ajusta cantidades. Sólo aparecen productos con existencia."
            : "Search and adjust quantities. Only in-stock products are shown."}
        </Text>
      </View>
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
      <BotonMovil
        texto={
          es
            ? `Continuar · ${dinero.format(control.total)}`
            : `Continue · ${dinero.format(control.total)}`
        }
        icono="arrow-forward"
        deshabilitado={!control.carrito.length}
        alPulsar={control.continuarPago}
        estilo={estilos.boton}
      />
    </>
  );
}

const estilos = StyleSheet.create({
  cabecera: { marginBottom: 15 },
  titulo: { fontSize: 20, lineHeight: 26, fontWeight: "900" },
  detalle: { fontSize: 13, lineHeight: 19, marginTop: 3 },
  boton: { marginTop: 18 },
});
