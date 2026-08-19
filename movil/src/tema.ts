import { useColorScheme } from "react-native";

export const colores = {
  azul: "#0f62fe",
  azulOscuro: "#001d6c",
  azulClaro: "#edf5ff",
  blanco: "#ffffff",
  fondoClaro: "#f4f7fb",
  fondoOscuro: "#0b1220",
  panelOscuro: "#121a2a",
  texto: "#161616",
  textoOscuro: "#f4f4f4",
  gris: "#64748b",
  borde: "#dde1e6",
  rojo: "#da1e28",
  verde: "#198038",
};

export function usarTema() {
  const oscuro = useColorScheme() === "dark";
  return {
    oscuro,
    fondo: oscuro ? colores.fondoOscuro : colores.fondoClaro,
    panel: oscuro ? colores.panelOscuro : colores.blanco,
    texto: oscuro ? colores.textoOscuro : colores.texto,
    borde: oscuro ? "#334155" : colores.borde,
  };
}
