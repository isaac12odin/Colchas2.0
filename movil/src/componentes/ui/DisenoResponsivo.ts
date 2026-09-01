import { useWindowDimensions } from "react-native";

export function usarDisenoResponsivo() {
  const { width, height, fontScale } = useWindowDimensions();
  const compacto = width < 360 || height < 640;
  const tableta = width >= 600;
  return {
    width,
    height,
    fontScale,
    compacto,
    tableta,
    horizontal: width > height,
    margen: compacto ? 12 : tableta ? 24 : 16,
    anchoContenido: tableta ? Math.min(width - 48, 760) : width,
  };
}
