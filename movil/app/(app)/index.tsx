import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { usarSesion } from "@/src/sesion";
import { contarOperaciones } from "@/src/almacenLocal";
import { colores, usarTema } from "@/src/tema";
import { obtenerConectividad } from "@/src/api";
import { puedeAccederModuloMovil, type ModuloMovil } from "@/src/permisos";
import { usarDatosVivosMovil } from "@/src/usarDatosVivosMovil";
import { AgendaCobranzaMovil } from "@/src/modulos/jornada/AgendaCobranzaMovil";
import { GuiaRapidaRolMovil } from "@/src/modulos/capacitacion/GuiaRapidaRolMovil";

export default function InicioMovil() {
  const { usuario, salir, idioma, alternarIdioma } = usarSesion();
  const tema = usarTema();
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
        ? `${pendientes} movimientos seguirán cifrados y separados para tu usuario en este equipo.`
        : `${pendientes} movements will remain encrypted and isolated for your user on this device.`,
      [
        { text: es ? "Permanecer" : "Stay", style: "cancel" },
        {
          text: es ? "Cerrar sesión" : "Sign out",
          onPress: () => void salir(),
        },
      ],
    );
  }
  const modulos = (
    [
      {
        titulo: es ? "Practicar paso a paso" : "Practice step by step",
        detalle: es
          ? "Pantallas simuladas y pasos exactos por puesto"
          : "Role tutorials, no data changes",
        icono: "school" as const,
        ruta: "/(app)/capacitacion" as const,
        modulo: "capacitacion",
      },
      {
        titulo: es ? "Rutas de cobranza" : "Collection routes",
        detalle: es
          ? "Jornada, abonos y visitas"
          : "Schedule, payments, visits",
        icono: "navigate" as const,
        ruta: "/(app)/rutas" as const,
        modulo: "cobranza",
      },
      {
        titulo: es ? "Inventario" : "Inventory",
        detalle: es ? "Existencias y precios" : "Stock and prices",
        icono: "cube" as const,
        ruta: "/(app)/inventario" as const,
        modulo: "inventario",
      },
      {
        titulo: es ? "Pedidos" : "Orders",
        detalle: es
          ? "Surtido, recepción y entrega"
          : "Fulfillment, receiving, delivery",
        icono: "receipt" as const,
        ruta: "/(app)/pedidos" as const,
        modulo: "pedidos",
      },
      {
        titulo: es ? "Resumen" : "Overview",
        detalle: es ? "Ventas, cartera y alertas" : "Sales, balances, alerts",
        icono: "bar-chart" as const,
        ruta: "/(app)/resumen" as const,
        modulo: "resumen",
      },
      {
        titulo: es ? "Sincronización" : "Synchronization",
        detalle: `${pendientes} ${es ? "operaciones pendientes" : "pending operations"}`,
        icono: "cloud-upload" as const,
        ruta: "/(app)/pendientes" as const,
        modulo: "sincronizacion",
      },
    ] satisfies Array<{
      titulo: string;
      detalle: string;
      icono:
        | "navigate"
        | "cube"
        | "receipt"
        | "bar-chart"
        | "cloud-upload"
        | "school";
      ruta:
        | "/(app)/rutas"
        | "/(app)/inventario"
        | "/(app)/pedidos"
        | "/(app)/resumen"
        | "/(app)/pendientes"
        | "/(app)/capacitacion";
      modulo: ModuloMovil;
    }>
  ).filter((m) => usuario && puedeAccederModuloMovil(usuario.rol, m.modulo));
  return (
    <SafeAreaView style={[estilos.pagina, { backgroundColor: tema.fondo }]}>
      <ScrollView contentContainerStyle={estilos.contenido}>
        <View style={estilos.encabezado}>
          <View>
            <Text style={estilos.marca}>VEKTRA · PRECISION IN MOTION</Text>
            <Text style={[estilos.saludo, { color: tema.texto }]}>
              {es ? "Hola" : "Hello"}, {usuario?.nombre.split(" ")[0]}
            </Text>
            <View style={estilos.sesionEstado}>
              <View
                style={[
                  estilos.punto,
                  { backgroundColor: conectada ? colores.verde : "#f1c21b" },
                ]}
              />
              <Text style={estilos.rol}>
                {usuario?.rol} ·{" "}
                {conectada
                  ? es
                    ? "con conexión"
                    : "online"
                  : es
                    ? "modo offline"
                    : "offline mode"}
              </Text>
            </View>
          </View>
          <View style={estilos.acciones}>
            <Pressable
              onPress={alternarIdioma}
              style={[
                estilos.iconoBoton,
                { backgroundColor: tema.panel, borderColor: tema.borde },
              ]}
            >
              <Text style={{ color: tema.texto, fontWeight: "700" }}>
                {es ? "EN" : "ES"}
              </Text>
            </Pressable>
            <Pressable
              onPress={confirmarSalida}
              style={[
                estilos.iconoBoton,
                { backgroundColor: tema.panel, borderColor: tema.borde },
              ]}
            >
              <Ionicons name="log-out-outline" color={tema.texto} size={22} />
            </Pressable>
          </View>
        </View>
        {usuario &&
          (usuario.rol === "COBRADOR" || usuario.rol === "ADMINISTRADOR") && (
            <View style={estilos.agenda}>
              <AgendaCobranzaMovil es={es} tema={tema} />
            </View>
          )}
        {usuario && (
          <View style={estilos.guia}>
            <GuiaRapidaRolMovil rol={usuario.rol} tema={tema} es={es} />
          </View>
        )}
        <Text style={[estilos.seccion, { color: tema.texto }]}>
          {es ? "¿Qué vas a hacer?" : "What are you working on?"}
        </Text>
        <View style={estilos.lista}>
          {modulos.map((m) => (
            <Pressable
              key={m.ruta}
              onPress={() => router.push(m.ruta)}
              style={[
                estilos.tarjeta,
                { backgroundColor: tema.panel, borderColor: tema.borde },
              ]}
            >
              <View style={estilos.icono}>
                <Ionicons name={m.icono} size={24} color={colores.azul} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[estilos.tarjetaTitulo, { color: tema.texto }]}>
                  {m.titulo}
                </Text>
                <Text style={estilos.tarjetaDetalle}>{m.detalle}</Text>
              </View>
              <Ionicons name="chevron-forward" color={colores.gris} size={20} />
            </Pressable>
          ))}
        </View>
        {pendientes > 0 &&
          usuario &&
          puedeAccederModuloMovil(usuario.rol, "sincronizacion") && (
            <Pressable
              onPress={() => router.push("/(app)/pendientes")}
              style={estilos.aviso}
            >
              <Ionicons
                name="shield-checkmark-outline"
                color="#8a3b12"
                size={22}
              />
              <Text style={estilos.avisoTexto}>
                {es
                  ? `${pendientes} movimientos están cifrados y pendientes de confirmar.`
                  : `${pendientes} movements are encrypted and awaiting confirmation.`}
              </Text>
            </Pressable>
          )}
      </ScrollView>
    </SafeAreaView>
  );
}
const estilos = StyleSheet.create({
  pagina: { flex: 1 },
  contenido: { padding: 22, paddingTop: 28 },
  encabezado: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  marca: { color: colores.azul, fontWeight: "900", fontSize: 16 },
  saludo: { fontSize: 28, fontWeight: "800", marginTop: 8 },
  sesionEstado: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  punto: { width: 7, height: 7, borderRadius: 4 },
  rol: { color: colores.gris, fontSize: 11 },
  acciones: { flexDirection: "row", gap: 8 },
  iconoBoton: {
    width: 43,
    height: 43,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  seccion: { fontSize: 18, fontWeight: "800", marginTop: 35, marginBottom: 14 },
  agenda: { marginTop: 24 },
  guia: { marginTop: 12 },
  lista: { gap: 12 },
  tarjeta: {
    minHeight: 88,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
  },
  icono: {
    width: 48,
    height: 48,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colores.azulClaro,
  },
  tarjetaTitulo: { fontSize: 16, fontWeight: "800" },
  tarjetaDetalle: { color: colores.gris, fontSize: 13, marginTop: 4 },
  aviso: {
    marginTop: 22,
    borderRadius: 14,
    padding: 15,
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#fff2e8",
  },
  avisoTexto: { color: "#8a3b12", flex: 1, fontSize: 13, lineHeight: 19 },
});
