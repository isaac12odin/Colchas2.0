import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { usarSesion } from "@/src/sesion";
import { colores, usarTema } from "@/src/tema";
import { BarraEstadoJornada } from "@/src/modulos/jornada/BarraEstadoJornada";
import { BuscadorClienteExtraordinario } from "@/src/modulos/jornada/BuscadorClienteExtraordinario";
import { ModalClienteJornada } from "@/src/modulos/jornada/ModalClienteJornada";
import { ResumenJornada } from "@/src/modulos/jornada/ResumenJornada";
import { TarjetaClienteJornada } from "@/src/modulos/jornada/TarjetaClienteJornada";
import { usarJornadaRuta } from "@/src/modulos/jornada/usarJornadaRuta";

export default function JornadaRuta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tema = usarTema();
  const { idioma } = usarSesion();
  const es = idioma === "es";
  const control = usarJornadaRuta(id, es);

  function irAVenta() {
    if (!control.cliente) return;
    const cliente = control.cliente;
    control.cerrarCliente();
    router.push({
      pathname: "/(app)/venta",
      params: {
        clienteId: cliente.id,
        cliente: cliente.nombreCompleto,
        numeroTarjeta: cliente.numeroTarjeta ?? "",
        rutaId: id,
        fecha: control.fecha,
      },
    });
  }

  function irAEntrega() {
    if (!control.cliente) return;
    const clienteId = control.cliente.id;
    control.cerrarCliente();
    router.push({
      pathname: "/(app)/pedidos",
      params: { clienteId, rutaId: id, fecha: control.fecha },
    });
  }

  if (control.cargando) {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator color={colores.azul} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[estilos.pagina, { backgroundColor: tema.fondo }]}>
      <BarraEstadoJornada
        offline={control.offline}
        pendientes={control.pendientes}
        es={es}
        alVerPendientes={() => router.push("/(app)/pendientes")}
      />
      <ResumenJornada {...control.resumen} es={es} tema={tema} />
      <BuscadorClienteExtraordinario
        rutaId={id}
        clientesActuales={(control.jornada?.clientes ?? []).map(
          (cliente) => cliente.id,
        )}
        es={es}
        tema={tema}
        alSeleccionar={(cliente) => void control.agregarExtraordinario(cliente)}
      />
      <FlatList
        data={control.jornada?.clientes ?? []}
        keyExtractor={(cliente) => cliente.id}
        contentContainerStyle={estilos.lista}
        ListEmptyComponent={
          <Text style={estilos.vacio}>
            {es
              ? "Abre esta ruta con internet una vez para usarla sin conexión."
              : "Open this route online once before using it offline."}
          </Text>
        }
        renderItem={({ item }) => (
          <TarjetaClienteJornada
            cliente={item}
            es={es}
            tema={tema}
            alAbrir={() => control.abrirCliente(item)}
          />
        )}
      />
      <ModalClienteJornada
        control={control}
        es={es}
        tema={tema}
        alVender={irAVenta}
        alEntregar={irAEntrega}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pagina: { flex: 1 },
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  lista: { padding: 13, paddingBottom: 30, gap: 8 },
  vacio: {
    textAlign: "center",
    color: colores.gris,
    lineHeight: 20,
    paddingTop: 45,
  },
});
