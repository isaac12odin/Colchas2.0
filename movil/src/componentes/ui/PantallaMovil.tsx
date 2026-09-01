import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { usarTema } from "../../tema";
import { usarDisenoResponsivo } from "./DisenoResponsivo";

export function PantallaMovil({
  children,
  desplazable = true,
  conTeclado = false,
  incluirSuperior = false,
  estiloContenido,
  refresco,
}: {
  children: React.ReactNode;
  desplazable?: boolean;
  conTeclado?: boolean;
  incluirSuperior?: boolean;
  estiloContenido?: StyleProp<ViewStyle>;
  refresco?: ScrollViewProps["refreshControl"];
}) {
  const tema = usarTema();
  const diseno = usarDisenoResponsivo();
  const contenido = (
    <View
      style={[
        estilos.contenido,
        { width: diseno.anchoContenido, paddingHorizontal: diseno.margen },
        estiloContenido,
      ]}
    >
      {children}
    </View>
  );
  const cuerpo = desplazable ? (
    <ScrollView
      style={estilos.expandir}
      contentContainerStyle={estilos.scroll}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      refreshControl={refresco}
    >
      {contenido}
    </ScrollView>
  ) : (
    contenido
  );
  return (
    <SafeAreaView
      edges={
        incluirSuperior
          ? ["top", "left", "right", "bottom"]
          : ["left", "right", "bottom"]
      }
      style={[estilos.pagina, { backgroundColor: tema.fondo }]}
    >
      {conTeclado ? (
        <KeyboardAvoidingView
          style={estilos.expandir}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {cuerpo}
        </KeyboardAvoidingView>
      ) : (
        cuerpo
      )}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pagina: { flex: 1 },
  expandir: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: "center" },
  contenido: { alignSelf: "center", paddingTop: 16, paddingBottom: 32 },
});
