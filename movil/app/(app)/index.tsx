import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { PantallaMovil, usarDisenoResponsivo } from "@/src/componentes/ui";
import { usarSesion } from "@/src/sesion";
import { contarOperaciones } from "@/src/almacenLocal";
import { radios, tactilMinimo, usarTema } from "@/src/tema";
import { obtenerConectividad } from "@/src/api";
import { puedeAccederModuloMovil, type ModuloMovil } from "@/src/permisos";
import { usarDatosVivosMovil } from "@/src/usarDatosVivosMovil";

type RutaInicio =
  | "/(app)/rutas"
  | "/(app)/inventario"
  | "/(app)/pedidos"
  | "/(app)/resumen"
  | "/(app)/pendientes";

interface AccesoInicio {
  titulo: string;
  detalle: string;
  accion: string;
  icono: keyof typeof Ionicons.glyphMap;
  ruta: RutaInicio;
  modulo: ModuloMovil;
}

export default function InicioMovil() {
  const { usuario, salir, idioma, alternarIdioma } = usarSesion();
  const tema = usarTema();
  const diseno = usarDisenoResponsivo();
  const es = idioma === "es";
  const [pendientes, establecerPendientes] = useState(0);
  const [conectada, establecerConectada] = useState(false);

  const cargar = useCallback(async () => {
    const [total, red] = await Promise.all([
      contarOperaciones(),
      obtenerConectividad().catch(() => ({ conectada: false })),
    ]);
    establecerPendientes(total);
    establecerConectada(red.conectada);
  }, []);
  usarDatosVivosMovil(cargar, 15_000);

  function confirmarSalida() {
    if (!pendientes) {
      void salir();
      return;
    }
    Alert.alert(
      es ? "Hay trabajo sin sincronizar" : "There is unsynchronized work",
      es
        ? `${pendientes} movimientos seguirán cifrados para tu usuario en este equipo.`
        : `${pendientes} movements will remain encrypted for your user on this device.`,
      [
        { text: es ? "Permanecer" : "Stay", style: "cancel" },
        {
          text: es ? "Cerrar sesión" : "Sign out",
          onPress: () => void salir(),
        },
      ],
    );
  }

  const accesos = (
    [
      {
        titulo: es ? "Cobrar ruta" : "Collect route",
        detalle: es
          ? "Abonos, visitas, entregas y ventas"
          : "Payments, visits, deliveries, and sales",
        accion: es ? "Abrir jornada" : "Open workday",
        icono: "navigate" as const,
        ruta: "/(app)/rutas" as const,
        modulo: "cobranza",
      },
      {
        titulo: es ? "Inventario" : "Inventory",
        detalle: es
          ? "Buscar, escanear, fotografiar o registrar"
          : "Search, scan, photograph, or register",
        accion: es ? "Ver productos" : "View products",
        icono: "cube" as const,
        ruta: "/(app)/inventario" as const,
        modulo: "inventario",
      },
      {
        titulo: es ? "Pedidos" : "Orders",
        detalle: es
          ? "Solicitar, surtir y entregar"
          : "Request, fulfill, and deliver",
        accion: es ? "Ver pendientes" : "View pending",
        icono: "receipt" as const,
        ruta: "/(app)/pedidos" as const,
        modulo: "pedidos",
      },
      {
        titulo: es ? "Resumen" : "Overview",
        detalle: es ? "Ventas, cartera y alertas" : "Sales, balances, alerts",
        accion: es ? "Consultar" : "Open",
        icono: "bar-chart" as const,
        ruta: "/(app)/resumen" as const,
        modulo: "resumen",
      },
      {
        titulo: es ? "Sincronizar" : "Synchronize",
        detalle: pendientes
          ? `${pendientes} ${es ? "movimientos por confirmar" : "movements to confirm"}`
          : es
            ? "Todo está confirmado"
            : "Everything is confirmed",
        accion: es ? "Revisar estado" : "Review status",
        icono: "cloud-upload" as const,
        ruta: "/(app)/pendientes" as const,
        modulo: "sincronizacion",
      },
    ] satisfies AccesoInicio[]
  ).filter((acceso) =>
    usuario ? puedeAccederModuloMovil(usuario.rol, acceso.modulo) : false,
  );

  return (
    <PantallaMovil incluirSuperior estiloContenido={estilos.contenido}>
      <View style={estilos.encabezado}>
        <View style={estilos.identidad}>
          <Text style={[estilos.marca, { color: tema.primario }]}>VEKTRA</Text>
          <Text
            style={[estilos.saludo, { color: tema.texto }]}
            numberOfLines={2}
          >
            {es ? "Hola" : "Hello"}, {usuario?.nombre.split(" ")[0]}
          </Text>
          <View style={estilos.estadoFila}>
            <View
              style={[
                estilos.punto,
                { backgroundColor: conectada ? tema.exito : tema.advertencia },
              ]}
            />
            <Text
              style={[estilos.estadoTexto, { color: tema.textoSecundario }]}
            >
              {conectada
                ? es
                  ? "En línea"
                  : "Online"
                : es
                  ? "Trabajando sin conexión"
                  : "Working offline"}
              {` · ${usuario?.rol ?? ""}`}
            </Text>
          </View>
        </View>
        <View style={estilos.accionesCabecera}>
          <BotonIcono
            etiqueta={es ? "Cambiar idioma" : "Change language"}
            tema={tema}
            alPulsar={alternarIdioma}
          >
            <Text style={[estilos.idioma, { color: tema.texto }]}>
              {es ? "EN" : "ES"}
            </Text>
          </BotonIcono>
          <BotonIcono
            etiqueta={es ? "Abrir perfil" : "Open profile"}
            tema={tema}
            alPulsar={() => router.push("/(app)/perfil" as Href)}
          >
            <Ionicons name="person-outline" color={tema.texto} size={22} />
          </BotonIcono>
        </View>
      </View>

      {!conectada || pendientes > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            usuario && puedeAccederModuloMovil(usuario.rol, "sincronizacion")
              ? router.push("/(app)/pendientes")
              : undefined
          }
          style={[
            estilos.aviso,
            {
              backgroundColor: conectada
                ? tema.primarioSuave
                : tema.advertenciaSuave,
            },
          ]}
        >
          <Ionicons
            name={conectada ? "cloud-upload-outline" : "cloud-offline-outline"}
            color={conectada ? tema.primario : tema.advertencia}
            size={22}
          />
          <View style={estilos.expandir}>
            <Text
              style={[
                estilos.avisoTitulo,
                { color: conectada ? tema.primario : tema.advertencia },
              ]}
            >
              {conectada
                ? es
                  ? `${pendientes} movimientos listos para sincronizar`
                  : `${pendientes} movements ready to sync`
                : es
                  ? "Puedes seguir trabajando"
                  : "You can keep working"}
            </Text>
            <Text
              style={[estilos.avisoDetalle, { color: tema.textoSecundario }]}
            >
              {es
                ? "La app conserva los datos cifrados; tú decides cuándo confirmarlos en Sincronización."
                : "The app keeps data encrypted; you choose when to confirm it in Synchronization."}
            </Text>
          </View>
          <Ionicons name="chevron-forward" color={tema.textoTenue} size={20} />
        </Pressable>
      ) : null}

      <View style={estilos.seccionFila}>
        <View style={estilos.expandir}>
          <Text style={[estilos.seccion, { color: tema.texto }]}>
            {es ? "¿Qué vas a hacer?" : "What are you doing?"}
          </Text>
          <Text
            style={[estilos.seccionDetalle, { color: tema.textoSecundario }]}
          >
            {es
              ? "Elige una acción y comienza."
              : "Choose an action and begin."}
          </Text>
        </View>
      </View>

      <View style={[estilos.modulos, diseno.tableta && estilos.modulosTableta]}>
        {accesos.map((acceso, indice) => (
          <Pressable
            key={acceso.ruta}
            accessibilityRole="button"
            accessibilityLabel={`${acceso.titulo}. ${acceso.detalle}`}
            onPress={() => router.push(acceso.ruta)}
            style={({ pressed }) => [
              estilos.tarjeta,
              diseno.tableta && estilos.tarjetaTableta,
              {
                backgroundColor: tema.panel,
                borderColor: indice === 0 ? tema.primario : tema.borde,
                opacity: pressed ? 0.78 : 1,
              },
            ]}
          >
            <View
              style={[estilos.icono, { backgroundColor: tema.primarioSuave }]}
            >
              <Ionicons name={acceso.icono} size={25} color={tema.primario} />
            </View>
            <View style={estilos.expandir}>
              <Text style={[estilos.tarjetaTitulo, { color: tema.texto }]}>
                {acceso.titulo}
              </Text>
              <Text
                style={[
                  estilos.tarjetaDetalle,
                  { color: tema.textoSecundario },
                ]}
              >
                {acceso.detalle}
              </Text>
              <Text style={[estilos.tarjetaAccion, { color: tema.primario }]}>
                {acceso.accion}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              color={tema.textoTenue}
              size={21}
            />
          </Pressable>
        ))}
      </View>

      {usuario && puedeAccederModuloMovil(usuario.rol, "capacitacion") ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(app)/capacitacion")}
          style={[estilos.capacitacion, { borderColor: tema.borde }]}
        >
          <Ionicons name="school-outline" color={tema.primario} size={22} />
          <View style={estilos.expandir}>
            <Text style={[estilos.capacitacionTitulo, { color: tema.texto }]}>
              {es
                ? "Practicar con pantallas reales"
                : "Practice with real screens"}
            </Text>
            <Text
              style={[
                estilos.capacitacionDetalle,
                { color: tema.textoSecundario },
              ]}
            >
              {es
                ? "Simulaciones seguras según tu rol; no afectan datos."
                : "Safe role-based simulations; no data is changed."}
            </Text>
          </View>
          <Ionicons name="chevron-forward" color={tema.textoTenue} size={20} />
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={confirmarSalida}
        style={estilos.salir}
      >
        <Ionicons
          name="log-out-outline"
          color={tema.textoSecundario}
          size={19}
        />
        <Text style={[estilos.salirTexto, { color: tema.textoSecundario }]}>
          {es ? "Cerrar sesión" : "Sign out"}
        </Text>
      </Pressable>
    </PantallaMovil>
  );
}

