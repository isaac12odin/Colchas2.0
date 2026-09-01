import { createContext, useContext } from "react";
import { useColorScheme } from "react-native";

/**
 * Paleta de marca. Los componentes nuevos consumen `usarTema()` para
 * mantener contraste suficiente tanto en modo claro como oscuro.
 */
export const colores = {
  azul: "#0f62fe",
  azulPresionado: "#0043ce",
  azulOscuro: "#001d6c",
  azulClaro: "#e8f1ff",
  blanco: "#ffffff",
  fondoClaro: "#f6f8fb",
  fondoOscuro: "#090e18",
  panelOscuro: "#121a27",
  texto: "#16191f",
  textoOscuro: "#f7f9fc",
  gris: "#5d6878",
  borde: "#dce2ea",
  rojo: "#c62828",
  verde: "#147d3f",
  amarillo: "#a15c00",
} as const;

const temaClaro = {
  oscuro: false,
  fondo: colores.fondoClaro,
  panel: colores.blanco,
  panelElevado: colores.blanco,
  texto: colores.texto,
  textoSecundario: "#566273",
  textoTenue: "#737e8d",
  borde: colores.borde,
  bordeFuerte: "#aeb8c5",
  campo: "#ffffff",
  campoDeshabilitado: "#edf1f5",
  primario: colores.azul,
  primarioPresionado: colores.azulPresionado,
  primarioSuave: colores.azulClaro,
  sobrePrimario: colores.blanco,
  exito: colores.verde,
  exitoSuave: "#defbe6",
  advertencia: colores.amarillo,
  advertenciaSuave: "#fff2dd",
  peligro: colores.rojo,
  peligroSuave: "#fff0f0",
  overlay: "rgba(7, 12, 21, .62)",
  sombra: "#101828",
  barraEstado: "dark" as const,
};

const temaOscuro = {
  oscuro: true,
  fondo: colores.fondoOscuro,
  panel: colores.panelOscuro,
  panelElevado: "#182231",
  texto: colores.textoOscuro,
  textoSecundario: "#c0cad7",
  textoTenue: "#94a2b5",
  borde: "#334256",
  bordeFuerte: "#5f7088",
  campo: "#0f1724",
  campoDeshabilitado: "#1a2432",
  primario: "#78a9ff",
  primarioPresionado: "#a6c8ff",
  primarioSuave: "#17345f",
  sobrePrimario: "#071426",
  exito: "#6fdc8c",
  exitoSuave: "#12351f",
  advertencia: "#f1c21b",
  advertenciaSuave: "#3b2b0a",
  peligro: "#ff8389",
  peligroSuave: "#40151a",
  overlay: "rgba(0, 0, 0, .78)",
  sombra: "#000000",
  barraEstado: "light" as const,
};

export type TemaMovil = typeof temaClaro | typeof temaOscuro;

export type ModoTema = "SISTEMA" | "CLARO" | "OSCURO";

export const ContextoTema = createContext<{
  modo: ModoTema;
  establecerModo: (modo: ModoTema) => Promise<void>;
}>({
  modo: "SISTEMA",
  establecerModo: async () => undefined,
});

export function usarTema(): TemaMovil {
  const sistemaOscuro = useColorScheme() === "dark";
  const { modo } = useContext(ContextoTema);
  const oscuro = modo === "OSCURO" || (modo === "SISTEMA" && sistemaOscuro);
  return oscuro ? temaOscuro : temaClaro;
}

export function usarPreferenciaTema() {
  return useContext(ContextoTema);
}

export const espaciado = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const radios = {
  campo: 12,
  boton: 13,
  tarjeta: 16,
  modal: 24,
  pastilla: 999,
} as const;

export const tactilMinimo = 48;
