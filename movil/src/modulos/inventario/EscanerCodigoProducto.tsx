import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colores } from "../../tema";

export function EscanerCodigoProducto({
  visible,
  tipo,
  es,
  alCerrar,
  alDetectar,
}: {
  visible: boolean;
  tipo: "BARRAS" | "QR" | "AMBOS";
  es: boolean;
  alCerrar: () => void;
  alDetectar: (codigo: string, tipo: "BARRAS" | "QR") => void;
}) {
  const [permiso, solicitarPermiso] = useCameraPermissions();
  const tipos =
    tipo === "QR"
      ? (["qr"] as const)
      : tipo === "BARRAS"
        ? (["ean13", "ean8", "upc_a", "upc_e", "code128", "code39"] as const)
        : ([
            "qr",
            "ean13",
            "ean8",
            "upc_a",
            "upc_e",
            "code128",
            "code39",
          ] as const);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={alCerrar}>
      <View style={estilos.pagina}>
        <View style={estilos.encabezado}>
          <View>
            <Text style={estilos.titulo}>
              {tipo === "QR"
                ? es
                  ? "Escanear QR"
                  : "Scan QR"
                : tipo === "BARRAS"
                  ? es
                    ? "Escanear código de barras"
                    : "Scan barcode"
                  : es
                    ? "Buscar por código"
                    : "Find by code"}
            </Text>
            <Text style={estilos.detalle}>
              {es
                ? "Centra el código dentro del recuadro. Se captura automáticamente."
                : "Center the code in the frame. It is captured automatically."}
            </Text>
          </View>
          <Pressable
            accessibilityLabel={es ? "Cerrar" : "Close"}
            onPress={alCerrar}
          >
            <Ionicons name="close" size={28} color="white" />
          </Pressable>
        </View>

        {!permiso?.granted ? (
          <View style={estilos.permiso}>
            <Ionicons name="camera-outline" size={44} color="white" />
            <Text style={estilos.permisoTexto}>
              {es
                ? "Vektra necesita la cámara para leer el código del producto."
                : "Vektra needs camera access to read the product code."}
            </Text>
            <Pressable
              style={estilos.boton}
              onPress={() => void solicitarPermiso()}
            >
              <Text style={estilos.botonTexto}>
                {es ? "Permitir cámara" : "Allow camera"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={estilos.camaraContenedor}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: [...tipos] }}
              onBarcodeScanned={({ data, type }) => {
                const codigo = data.trim();
                if (codigo) alDetectar(codigo, type === "qr" ? "QR" : "BARRAS");
              }}
            />
            <View pointerEvents="none" style={estilos.mascara}>
              <View style={estilos.marco} />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  pagina: { flex: 1, backgroundColor: "#07111f" },
  encabezado: {
    minHeight: 118,
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  titulo: { color: "white", fontSize: 20, fontWeight: "900" },
  detalle: { color: "#b8c5d6", fontSize: 12, marginTop: 5, maxWidth: 300 },
  camaraContenedor: { flex: 1, overflow: "hidden" },
  mascara: { flex: 1, alignItems: "center", justifyContent: "center" },
  marco: {
    width: "82%",
    aspectRatio: 1.55,
    borderWidth: 3,
    borderColor: "white",
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  permiso: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  permisoTexto: {
    color: "white",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 15,
  },
  boton: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: colores.azul,
    paddingHorizontal: 22,
    justifyContent: "center",
    marginTop: 20,
  },
  botonTexto: { color: "white", fontWeight: "800" },
});
