import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";

import {
  CampoMovil,
  EstadoMovil,
  usarDisenoResponsivo,
} from "@/src/componentes/ui";
import { usarSesion } from "@/src/sesion";
import { usarTema } from "@/src/tema";
import { BarraEstadoJornada } from "@/src/modulos/jornada/BarraEstadoJornada";
import { BuscadorClienteExtraordinario } from "@/src/modulos/jornada/BuscadorClienteExtraordinario";
import { ModalClienteJornada } from "@/src/modulos/jornada/ModalClienteJornada";
import { ResumenJornada } from "@/src/modulos/jornada/ResumenJornada";
import { TarjetaClienteJornada } from "@/src/modulos/jornada/TarjetaClienteJornada";
import { usarJornadaRuta } from "@/src/modulos/jornada/usarJornadaRuta";

export default function JornadaRuta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tema = usarTema();
  const diseno = usarDisenoResponsivo();
  const { idioma } = usarSesion();
  const es = idioma === "es";
  const control = usarJornadaRuta(id, es);
  const [busqueda, establecerBusqueda] = useState("");
  const clientes = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase("es-MX");
    const todos = control.jornada?.clientes ?? [];
    if (!termino) return todos;
    return todos.filter((cliente) =>
      `${cliente.nombreCompleto} ${cliente.telefono} ${cliente.direccion} ${cliente.numeroTarjeta ?? ""} ${cliente.localidad?.nombre ?? ""}`
        .toLocaleLowerCase("es-MX")
        .includes(termino),
    );
  }, [busqueda, control.jornada?.clientes]);

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

  if (control.cargando && !control.jornada) {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator color={tema.primario} />
      </View>
    );
  }

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[estilos.pagina, { backgroundColor: tema.fondo }]}
    >
      <BarraEstadoJornada
        offline={control.offline}
        pendientes={control.pendientes}
        es={es}
        alVerPendientes={() => router.push("/(app)/pendientes")}
      />
      <View
        style={[
          estilos.superior,
          { width: diseno.anchoContenido, paddingHorizontal: diseno.margen },
        ]}
      >
        {control.errorCarga ? (
          <EstadoMovil tipo="error" texto={control.errorCarga} />
        ) : null}
        <ResumenJornada {...control.resumen} es={es} tema={tema} />
        <BuscadorClienteExtraordinario
          rutaId={id}
          clientesActuales={(control.jornada?.clientes ?? []).map(
            (cliente) => cliente.id,
          )}
          es={es}
          tema={tema}
          alSeleccionar={(cliente) =>
            void control.agregarExtraordinario(cliente)
          }
        />
        <CampoMovil
          etiqueta={es ? "Buscar en esta ruta" : "Search this route"}
          valor={busqueda}
          alCambiar={establecerBusqueda}
          placeholder={
            es
              ? "Nombre, teléfono, dirección o tarjeta"
              : "Name, phone, address, or card"
          }
          icono="search-outline"
          autoCapitalize="none"
        />
      </View>
      <FlatList
        data={clientes}
        keyExtractor={(cliente) => cliente.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          estilos.lista,
          {
            width: diseno.anchoContenido,
            alignSelf: "center",
            paddingHorizontal: diseno.margen,
          },
        ]}
        ListEmptyComponent={
          <Text style={[estilos.vacio, { color: tema.textoSecundario }]}>
            {busqueda
              ? es
                ? "No hay clientas que coincidan con la búsqueda."
                : "No customers match your search."
              : control.errorCarga
                ? es
                  ? "No mostramos una jornada anterior porque el servidor rechazó la consulta. Vuelve a entrar o reintenta más tarde."
                  : "We did not show a previous schedule because the server rejected the request. Reopen or try again later."
                : es
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
  superior: { alignSelf: "center", gap: 10, paddingTop: 10 },
  lista: { paddingTop: 10, paddingBottom: 30, gap: 8 },
  vacio: {
    textAlign: "center",
    lineHeight: 20,
    paddingTop: 45,
  },
});
