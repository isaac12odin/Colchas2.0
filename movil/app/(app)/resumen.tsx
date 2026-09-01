import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { api } from "@/src/api";
import {
  BotonMovil,
  EstadoMovil,
  PantallaMovil,
  usarDisenoResponsivo,
} from "@/src/componentes/ui";
import { usarSesion } from "@/src/sesion";
import { espaciado, radios, usarTema } from "@/src/tema";
import { usarDatosVivosMovil } from "@/src/usarDatosVivosMovil";

interface Resumen {
  ventas: { total: number };
  abonos: { total: number };
  cartera: { saldo: number; vencido: number };
  operacion: {
    clientesActivos: number;
    pedidosPendientes: number;
    productosBajoMinimo: number;
  };
}

const dinero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

type Icono = keyof typeof Ionicons.glyphMap;

export default function ResumenMovil() {
  const tema = usarTema();
  const diseno = usarDisenoResponsivo();
  const { idioma } = usarSesion();
  const es = idioma === "es";
  const [datos, establecerDatos] = useState<Resumen | null>(null);
  const [error, establecerError] = useState("");
  const [actualizando, establecerActualizando] = useState(false);

  const cargar = useCallback(async () => {
    establecerActualizando(true);
    try {
      const nuevos = await api<Resumen>("/reportes/resumen?periodo=MES");
      establecerDatos(nuevos);
      establecerError("");
    } catch (error) {
      establecerError(error instanceof Error ? error.message : "Error");
    } finally {
      establecerActualizando(false);
    }
  }, []);

  usarDatosVivosMovil(cargar, 15_000);

  if (!datos && !error) {
    return (
      <PantallaMovil desplazable={false} estiloContenido={estilos.estadoPagina}>
        <View
          style={[estilos.iconoEstado, { backgroundColor: tema.primarioSuave }]}
        >
          <ActivityIndicator color={tema.primario} size="large" />
        </View>
        <Text style={[estilos.tituloEstado, { color: tema.texto }]}>
          {es ? "Preparando tu resumen" : "Preparing your summary"}
        </Text>
        <Text style={[estilos.detalleEstado, { color: tema.textoSecundario }]}>
          {es
            ? "Estamos consultando los indicadores del mes actual."
            : "We are loading the current month's indicators."}
        </Text>
      </PantallaMovil>
    );
  }

  if (!datos && error) {
    return (
      <PantallaMovil desplazable={false} estiloContenido={estilos.estadoPagina}>
        <View
          style={[estilos.iconoEstado, { backgroundColor: tema.peligroSuave }]}
        >
          <Ionicons
            name="cloud-offline-outline"
            size={32}
            color={tema.peligro}
          />
        </View>
        <Text style={[estilos.tituloEstado, { color: tema.texto }]}>
          {es ? "No pudimos cargar el resumen" : "We couldn't load the summary"}
        </Text>
        <Text style={[estilos.detalleEstado, { color: tema.textoSecundario }]}>
          {es
            ? "Comprueba tu conexión y vuelve a intentarlo. Tus datos no fueron modificados."
            : "Check your connection and try again. Your data was not changed."}
        </Text>
        <BotonMovil
          texto={es ? "Volver a intentar" : "Try again"}
          icono="refresh"
          alPulsar={() => void cargar()}
          cargando={actualizando}
          estilo={estilos.botonReintento}
        />
      </PantallaMovil>
    );
  }

  const tarjetas: Array<{
    etiqueta: string;
    valor: string;
    icono: Icono;
    color: string;
    fondo: string;
  }> = [
    {
      etiqueta: es ? "Ventas del mes" : "Monthly sales",
      valor: dinero.format(datos!.ventas.total),
      icono: "trending-up-outline",
      color: tema.primario,
      fondo: tema.primarioSuave,
    },
    {
      etiqueta: es ? "Total cobrado" : "Total collected",
      valor: dinero.format(datos!.abonos.total),
      icono: "wallet-outline",
      color: tema.exito,
      fondo: tema.exitoSuave,
    },
    {
      etiqueta: es ? "Cartera por cobrar" : "Receivables",
      valor: dinero.format(datos!.cartera.saldo),
      icono: "receipt-outline",
      color: tema.primario,
      fondo: tema.primarioSuave,
    },
    {
      etiqueta: es ? "Saldo vencido" : "Overdue balance",
      valor: dinero.format(datos!.cartera.vencido),
      icono:
        datos!.cartera.vencido > 0
          ? "warning-outline"
          : "checkmark-circle-outline",
      color: datos!.cartera.vencido > 0 ? tema.peligro : tema.exito,
      fondo: datos!.cartera.vencido > 0 ? tema.peligroSuave : tema.exitoSuave,
    },
    {
      etiqueta: es ? "Clientes activos" : "Active customers",
      valor: String(datos!.operacion.clientesActivos),
      icono: "people-outline",
      color: tema.primario,
      fondo: tema.primarioSuave,
    },
    {
      etiqueta: es ? "Pedidos pendientes" : "Pending orders",
      valor: String(datos!.operacion.pedidosPendientes),
      icono: "cube-outline",
      color:
        datos!.operacion.pedidosPendientes > 0 ? tema.advertencia : tema.exito,
      fondo:
        datos!.operacion.pedidosPendientes > 0
          ? tema.advertenciaSuave
          : tema.exitoSuave,
    },
  ];
  const sinActividad =
    datos!.ventas.total === 0 &&
    datos!.abonos.total === 0 &&
    datos!.cartera.saldo === 0 &&
    datos!.operacion.clientesActivos === 0 &&
    datos!.operacion.pedidosPendientes === 0;
  const dosColumnas = diseno.tableta && diseno.fontScale < 1.4;

  return (
    <PantallaMovil estiloContenido={estilos.pagina}>
      <View style={estilos.encabezado}>
        <View style={estilos.titulos}>
          <Text style={[estilos.sobretitulo, { color: tema.primario }]}>
            {es ? "OPERACIÓN" : "OPERATIONS"}
          </Text>
          <Text style={[estilos.titulo, { color: tema.texto }]}>
            {es ? "Resumen del mes" : "Monthly summary"}
          </Text>
          <Text style={[estilos.subtitulo, { color: tema.textoSecundario }]}>
            {es
              ? "Ventas, cobranza y cartera en una sola vista."
              : "Sales, collections and receivables at a glance."}
          </Text>
        </View>
        {actualizando ? (
          <View
            accessibilityRole="progressbar"
            accessibilityLabel={
              es ? "Actualizando indicadores" : "Updating indicators"
            }
            style={[
              estilos.actualizando,
              { backgroundColor: tema.panel, borderColor: tema.borde },
            ]}
          >
            <ActivityIndicator color={tema.primario} />
          </View>
        ) : null}
      </View>

      {error ? (
        <EstadoMovil
          tipo="advertencia"
          texto={
            es
              ? "No se pudo actualizar. Se muestra la última lectura confirmada."
              : "Unable to refresh. Showing the last confirmed reading."
          }
        />
      ) : null}

      {sinActividad ? (
        <EstadoMovil
          tipo="informacion"
          texto={
            es
              ? "Aún no hay movimientos en este periodo. Los indicadores aparecerán al registrar la primera operación."
              : "There are no movements in this period yet. Indicators will appear after the first operation."
          }
        />
      ) : null}

      <View style={estilos.rejilla}>
        {tarjetas.map((tarjeta) => (
          <View
            accessible
            accessibilityLabel={`${tarjeta.etiqueta}: ${tarjeta.valor}`}
            key={tarjeta.etiqueta}
            style={[
              estilos.tarjeta,
              dosColumnas ? estilos.mediaTarjeta : estilos.tarjetaCompleta,
              { backgroundColor: tema.panel, borderColor: tema.borde },
            ]}
          >
            <View
              style={[estilos.iconoTarjeta, { backgroundColor: tarjeta.fondo }]}
            >
              <Ionicons name={tarjeta.icono} size={22} color={tarjeta.color} />
            </View>
            <View style={estilos.contenidoTarjeta}>
              <Text style={[estilos.etiqueta, { color: tema.textoSecundario }]}>
                {tarjeta.etiqueta}
              </Text>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.78}
                numberOfLines={1}
                style={[estilos.valor, { color: tarjeta.color }]}
              >
                {tarjeta.valor}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {datos!.operacion.productosBajoMinimo > 0 ? (
        <EstadoMovil
          tipo="advertencia"
          texto={
            es
              ? `${datos!.operacion.productosBajoMinimo} productos requieren reposición de inventario.`
              : `${datos!.operacion.productosBajoMinimo} products require inventory replenishment.`
          }
        />
      ) : null}
    </PantallaMovil>
  );
}

const estilos = StyleSheet.create({
  pagina: { gap: espaciado.md },
  estadoPagina: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: espaciado.xl,
  },
  iconoEstado: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: espaciado.md,
  },
  tituloEstado: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: "900",
    textAlign: "center",
  },
  detalleEstado: {
    maxWidth: 440,
    marginTop: espaciado.xs,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  botonReintento: { maxWidth: 320, marginTop: espaciado.lg },
  encabezado: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: espaciado.sm,
  },
  titulos: { flex: 1 },
  sobretitulo: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  titulo: {
    marginTop: 3,
    fontSize: 26,
    lineHeight: 33,
    fontWeight: "900",
  },
  subtitulo: { marginTop: 4, fontSize: 14, lineHeight: 20 },
  actualizando: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rejilla: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: espaciado.sm,
  },
  tarjeta: {
    minHeight: 118,
    borderWidth: 1,
    borderRadius: radios.tarjeta,
    padding: espaciado.md,
    flexDirection: "row",
    alignItems: "center",
    gap: espaciado.sm,
  },
  tarjetaCompleta: { width: "100%" },
  mediaTarjeta: { flexBasis: "48%", flexGrow: 1 },
  iconoTarjeta: {
    width: 48,
    height: 48,
    borderRadius: radios.campo,
    alignItems: "center",
    justifyContent: "center",
  },
  contenidoTarjeta: { minWidth: 0, flex: 1 },
  etiqueta: { fontSize: 13, lineHeight: 18, fontWeight: "700" },
  valor: { marginTop: 5, fontSize: 24, lineHeight: 30, fontWeight: "900" },
});