function BotonIcono({
  children,
  etiqueta,
  tema,
  alPulsar,
}: {
  children: React.ReactNode;
  etiqueta: string;
  tema: ReturnType<typeof usarTema>;
  alPulsar: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={alPulsar}
      style={({ pressed }) => [
        estilos.iconoBoton,
        { backgroundColor: tema.panel, borderColor: tema.borde },
        pressed && { opacity: 0.72 },
      ]}
    >
      {children}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  contenido: { paddingTop: 14 },
  encabezado: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  identidad: { flex: 1, minWidth: 0 },
  marca: { fontWeight: "900", fontSize: 14, letterSpacing: 1.4 },
  saludo: { fontSize: 27, lineHeight: 34, fontWeight: "900", marginTop: 3 },
  estadoFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 4,
  },
  punto: { width: 8, height: 8, borderRadius: 4 },
  estadoTexto: { fontSize: 12, lineHeight: 17, flexShrink: 1 },
  accionesCabecera: { flexDirection: "row", gap: 7 },
  iconoBoton: {
    width: tactilMinimo,
    height: tactilMinimo,
    borderRadius: radios.campo,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  idioma: { fontWeight: "900", fontSize: 13 },
  aviso: {
    marginTop: 18,
    borderRadius: radios.tarjeta,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avisoTitulo: { fontSize: 13, lineHeight: 18, fontWeight: "900" },
  avisoDetalle: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  seccionFila: { marginTop: 27, marginBottom: 12, flexDirection: "row" },
  seccion: { fontSize: 20, lineHeight: 26, fontWeight: "900" },
  seccionDetalle: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  modulos: { gap: 11 },
  modulosTableta: { flexDirection: "row", flexWrap: "wrap" },
  tarjeta: {
    minHeight: 108,
    borderRadius: radios.tarjeta,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    padding: 15,
  },
  tarjetaTableta: { width: "48.9%", flexGrow: 1 },
  icono: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tarjetaTitulo: { fontSize: 16, lineHeight: 21, fontWeight: "900" },
  tarjetaDetalle: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  tarjetaAccion: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    marginTop: 7,
  },
  capacitacion: {
    minHeight: 78,
    borderWidth: 1,
    borderRadius: radios.tarjeta,
    padding: 14,
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  capacitacionTitulo: { fontSize: 14, lineHeight: 19, fontWeight: "900" },
  capacitacionDetalle: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  salir: {
    minHeight: tactilMinimo,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 17,
    paddingHorizontal: 14,
  },
  salirTexto: { fontSize: 13, fontWeight: "700" },
  expandir: { flex: 1, minWidth: 0 },
});
