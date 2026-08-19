import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colores, type usarTema } from "../../tema";
import { dinero } from "../../utilidades/formato";
import type { ControlVenta } from "./usarVentaCampo";

export function ResumenVenta({
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
      <View
        style={[
          estilos.resumen,
          { backgroundColor: tema.panel, borderColor: tema.borde },
        ]}
      >
        <Text style={[estilos.subtitulo, { color: tema.texto }]}>
          {es ? "Confirma antes de guardar" : "Confirm before saving"}
        </Text>
        {control.carrito.map((linea) => (
          <View key={linea.id} style={estilos.fila}>
            <Text style={[estilos.producto, { color: tema.texto }]}>
              {linea.cantidad} × {linea.nombre}
            </Text>
            <Text style={{ color: tema.texto }}>
              {dinero.format(linea.cantidad * Number(linea.precioVenta))}
            </Text>
          </View>
        ))}
        <View style={[estilos.totalFila, { borderColor: tema.borde }]}>
          <Text style={[estilos.totalEtiqueta, { color: tema.texto }]}>
            Total
          </Text>
          <Text style={estilos.total}>{dinero.format(control.total)}</Text>
        </View>
        {control.tipo === "CREDITO" && (
          <DetalleCredito control={control} es={es} />
        )}
      </View>
      <View style={estilos.aviso}>
        <Ionicons name="information-circle" color={colores.azul} size={20} />
        <Text style={estilos.avisoTexto}>
          {es
            ? "Al confirmar, inventario y saldo se proyectan en este equipo. El servidor los valida al sincronizar."
            : "After confirmation, stock and balance are projected on this device. The server validates them during sync."}
        </Text>
      </View>
      <Pressable
        disabled={control.guardando}
        onPress={() => void control.confirmar()}
        style={[estilos.boton, control.guardando && estilos.deshabilitado]}
      >
        <Ionicons name="checkmark-circle" color="white" size={20} />
        <Text style={estilos.botonTexto}>
          {control.guardando
            ? es
              ? "Protegiendo…"
              : "Securing…"
            : es
              ? "Confirmar y guardar"
              : "Confirm and save"}
        </Text>
      </Pressable>
      <Pressable
        disabled={control.guardando}
        onPress={control.editar}
        style={estilos.volver}
      >
        <Text style={estilos.volverTexto}>
          {es ? "Regresar y editar" : "Go back and edit"}
        </Text>
      </Pressable>
    </>
  );
}

function DetalleCredito({
  control,
  es,
}: {
  control: ControlVenta;
  es: boolean;
}) {
  return (
    <>
      <View style={estilos.fila}>
        <Text style={estilos.muted}>{es ? "Anticipo" : "Deposit"}</Text>
        <Text style={estilos.muted}>
          {dinero.format(control.anticipoNumero)}
        </Text>
      </View>
      <View style={estilos.fila}>
        <Text style={estilos.muted}>{es ? "Nuevo saldo" : "New balance"}</Text>
        <Text style={estilos.muted}>{dinero.format(control.financiado)}</Text>
      </View>
      {control.financiado > 0 ? (
        <Text style={estilos.plan}>
          {dinero.format(Number(control.cuota))} · {control.periodicidad} ·{" "}
          {es ? "inicia" : "starts"} {control.primerVencimiento}
        </Text>
      ) : (
        <Text style={estilos.plan}>
          {es
            ? "Liquidada con el anticipo · sin tarjeta"
            : "Paid by deposit · no card"}
        </Text>
      )}
    </>
  );
}

const estilos = StyleSheet.create({
  resumen: { borderWidth: 1, borderRadius: 15, padding: 16 },
  subtitulo: { fontSize: 16, fontWeight: "800" },
  fila: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 13,
  },
  producto: { flex: 1, fontSize: 13 },
  totalFila: {
    borderTopWidth: 1,
    marginTop: 15,
    paddingTop: 15,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalEtiqueta: { fontWeight: "800", fontSize: 17 },
  total: { color: colores.azul, fontWeight: "900", fontSize: 18 },
  muted: { color: colores.gris, fontSize: 12 },
  plan: {
    color: "#6929c4",
    backgroundColor: "#f6f2ff",
    borderRadius: 9,
    padding: 10,
    marginTop: 13,
    fontSize: 11,
    fontWeight: "700",
  },
  aviso: { flexDirection: "row", gap: 8, marginTop: 15, paddingHorizontal: 4 },
  avisoTexto: { color: colores.gris, fontSize: 11, lineHeight: 17, flex: 1 },
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
  botonTexto: { color: "white", fontWeight: "800", fontSize: 15 },
  deshabilitado: { opacity: 0.42 },
  volver: { alignItems: "center", padding: 16 },
  volverTexto: { color: colores.azul, fontWeight: "700" },
});
