import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api } from "@/src/api";
import { colores, usarTema } from "@/src/tema";
import { usarSesion } from "@/src/sesion";
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
export default function ResumenMovil() {
  const tema = usarTema();
  const { idioma } = usarSesion();
  const es = idioma === "es";
  const [datos, establecerDatos] = useState<Resumen | null>(null);
  const [error, establecerError] = useState("");
  const cargar = useCallback(async () => {
    try {
      const nuevos = await api<Resumen>("/reportes/resumen?periodo=MES");
      establecerDatos(nuevos);
      establecerError("");
    } catch (error) {
      establecerError(error instanceof Error ? error.message : "Error");
    }
  }, []);
  usarDatosVivosMovil(cargar, 15_000);
  if (!datos && !error)
    return (
      <View style={estilos.centro}>
        <ActivityIndicator color={colores.azul} />
      </View>
    );
  if (!datos && error)
    return (
      <View style={estilos.centro}>
        <Text style={estilos.error}>{error}</Text>
      </View>
    );
  const tarjetas = [
    {
      e: es ? "Ventas del mes" : "Monthly sales",
      v: dinero.format(datos!.ventas.total),
    },
    { e: es ? "Cobrado" : "Collected", v: dinero.format(datos!.abonos.total) },
    {
      e: es ? "Cartera" : "Receivables",
      v: dinero.format(datos!.cartera.saldo),
    },
    {
      e: es ? "Vencido" : "Overdue",
      v: dinero.format(datos!.cartera.vencido),
      alerta: datos!.cartera.vencido > 0,
    },
    {
      e: es ? "Clientes" : "Customers",
      v: String(datos!.operacion.clientesActivos),
    },
    {
      e: es ? "Pedidos pendientes" : "Pending orders",
      v: String(datos!.operacion.pedidosPendientes),
    },
  ];
  return (
    <ScrollView
      style={{ backgroundColor: tema.fondo }}
      contentContainerStyle={estilos.lista}
    >
      <Text style={[estilos.ayuda, { color: tema.texto }]}>
        {es ? "Indicadores del mes actual" : "Current-month indicators"}
      </Text>
      {error && (
        <View style={estilos.avisoError}>
          <Text style={estilos.error}>
            {es
              ? "No se pudo actualizar; se muestra la última lectura confirmada."
              : "Unable to refresh; showing the last confirmed reading."}
          </Text>
        </View>
      )}
      {tarjetas.map((t) => (
        <View
          key={t.e}
          style={[
            estilos.tarjeta,
            { backgroundColor: tema.panel, borderColor: tema.borde },
          ]}
        >
          <Text style={estilos.etiqueta}>{t.e}</Text>
          <Text
            style={[
              estilos.valor,
              { color: t.alerta ? colores.rojo : tema.texto },
            ]}
          >
            {t.v}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
const estilos = StyleSheet.create({
  centro: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },
  lista: { padding: 17, gap: 10 },
  ayuda: { fontWeight: "700", marginBottom: 5 },
  tarjeta: { borderWidth: 1, borderRadius: 14, padding: 18 },
  etiqueta: { color: colores.gris, fontSize: 13 },
  valor: { fontSize: 25, fontWeight: "700", marginTop: 6 },
  error: { color: colores.rojo, textAlign: "center" },
  avisoError: { backgroundColor: "#fff1f1", borderRadius: 10, padding: 10 },
});
