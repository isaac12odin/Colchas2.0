import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  BotonMovil,
  EstadoMovil,
  usarDisenoResponsivo,
} from "@/src/componentes/ui";
import { ModalEntregaPedido } from "@/src/modulos/pedidos/ModalEntregaPedido";
import { ModalAsignarProveedor } from "@/src/modulos/pedidos/ModalAsignarProveedor";
import { ModalNuevoPedido } from "@/src/modulos/pedidos/ModalNuevoPedido";
import { TarjetaPedido } from "@/src/modulos/pedidos/TarjetaPedido";
import { usarPedidosMoviles } from "@/src/modulos/pedidos/usarPedidosMoviles";
import { puedeCrearPedidoMovil } from "@/src/permisos";
import { usarSesion } from "@/src/sesion";
import { usarTema } from "@/src/tema";

export default function PedidosMovil() {
  const parametros = useLocalSearchParams<{
    clienteId?: string;
    rutaId?: string;
    fecha?: string;
  }>();
  const tema = usarTema();
  const diseno = usarDisenoResponsivo();
  const insets = useSafeAreaInsets();
  const { usuario, idioma } = usarSesion();
  const es = idioma === "es";
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
  const control = usarPedidosMoviles(parametros, es, puedeAsignarProveedor);
  const ancho = diseno.anchoContenido - diseno.margen * 2;

  return (
    <View style={[estilos.pagina, { backgroundColor: tema.fondo }]}>
      <FlatList
        contentContainerStyle={[
          estilos.lista,
          {
            paddingHorizontal: diseno.margen,
            paddingBottom: Math.max(insets.bottom, 16) + 24,
          },
        ]}
        data={control.visibles}
        keyExtractor={(pedido) => pedido.id}
        refreshControl={
          <RefreshControl
            refreshing={control.cargando}
            onRefresh={control.cargar}
            tintColor={tema.primario}
            colors={[tema.primario]}
          />
        }
        ListHeaderComponent={
          <View style={[estilos.ancho, { width: ancho }]}>
            <View
              style={[
                estilos.encabezado,
                (diseno.compacto || diseno.fontScale > 1.2) &&
                  estilos.encabezadoApilado,
              ]}
            >
              <View style={estilos.expandir}>
                <Text style={[estilos.encabezadoTitulo, { color: tema.texto }]}>
                  {parametros.clienteId
                    ? es
                      ? "Pedidos de la clienta"
                      : "Customer orders"
                    : es
                      ? "Pedidos y entregas"
                      : "Orders and deliveries"}
                </Text>
                <Text
                  style={[
                    estilos.encabezadoDetalle,
                    { color: tema.textoSecundario },
                  ]}
                >
                  {es
                    ? "Pedido pendiente no significa deuda. La venta y el saldo nacen al entregar."
                    : "A pending order is not debt. The sale and balance begin on delivery."}
                </Text>
              </View>
              {puedeCrear ? (
                <BotonMovil
                  texto={es ? "Nuevo pedido" : "New order"}
                  icono="add"
                  expandido={diseno.compacto || diseno.fontScale > 1.2}
                  deshabilitado={control.offline}
                  alPulsar={control.abrirNuevo}
                />
              ) : null}
            </View>

            {control.offline ? (
              <EstadoMovil
                tipo="advertencia"
                texto={
                  es
                    ? "Sin señal: consulta pedidos y confirma entregas cifradas. Crear o asignar proveedor requiere conexión."
                    : "Offline: review orders and secure deliveries locally. Creating or assigning a supplier requires a connection."
                }
              />
            ) : control.errorCarga ? (
              <EstadoMovil tipo="error" texto={control.errorCarga} />
            ) : control.porConfirmar > 0 ? (
              <EstadoMovil
                tipo="informacion"
                texto={
                  es
                    ? `${control.porConfirmar} movimientos están protegidos en este equipo y pendientes de sincronizar.`
                    : `${control.porConfirmar} movements are secured on this device and waiting to sync.`
                }
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          control.cargando ? (
            <ActivityIndicator style={estilos.cargando} color={tema.primario} />
          ) : (
            <View style={[estilos.vacio, { width: ancho }]}>
              <Text style={[estilos.vacioTitulo, { color: tema.texto }]}>
                {es ? "No hay pedidos pendientes" : "No pending orders"}
              </Text>
              <Text
                style={[estilos.vacioTexto, { color: tema.textoSecundario }]}
              >
                {control.errorCarga
                  ? es
                    ? "No mostramos pedidos anteriores porque el servidor rechazó la consulta. Desliza para reintentar."
                    : "We did not show previous orders because the server rejected the request. Pull to retry."
                  : puedeCrear
                    ? es
                      ? "Cuando una clienta pida mercancía que no llevas, créala aquí."
                      : "Create one here when a customer requests goods you do not carry."
                    : es
                      ? "No hay trabajo de pedidos para tu rol en este momento."
                      : "There is no order work for your role right now."}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={[estilos.ancho, { width: ancho }]}>
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
          </View>
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
  lista: { gap: 12, alignItems: "center", paddingTop: 16 },
  ancho: { alignSelf: "center", gap: 13 },
  encabezado: { flexDirection: "row", alignItems: "center", gap: 14 },
  encabezadoApilado: { flexDirection: "column", alignItems: "stretch" },
  encabezadoTitulo: { fontSize: 22, lineHeight: 28, fontWeight: "900" },
  encabezadoDetalle: { fontSize: 13, lineHeight: 19, marginTop: 3 },
  expandir: { flex: 1, minWidth: 0 },
  cargando: { marginTop: 48 },
  vacio: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 18 },
  vacioTitulo: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "900",
    textAlign: "center",
  },
  vacioTexto: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 5,
  },
});
