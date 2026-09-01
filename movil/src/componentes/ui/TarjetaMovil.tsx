import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { radios, usarTema } from "../../tema";

export function TarjetaMovil({
  children,
  estilo,
  elevada = false,
}: {
  children: React.ReactNode;
  estilo?: StyleProp<ViewStyle>;
  elevada?: boolean;
}) {
  const tema = usarTema();
  return (
    <View
      style={[
        estilos.base,
        {
          backgroundColor: elevada ? tema.panelElevado : tema.panel,
          borderColor: tema.borde,
          shadowColor: tema.sombra,
        },
        elevada && estilos.elevada,
        estilo,
      ]}
    >
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  base: { borderWidth: 1, borderRadius: radios.tarjeta, padding: 16 },
  elevada: {
    shadowOpacity: 0.09,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
});
