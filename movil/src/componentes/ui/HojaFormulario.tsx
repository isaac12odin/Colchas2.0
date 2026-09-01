import { Ionicons } from "@expo/vector-icons";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { radios, tactilMinimo, usarTema } from "../../tema";

export function HojaFormulario({
  visible,
  titulo,
  subtitulo,
  alCerrar,
  bloqueada = false,
  children,
  pie,
  estiloContenido,
}: {
  visible: boolean;
  titulo: string;
  subtitulo?: string;
  alCerrar: () => void;
  bloqueada?: boolean;
  children: React.ReactNode;
  pie?: React.ReactNode;
  estiloContenido?: StyleProp<ViewStyle>;
}) {
  const tema = usarTema();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const tableta = width >= 600;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={bloqueada ? undefined : alCerrar}
    >
      <KeyboardAvoidingView
        style={[estilos.fondo, { backgroundColor: tema.overlay }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={[
            estilos.hoja,
            tableta && estilos.hojaTableta,
            {
              backgroundColor: tema.panel,
              maxHeight: Math.max(1, height - Math.max(insets.top + 8, 18)),
              paddingBottom: Math.max(insets.bottom, 12),
              borderColor: tema.borde,
            },
          ]}
        >
          <View style={[estilos.asa, { backgroundColor: tema.bordeFuerte }]} />
          <View style={estilos.encabezado}>
            <View style={estilos.expandir}>
              <Text style={[estilos.titulo, { color: tema.texto }]}>
                {titulo}
              </Text>
              {subtitulo ? (
                <Text
                  style={[estilos.subtitulo, { color: tema.textoSecundario }]}
                >
                  {subtitulo}
                </Text>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              accessibilityState={{ disabled: bloqueada }}
              disabled={bloqueada}
              hitSlop={6}
              onPress={alCerrar}
              style={({ pressed }) => [
                estilos.cerrar,
                { backgroundColor: tema.campoDeshabilitado },
                pressed && { opacity: 0.65 },
              ]}
            >
              <Ionicons name="close" size={23} color={tema.texto} />
            </Pressable>
          </View>
          <ScrollView
            style={estilos.scroll}
            contentContainerStyle={[estilos.contenido, estiloContenido]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator
          >
            {children}
          </ScrollView>
          {pie ? (
            <View style={[estilos.pie, { borderColor: tema.borde }]}>
              {pie}
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, justifyContent: "flex-end", alignItems: "center" },
  hoja: {
    width: "100%",
    borderTopLeftRadius: radios.modal,
    borderTopRightRadius: radios.modal,
    borderWidth: 1,
    overflow: "hidden",
  },
  hojaTableta: { maxWidth: 720 },
  asa: {
    width: 44,
    height: 5,
    borderRadius: 999,
    alignSelf: "center",
    marginTop: 9,
  },
  encabezado: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 18,
    paddingBottom: 13,
  },
  expandir: { flex: 1, minWidth: 0 },
  titulo: { fontSize: 21, lineHeight: 27, fontWeight: "900" },
  subtitulo: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  cerrar: {
    width: tactilMinimo,
    height: tactilMinimo,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flexShrink: 1 },
  contenido: { paddingHorizontal: 18, paddingBottom: 18 },
  pie: { borderTopWidth: 1, paddingHorizontal: 18, paddingTop: 12 },
});
