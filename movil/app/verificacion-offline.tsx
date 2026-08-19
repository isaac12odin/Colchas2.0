import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  cerrarBaseLocalParaPruebas,
  comprobarRechazoClaveIncorrectaParaPruebas,
  diagnosticarProteccionBaseLocal,
  reiniciarBaseLocalParaPruebas,
} from "@/src/infraestructura/baseLocal";
import {
  encolarOperaciones,
  leerHistorialOperaciones,
  verificarIntegridadOperaciones,
} from "@/src/almacenLocal";

interface Resultado {
  sqlCipher: boolean;
  claveIncorrectaRechazada: boolean;
  persistencia: boolean;
  integridad: boolean;
  version: string | null;
}

export default function VerificacionOffline() {
  const [resultado, establecerResultado] = useState<Resultado | null>(null);
  const [error, establecerError] = useState("");
  const habilitada = process.env.EXPO_PUBLIC_E2E_SQLCIPHER === "SI";

  useEffect(() => {
    if (!habilitada) return;
    let vigente = true;
    void ejecutarDiagnostico()
      .then((valor) => {
        if (vigente) establecerResultado(valor);
      })
      .catch((causa) => {
        if (vigente)
          establecerError(
            causa instanceof Error ? causa.message : "Diagnóstico desconocido",
          );
      });
    return () => {
      vigente = false;
    };
  }, [habilitada]);

  if (!habilitada) return <Redirect href="/" />;
  return (
    <SafeAreaView style={estilos.pagina}>
      <View style={estilos.panel}>
        <Text style={estilos.titulo}>Verificación offline nativa</Text>
        {!resultado && !error ? (
          <ActivityIndicator accessibilityLabel="Verificando SQLCipher" />
        ) : null}
        {error ? (
          <Text accessibilityRole="alert" style={estilos.error}>
            Falló: {error}
          </Text>
        ) : null}
        {resultado ? (
          <>
            <Estado
              texto="SQLCipher activo"
              valido={resultado.sqlCipher}
              detalle={resultado.version ?? "sin versión"}
            />
            <Estado
              texto="Clave incorrecta rechazada"
              valido={resultado.claveIncorrectaRechazada}
            />
            <Estado
              texto="Bitácora persistente"
              valido={resultado.persistencia}
            />
            <Estado texto="Integridad válida" valido={resultado.integridad} />
            <Text testID="resultado-sqlcipher" style={estilos.resultado}>
              {Object.entries(resultado)
                .filter(([clave]) => clave !== "version")
                .every(([, valor]) => valor === true)
                ? "PRUEBA NATIVA APROBADA"
                : "PRUEBA NATIVA FALLIDA"}
            </Text>
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function Estado({
  texto,
  valido,
  detalle,
}: {
  texto: string;
  valido: boolean;
  detalle?: string;
}) {
  return (
    <Text style={valido ? estilos.correcto : estilos.error}>
      {valido ? "✓" : "✕"} {texto}
      {detalle ? ` · ${detalle}` : ""}
    </Text>
  );
}

async function ejecutarDiagnostico(): Promise<Resultado> {
  await reiniciarBaseLocalParaPruebas();
  const id = "operacion-persistencia-sqlcipher";
  await encolarOperaciones([
    {
      id,
      tipo: "ABONO",
      datos: {
        clienteId: "cliente-e2e",
        monto: 125,
        metodoPago: "EFECTIVO",
      },
    },
  ]);
  const diagnosticoInicial = await diagnosticarProteccionBaseLocal();
  const integridadInicial = await verificarIntegridadOperaciones();
  await cerrarBaseLocalParaPruebas();
  const claveIncorrectaRechazada =
    await comprobarRechazoClaveIncorrectaParaPruebas();
  const historial = await leerHistorialOperaciones();
  const diagnosticoReabierto = await diagnosticarProteccionBaseLocal();
  const integridadReabierta = await verificarIntegridadOperaciones();

  return {
    sqlCipher:
      diagnosticoInicial.sqlCipherActivo &&
      diagnosticoInicial.integridadSqlite &&
      diagnosticoInicial.integridadCifrado &&
      diagnosticoReabierto.sqlCipherActivo,
    claveIncorrectaRechazada,
    persistencia: historial.some((operacion) => operacion.id === id),
    integridad: integridadInicial.valida && integridadReabierta.valida,
    version: diagnosticoReabierto.versionSqlCipher,
  };
}

const estilos = StyleSheet.create({
  pagina: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f4f7fb",
  },
  panel: {
    gap: 18,
    padding: 24,
    borderRadius: 16,
    backgroundColor: "white",
  },
  titulo: { fontSize: 24, fontWeight: "700", color: "#161616" },
  correcto: { color: "#0e6027", fontSize: 16, fontWeight: "600" },
  error: { color: "#b8191f", fontSize: 16, fontWeight: "600" },
  resultado: {
    marginTop: 8,
    color: "#0f62fe",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
});
