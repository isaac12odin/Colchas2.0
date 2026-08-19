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

  return (
    <View style={[estilos.pagina, { backgroundColor: tema.fondo }]}>
      {control.offline && (
        <View style={estilos.aviso}>
          <Ionicons name="cloud-offline" color="#8a3b12" size={17} />
          <Text style={estilos.avisoTexto}>
            {es
              ? "Sin señal · puedes confirmar entregas; quedarán cifradas."
              : "Offline · you can confirm deliveries; they will remain encrypted."}
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
            puedeEntregar={puedeEntregar}
            alAvanzar={() => void control.avanzar(item)}
            alEntregar={() => control.abrirEntrega(item)}
          />
        )}
      />
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
  lista: { padding: 15, gap: 11 },
  vacio: { color: colores.gris, textAlign: "center", marginTop: 50 },
});
