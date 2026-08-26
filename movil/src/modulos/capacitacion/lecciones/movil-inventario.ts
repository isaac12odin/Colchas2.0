import type { LeccionCapacitacionMovil } from "../tipos";
import { p, t } from "./definirLeccion";

export const movilInventario: LeccionCapacitacionMovil = {
  id: "movil-inventario",
  pantalla: "inventario",
  roles: ["ADMINISTRADOR", "ALMACENISTA"],
  titulo: t("Crear producto con fotografía", "Create a product with a photo"),
  resultado: t(
    "Artículo reconocible con códigos, precios y foto optimizada.",
    "Recognizable item with codes, prices, and optimized photo.",
  ),
  pasos: [
    p(
      "Tienes mercancía nueva.",
      "Buscar nombre o código antes de crear",
      "Evitas dividir las existencias en duplicados.",
      "You have new goods.",
      "Search name or code before creating",
      "You avoid splitting stock across duplicates.",
    ),
    p(
      "El producto no existe.",
      "Tocar Nuevo, tomar foto y elegir la agrupación",
      "Usa Colcha, Sábana u otra agrupación para encontrarlo rápidamente.",
      "The product does not exist.",
      "Tap New, take a photo, and choose the group",
      "Use Quilt, Sheet, or another group to find it quickly.",
    ),
    p(
      "Necesitas identificarlo visualmente.",
      "Pulsar Escanear junto a barras o QR y centrar la etiqueta",
      "El código se llena solo; después captura precios y existencia y toca Crear producto.",
      "You need visual identification.",
      "Tap Scan next to barcode or QR and center the label",
      "The code fills automatically; then enter prices and stock and tap Create product.",
    ),
  ],
};
