import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ModalEntregaPedido } from "@/src/modulos/pedidos/ModalEntregaPedido";
import { ModalAsignarProveedor } from "@/src/modulos/pedidos/ModalAsignarProveedor";
import { ModalNuevoPedido } from "@/src/modulos/pedidos/ModalNuevoPedido";
import { TarjetaPedido } from "@/src/modulos/pedidos/TarjetaPedido";
import { usarPedidosMoviles } from "@/src/modulos/pedidos/usarPedidosMoviles";
import { usarSesion } from "@/src/sesion";
import { colores, usarTema } from "@/src/tema";
import { puedeCrearPedidoMovil } from "@/src/permisos";

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
  const puedeCrear = usuario ? puedeCrearPedidoMovil(usuario.rol) : false;
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
        ListHeaderComponent={
          puedeCrear ? (
            <View style={estilos.encabezado}>
              <View style={{ flex: 1 }}>
                <Text style={[estilos.encabezadoTitulo, { color: tema.texto }]}>
                  {parametros.clienteId
                    ? es
                      ? "Pedidos de la clienta"
                      : "Customer orders"
                    : es
                      ? "Solicitudes y entregas"
                      : "Requests and deliveries"}
                </Text>
                <Text style={estilos.encabezadoDetalle}>
                  {es
                    ? "Crea un pedido real y sigue su avance hasta la entrega."
                    : "Create a real order and track it through delivery."}
                </Text>
              </View>
              <Pressable
                disabled={control.offline}
                onPress={control.abrirNuevo}
                style={[
                  estilos.nuevo,
                  control.offline && estilos.deshabilitado,
                ]}
              >
                <Ionicons name="add" color="white" size={20} />
                <Text style={estilos.nuevoTexto}>{es ? "Nuevo" : "New"}</Text>
              </Pressable>
            </View>
          ) : null
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
      <ModalNuevoPedido
        visible={control.nuevoAbierto}
        clienteInicialId={parametros.clienteId}
        creando={control.creandoPedido}
        sinConexion={control.offline}
        es={es}
        tema={tema}
        alCerrar={control.cerrarNuevo}
        alCrear={control.crearPedido}
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
  encabezado: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 5,
  },
  encabezadoTitulo: { fontSize: 18, fontWeight: "900" },
  encabezadoDetalle: {
    color: colores.gris,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  nuevo: {
    minHeight: 45,
    borderRadius: 11,
    backgroundColor: colores.azul,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  nuevoTexto: { color: "white", fontWeight: "900" },
  deshabilitado: { opacity: 0.43 },
  vacio: { color: colores.gris, textAlign: "center", marginTop: 50 },
});
