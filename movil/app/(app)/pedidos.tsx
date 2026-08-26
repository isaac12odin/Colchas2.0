import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ModalEntregaPedido } from "@/src/modulos/pedidos/ModalEntregaPedido";
import { ModalAsignarProveedor } from "@/src/modulos/pedidos/ModalAsignarProveedor";
import { TarjetaPedido } from "@/src/modulos/pedidos/TarjetaPedido";
import { usarPedidosMoviles } from "@/src/modulos/pedidos/usarPedidosMoviles";
import { usarSesion } from "@/src/sesion";
import { colores, usarTema } from "@/src/tema";

export default function PedidosMovil() {
  const parametros = useLocalSearchParams<{
    clienteId?: string;
    rutaId?: string;
    fecha?: string;
  }>();
  const tema = usarTema();
  const { usuario, idioma } = usarSesion();
  const es = idioma === "es";
  const control = usarPedidosMoviles(parametros, es);
  const puedeAlmacen =
    usuario?.rol === "ADMINISTRADOR" || usuario?.rol === "ALMACENISTA";
  const puedeEntregar =
    usuario?.rol === "ADMINISTRADOR" || usuario?.rol === "COBRADOR";
  const puedeAsignarProveedor = [
    "ADMINISTRADOR",
    "CONTABLE",
    "ALMACENISTA",
  ].includes(usuario?.rol ?? "");

  return (
    <View style={[estilos.pagina, { backgroundColor: tema.fondo }]}>
      {(control.offline || control.porConfirmar > 0) && (
        <View
          style={[estilos.aviso, !control.offline && estilos.avisoPendiente]}
        >
          <Ionicons
            name={control.offline ? "cloud-offline" : "shield-checkmark"}
            color={control.offline ? "#8a3b12" : "#0043ce"}
            size={17}
          />
          <Text
            style={[
              estilos.avisoTexto,
              !control.offline && estilos.avisoPendienteTexto,
            ]}
          >
            {control.offline
              ? es
                ? "Sin señal · puedes confirmar entregas; quedarán cifradas."
                : "Offline · you can confirm deliveries; they will remain encrypted."
              : es
                ? `${control.porConfirmar} movimientos locales protegidos; sincroniza para confirmarlos.`
                : `${control.porConfirmar} local movements secured; sync to confirm them.`}
          </Text>
        </View>
      )}
      <FlatList
        contentContainerStyle={estilos.lista}
        data={control.visibles}
        keyExtractor={(pedido) => pedido.id}
        refreshControl={
          <RefreshControl
            refreshing={control.cargando}
            onRefresh={control.cargar}
            tintColor={colores.azul}
          />
        }
        ListEmptyComponent={
          control.cargando ? (
            <ActivityIndicator color={colores.azul} />
          ) : (
            <Text style={estilos.vacio}>
              {es
                ? "No hay pedidos pendientes para mostrar."
                : "No pending orders to display."}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <TarjetaPedido
            pedido={item}
            es={es}
            tema={tema}
            puedeAlmacen={puedeAlmacen}
            puedeAsignarProveedor={puedeAsignarProveedor}
            puedeEntregar={puedeEntregar}
            alAvanzar={() => void control.avanzar(item)}
            alAsignarProveedor={() => control.abrirGestion(item)}
            alEntregar={() => control.abrirEntrega(item)}
          />
        )}
      />
      <ModalAsignarProveedor control={control} es={es} tema={tema} />
      <ModalEntregaPedido control={control} es={es} tema={tema} />
    </View>
  );
}

const estilos = StyleSheet.create({
  pagina: { flex: 1 },
  aviso: {
    backgroundColor: "#fff2e8",
    padding: 11,
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
  },
  avisoTexto: { color: "#8a3b12", fontSize: 11, fontWeight: "700", flex: 1 },
  avisoPendiente: { backgroundColor: "#edf5ff" },
  avisoPendienteTexto: { color: "#0043ce" },
  lista: { padding: 15, gap: 11 },
  vacio: { color: colores.gris, textAlign: "center", marginTop: 50 },
});
