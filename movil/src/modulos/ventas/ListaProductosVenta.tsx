import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colores, type usarTema } from "../../tema";
import type { ProductoMovil } from "../../tipos";
import { dinero } from "../../utilidades/formato";
import type { LineaCarrito } from "./dominioVenta";

interface Propiedades {
  catalogoVacio: boolean;
  productos: ProductoMovil[];
  carrito: LineaCarrito[];
  busqueda: string;
  es: boolean;
  tema: ReturnType<typeof usarTema>;
  alBuscar: (valor: string) => void;
  alCambiarCantidad: (producto: ProductoMovil, cambio: number) => void;
}

export function ListaProductosVenta({
  catalogoVacio,
  productos,
  carrito,
  busqueda,
  es,
  tema,
  alBuscar,
  alCambiarCantidad,
}: Propiedades) {
  return (
    <>
      <TextInput
        value={busqueda}
        onChangeText={alBuscar}
        placeholder={
          es
            ? "Buscar producto, SKU o código…"
            : "Search product, SKU, or code…"
        }
        placeholderTextColor={colores.gris}
        style={[
          estilos.buscar,
          {
            backgroundColor: tema.panel,
            borderColor: tema.borde,
            color: tema.texto,
          },
        ]}
      />
      {catalogoVacio && (
        <View style={estilos.alerta}>
          <Text style={estilos.alertaTexto}>
            {es
              ? "Descarga una ruta con internet antes de vender sin conexión."
              : "Download a route online before selling offline."}
          </Text>
        </View>
      )}
      <View style={estilos.productos}>
        {productos.map((producto) => (
          <Producto
            key={producto.id}
            producto={producto}
            cantidad={
              carrito.find((linea) => linea.id === producto.id)?.cantidad ?? 0
            }
            es={es}
            tema={tema}
            alCambiar={(cambio) => alCambiarCantidad(producto, cambio)}
          />
        ))}
      </View>
    </>
  );
}

function Producto({
  producto,
  cantidad,
  es,
  tema,
  alCambiar,
}: {
  producto: ProductoMovil;
  cantidad: number;
  es: boolean;
  tema: ReturnType<typeof usarTema>;
  alCambiar: (cambio: number) => void;
}) {
  return (
    <View
      style={[
        estilos.producto,
        { backgroundColor: tema.panel, borderColor: tema.borde },
      ]}
    >
      <View style={estilos.expandir}>
        <Text style={[estilos.nombre, { color: tema.texto }]}>
          {producto.nombre}
        </Text>
        <Text style={estilos.detalle}>
          {producto.marca} · {producto.existencia} {es ? "disp." : "available"}
        </Text>
        <Text style={estilos.precio}>
          {dinero.format(Number(producto.precioVenta))}
        </Text>
      </View>
      <View style={estilos.cantidad}>
        <BotonCantidad
          icono="remove"
          etiqueta={es ? "Quitar uno" : "Remove one"}
          alPulsar={() => alCambiar(-1)}
        />
        <Text style={[estilos.numero, { color: tema.texto }]}>{cantidad}</Text>
        <BotonCantidad
          icono="add"
          etiqueta={es ? "Agregar uno" : "Add one"}
          alPulsar={() => alCambiar(1)}
        />
      </View>
    </View>
  );
}

function BotonCantidad({
  icono,
  etiqueta,
  alPulsar,
}: {
  icono: "add" | "remove";
  etiqueta: string;
  alPulsar: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={etiqueta}
      style={estilos.botonCantidad}
      onPress={alPulsar}
    >
      <Ionicons name={icono} color={colores.azul} size={20} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  buscar: {
    borderWidth: 1,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 14,
  },
  alerta: {
    backgroundColor: "#fff2e8",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  alertaTexto: { color: "#8a3b12", fontSize: 12 },
  productos: { gap: 8, marginTop: 12 },
  producto: {
    minHeight: 83,
    borderWidth: 1,
    borderRadius: 13,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  expandir: { flex: 1 },
  nombre: { fontWeight: "700", fontSize: 14 },
  detalle: { color: colores.gris, fontSize: 11, marginTop: 3 },
  precio: { color: colores.azul, fontWeight: "800", marginTop: 5 },
  cantidad: { flexDirection: "row", alignItems: "center", gap: 9 },
  botonCantidad: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: colores.azulClaro,
    alignItems: "center",
    justifyContent: "center",
  },
  numero: { minWidth: 18, textAlign: "center", fontWeight: "800" },
});
