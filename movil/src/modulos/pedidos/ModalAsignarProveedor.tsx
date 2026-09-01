import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { BotonMovil, EstadoMovil, HojaFormulario } from "../../componentes/ui";
import { radios, tactilMinimo, type usarTema } from "../../tema";
import type { ControlPedidos } from "./usarPedidosMoviles";

/**
 * Etapa separada de la entrega: Administración, Contabilidad o Almacén dejan
 * documentado quién surtirá cada artículo. El cobrador nunca ve esta acción.
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
  const seleccionados =
    control.gestion?.items.filter((item) =>
      Boolean(control.proveedoresPorItem[item.id]),
    ).length ?? 0;
  const total = control.gestion?.items.length ?? 0;
  const completo = total > 0 && seleccionados === total;

  return (
    <HojaFormulario
      visible={Boolean(control.gestion)}
      bloqueada={control.guardando}
      alCerrar={control.cerrarGestion}
      titulo={es ? "¿Quién surtirá el pedido?" : "Who will supply this order?"}
      subtitulo={
        es
          ? `${control.gestion?.folio ?? ""} · ${seleccionados} de ${total} artículos asignados`
          : `${control.gestion?.folio ?? ""} · ${seleccionados} of ${total} items assigned`
      }
      estiloContenido={estilos.contenido}
      pie={
        <BotonMovil
          texto={
            completo
              ? es
                ? "Confirmar pedido al proveedor"
                : "Confirm supplier order"
              : es
                ? `Faltan ${total - seleccionados} por asignar`
                : `${total - seleccionados} still unassigned`
          }
          icono={completo ? "send" : "alert-circle-outline"}
          deshabilitado={!completo}
          cargando={control.guardando}
          alPulsar={() => void control.confirmarProveedor()}
        />
      }
    >
      <EstadoMovil
        tipo="informacion"
        texto={
          es
            ? "Esta acción sólo registra trazabilidad de compra. El saldo de la clienta no cambia hasta entregar."
            : "This only records purchasing traceability. The customer's balance does not change until delivery."
        }
      />

      {control.proveedores.length === 0 ? (
        <EstadoMovil
          tipo="advertencia"
          texto={
            es
              ? "No hay proveedores activos. Créalo desde la web antes de continuar."
              : "There are no active suppliers. Create one on the web before continuing."
          }
        />
      ) : null}

      {control.gestion?.items.map((item, indice) => (
        <View
          key={item.id}
          style={[
            estilos.item,
            { backgroundColor: tema.panelElevado, borderColor: tema.borde },
          ]}
        >
          <View style={estilos.itemEncabezado}>
            <View
              style={[estilos.numero, { backgroundColor: tema.primarioSuave }]}
            >
              <Text style={[estilos.numeroTexto, { color: tema.primario }]}>
                {indice + 1}
              </Text>
            </View>
            <View style={estilos.expandir}>
              <Text style={[estilos.itemNombre, { color: tema.texto }]}>
                {item.cantidad} × {item.descripcion}
              </Text>
              <Text
                style={[estilos.itemAyuda, { color: tema.textoSecundario }]}
              >
                {es ? "Selecciona un proveedor" : "Select one supplier"}
              </Text>
            </View>
          </View>

          <View style={estilos.opciones}>
            {control.proveedores.map((proveedor) => {
              const activo =
                control.proveedoresPorItem[item.id] === proveedor.id;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: activo }}
                  accessibilityLabel={proveedor.nombre}
                  key={proveedor.id}
                  onPress={() =>
                    control.establecerProveedor(item.id, proveedor.id)
                  }
                  style={({ pressed }) => [
                    estilos.opcion,
                    {
                      borderColor: activo ? tema.primario : tema.bordeFuerte,
                      backgroundColor: activo ? tema.primarioSuave : tema.campo,
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name={activo ? "checkmark-circle" : "ellipse-outline"}
                    size={21}
                    color={activo ? tema.primario : tema.textoTenue}
                  />
                  <Text
                    style={[
                      estilos.opcionTexto,
                      { color: activo ? tema.primario : tema.texto },
                    ]}
                  >
                    {proveedor.nombre}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </HojaFormulario>
  );
}

const estilos = StyleSheet.create({
  contenido: { gap: 14 },
  item: { borderWidth: 1, borderRadius: radios.tarjeta, padding: 14, gap: 12 },
  itemEncabezado: { flexDirection: "row", alignItems: "center", gap: 10 },
  numero: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  numeroTexto: { fontSize: 14, lineHeight: 19, fontWeight: "900" },
  itemNombre: { fontSize: 15, lineHeight: 21, fontWeight: "900" },
  itemAyuda: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  opciones: { gap: 8 },
  opcion: {
    minHeight: tactilMinimo,
    borderWidth: 1,
    borderRadius: radios.campo,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  opcionTexto: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: "800" },
  expandir: { flex: 1, minWidth: 0 },
});
