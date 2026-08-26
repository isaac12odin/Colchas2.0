import type { LeccionCapacitacionMovil } from "../tipos";
import { p, t } from "./definirLeccion";

export const movilVentaCredito: LeccionCapacitacionMovil = {
  id: "movil-venta-credito",
  pantalla: "venta",
  roles: ["ADMINISTRADOR", "COBRADOR"],
  titulo: t("Venta de campo a crédito", "Field credit sale"),
  resultado: t(
    "Inventario baja y saldo aumenta sólo por el monto financiado.",
    "Stock decreases and balance increases only by the financed amount.",
  ),
  tipoSimulador: "VENTA_CREDITO",
  pasos: [
    p(
      "La clienta quiere comprar.",
      "Escanear o buscar producto y confirmar existencia",
      "La venta usa catálogo y precio del servidor, no texto libre.",
      "The customer wants to buy.",
      "Scan or search product and confirm stock",
      "The sale uses catalog and server price, not free text.",
    ),
    p(
      "No pagará todo hoy.",
      "Elegir Crédito, anticipo y plan",
      "Saldo nuevo es total menos anticipo.",
      "The customer will not pay in full today.",
      "Choose Credit, deposit, and plan",
      "New balance equals total minus deposit.",
    ),
    p(
      "El resumen es correcto.",
      "Confirmar venta",
      "Se guarda localmente y se aplica una sola vez al sincronizar.",
      "The summary is correct.",
      "Confirm sale",
      "It is stored locally and applied once during sync.",
    ),
  ],
};
