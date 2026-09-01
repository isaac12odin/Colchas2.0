import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { View, Text } from "react-native";

import type { TemaMovil } from "../../../tema";
import { usarTema } from "../../../tema";
import type { ControlPractica, IdiomaReplica } from "./dominioReplica";
import { estilosReplica as estilos } from "./estilosReplica";

export interface PanelProps {
  control: ControlPractica;
  es: boolean;
  tema: TemaMovil;
  acertar: () => void;
  fallar: () => void;
}

export function PanelAccion({
  tema,
  children,
}: {
  tema: TemaMovil;
  children: ReactNode;
}) {
  return (
    <View
      style={[
        estilos.panel,
        { backgroundColor: tema.panel, borderColor: tema.borde },
      ]}
    >
      {children}
    </View>
  );
}

export function PanelGenerico({ idioma }: { idioma: IdiomaReplica }) {
  const tema = usarTema();
  return (
    <PanelAccion tema={tema}>
      <Ionicons name="construct-outline" size={24} color={tema.advertencia} />
      <Text style={[estilos.titulo, { color: tema.texto }]}>
        {idioma === "es"
          ? "Esta práctica usa su simulador operativo"
          : "This practice uses its operational simulator"}
      </Text>
    </PanelAccion>
  );
}

export function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const tema = usarTema();
  return (
    <View style={estilos.dato}>
      <Text style={[estilos.datoEtiqueta, { color: tema.textoSecundario }]}>
        {etiqueta}
      </Text>
      <Text style={[estilos.datoValor, { color: tema.texto }]}>{valor}</Text>
    </View>
  );
}

export function Retroalimentacion({
  texto,
  color,
  fondo,
  icono,
}: {
  texto: string;
  color: string;
  fondo: string;
  icono: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View
      accessibilityLiveRegion="assertive"
      style={[estilos.retro, { backgroundColor: fondo }]}
    >
      <Ionicons name={icono} size={20} color={color} />
      <Text style={[estilos.retroTexto, { color }]}>{texto}</Text>
    </View>
  );
}
