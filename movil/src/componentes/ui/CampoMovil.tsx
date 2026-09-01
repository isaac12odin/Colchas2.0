import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

import { radios, tactilMinimo, usarTema } from "../../tema";

export function CampoMovil({
  etiqueta,
  ayuda,
  error,
  valor,
  alCambiar,
  placeholder,
  teclado,
  contrasena = false,
  multilinea = false,
  requerido = false,
  icono,
  estilo,
  autoCapitalize,
  maxLength,
  autoFocus,
  editable = true,
  alEnviar,
}: {
  etiqueta: string;
  ayuda?: string;
  error?: string;
  valor: string;
  alCambiar: (valor: string) => void;
  placeholder?: string;
  teclado?: KeyboardTypeOptions;
  contrasena?: boolean;
  multilinea?: boolean;
  requerido?: boolean;
  icono?: keyof typeof Ionicons.glyphMap;
  estilo?: StyleProp<ViewStyle>;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  maxLength?: number;
  autoFocus?: boolean;
  editable?: boolean;
  alEnviar?: () => void;
}) {
  const tema = usarTema();
  const [visible, establecerVisible] = useState(false);
  return (
    <View style={[estilos.contenedor, estilo]}>
      <Text style={[estilos.etiqueta, { color: tema.textoSecundario }]}>
        {etiqueta}
        {requerido ? " *" : ""}
      </Text>
      <View
        style={[
          estilos.caja,
          multilinea && estilos.cajaMultilinea,
          {
            backgroundColor: editable ? tema.campo : tema.campoDeshabilitado,
            borderColor: error ? tema.peligro : tema.bordeFuerte,
          },
        ]}
      >
        {icono ? (
          <Ionicons name={icono} size={20} color={tema.textoTenue} />
        ) : null}
        <TextInput
          accessibilityLabel={etiqueta}
          value={valor}
          onChangeText={alCambiar}
          placeholder={placeholder}
          placeholderTextColor={tema.textoTenue}
          keyboardType={teclado}
          secureTextEntry={contrasena && !visible}
          multiline={multilinea}
          textAlignVertical={multilinea ? "top" : "center"}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          autoFocus={autoFocus}
          editable={editable}
          onSubmitEditing={alEnviar}
          style={[
            estilos.entrada,
            multilinea && estilos.entradaMultilinea,
            { color: tema.texto },
          ]}
        />
        {contrasena ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              visible ? "Ocultar contraseña" : "Mostrar contraseña"
            }
            hitSlop={8}
            onPress={() => establecerVisible((actual) => !actual)}
            style={estilos.ojo}
          >
            <Ionicons
              name={visible ? "eye-off-outline" : "eye-outline"}
              size={22}
              color={tema.textoSecundario}
            />
          </Pressable>
        ) : null}
      </View>
      {error || ayuda ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[
            estilos.ayuda,
            { color: error ? tema.peligro : tema.textoTenue },
          ]}
        >
          {error ?? ayuda}
        </Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: 6 },
  etiqueta: { fontSize: 13, lineHeight: 18, fontWeight: "700" },
  caja: {
    minHeight: tactilMinimo + 2,
    borderWidth: 1,
    borderRadius: radios.campo,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  cajaMultilinea: { minHeight: 92, alignItems: "flex-start", paddingTop: 8 },
  entrada: {
    flex: 1,
    minHeight: tactilMinimo,
    fontSize: 16,
    paddingVertical: 0,
  },
  entradaMultilinea: { minHeight: 76, paddingTop: 8, paddingBottom: 8 },
  ojo: {
    minWidth: 40,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  ayuda: { fontSize: 12, lineHeight: 17 },
});
