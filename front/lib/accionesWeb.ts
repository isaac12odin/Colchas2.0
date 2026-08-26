import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  BellRing,
  Boxes,
  ClipboardList,
  CreditCard,
  PackageCheck,
  RotateCcw,
  Route,
  ShoppingCart,
  UserPlus,
  WalletCards,
} from "lucide-react";

import type { Idioma } from "@/lib/i18n";
import type { Rol } from "@/lib/tipos";

export type ClaveAccionWeb =
  | "venta"
  | "abono"
  | "cliente"
  | "producto"
  | "compra"
  | "pedido"
  | "surtirPedidos"
  | "rutas"
  | "corte"
  | "devolucion"
  | "reportes"
  | "alertas";

export interface AccionWeb {
  clave: ClaveAccionWeb;
  href: string;
  icono: LucideIcon;
  titulo: Record<Idioma, string>;
  descripcion: Record<Idioma, string>;
  roles: readonly Rol[];
}

const todosLosRoles: readonly Rol[] = [
  "ADMINISTRADOR",
  "CONTABLE",
  "VENDEDOR",
  "ALMACENISTA",
  "COBRADOR",
];

/**
 * Catálogo único de tareas de la web. Mantener aquí permisos, texto y destino
 * evita duplicar decisiones de experiencia de usuario entre menú e inicio.
 */
export const accionesWeb: readonly AccionWeb[] = [
  {
    clave: "venta",
    href: "/ventas?accion=nueva",
    icono: CreditCard,
    titulo: { es: "Hacer una venta", en: "Record a sale" },
    descripcion: {
      es: "Contado o crédito; el saldo se calcula automáticamente.",
      en: "Cash or credit; the balance is calculated automatically.",
    },
    roles: ["ADMINISTRADOR", "CONTABLE", "VENDEDOR"],
  },
  {
    clave: "abono",
    href: "/clientes?accion=abono",
    icono: Banknote,
    titulo: { es: "Registrar un abono", en: "Record a payment" },
    descripcion: {
      es: "Busca al cliente y aplica el pago a su saldo.",
      en: "Find the customer and apply the payment to their balance.",
    },
    roles: ["CONTABLE"],
  },
  {
    clave: "cliente",
    href: "/clientes?accion=nuevo",
    icono: UserPlus,
    titulo: { es: "Dar de alta cliente", en: "Add a customer" },
    descripcion: {
      es: "Captura sus datos y localidad en un solo formulario.",
      en: "Enter contact and location details in one form.",
    },
    roles: ["ADMINISTRADOR", "CONTABLE", "VENDEDOR"],
  },
  {
    clave: "producto",
    href: "/inventario?accion=nuevo",
    icono: Boxes,
    titulo: { es: "Agregar un producto", en: "Add a product" },
    descripcion: {
      es: "Incluye foto, códigos, precios y existencia.",
      en: "Include photo, codes, prices, and stock.",
    },
    roles: ["ADMINISTRADOR", "ALMACENISTA"],
  },
  {
    clave: "compra",
    href: "/compras?accion=nueva",
    icono: ShoppingCart,
    titulo: { es: "Dar entrada a mercancía", en: "Receive merchandise" },
    descripcion: {
      es: "Registra proveedor, costo y aumenta inventario.",
      en: "Record supplier and cost, and increase inventory.",
    },
    roles: ["ADMINISTRADOR", "ALMACENISTA"],
  },
  {
    clave: "pedido",
    href: "/pedidos?accion=nuevo",
    icono: PackageCheck,
    titulo: { es: "Crear un pedido", en: "Create an order" },
    descripcion: {
      es: "Selecciona cliente y productos ya registrados.",
      en: "Select a customer and registered products.",
    },
    roles: ["ADMINISTRADOR", "CONTABLE", "VENDEDOR", "COBRADOR"],
  },
  {
    clave: "surtirPedidos",
    href: "/pedidos",
    icono: PackageCheck,
    titulo: { es: "Atender pedidos pendientes", en: "Handle pending orders" },
    descripcion: {
      es: "Asigna proveedor o confirma qué llegó, según tu puesto.",
      en: "Assign suppliers or confirm arrivals, according to your role.",
    },
    roles: ["ADMINISTRADOR", "CONTABLE", "ALMACENISTA"],
  },
  {
    clave: "rutas",
    href: "/rutas?accion=cobrar",
    icono: Route,
    titulo: { es: "Capturar cobranza", en: "Record collections" },
    descripcion: {
      es: "Cobra a clientas de la ruta o fuera de ella y registra la visita.",
      en: "Collect on-route or outside-route payments and record the visit.",
    },
    roles: ["ADMINISTRADOR", "COBRADOR"],
  },
  {
    clave: "corte",
    href: "/cortes",
    icono: WalletCards,
    titulo: { es: "Revisar corte de caja", en: "Review cash closing" },
    descripcion: {
      es: "Compara lo cobrado y firma el cierre del día.",
      en: "Compare collections and sign the daily closing.",
    },
    roles: ["ADMINISTRADOR", "CONTABLE", "COBRADOR"],
  },
  {
    clave: "devolucion",
    href: "/devoluciones",
    icono: RotateCcw,
    titulo: { es: "Procesar devolución", en: "Process a return" },
    descripcion: {
      es: "Busca la venta, autoriza el movimiento y conserva auditoría.",
      en: "Find the sale, authorize the movement, and keep an audit trail.",
    },
    roles: ["ADMINISTRADOR", "CONTABLE", "ALMACENISTA"],
  },
  {
    clave: "reportes",
    href: "/reportes",
    icono: ClipboardList,
    titulo: { es: "Consultar resultados", en: "Review results" },
    descripcion: {
      es: "Ventas, cobranza y balances por periodo.",
      en: "Sales, collections, and balances by period.",
    },
    roles: ["ADMINISTRADOR", "CONTABLE"],
  },
  {
    clave: "alertas",
    href: "/alertas",
    icono: BellRing,
    titulo: { es: "Atender alertas", en: "Review alerts" },
    descripcion: {
      es: "Vencidos, bajo inventario, pedidos y rutas pendientes.",
      en: "Overdue balances, low stock, orders, and pending routes.",
    },
    roles: todosLosRoles,
  },
];

const prioridadPorRol: Record<Rol, readonly ClaveAccionWeb[]> = {
  ADMINISTRADOR: [
    "venta",
    "rutas",
    "surtirPedidos",
    "cliente",
    "producto",
    "alertas",
  ],
  CONTABLE: ["abono", "surtirPedidos", "venta", "corte", "reportes", "alertas"],
  VENDEDOR: ["venta", "cliente", "pedido", "alertas"],
  ALMACENISTA: ["producto", "compra", "surtirPedidos", "devolucion", "alertas"],
  COBRADOR: ["rutas", "pedido", "corte", "alertas"],
};

export function obtenerAccionesWeb(rol: Rol, soloPrincipales = false) {
  const permitidas = accionesWeb.filter((accion) => accion.roles.includes(rol));
  const prioridad = prioridadPorRol[rol];
  const posicion = (clave: ClaveAccionWeb) => {
    const indice = prioridad.indexOf(clave);
    return indice === -1 ? Number.MAX_SAFE_INTEGER : indice;
  };
  const ordenadas = [...permitidas].sort(
    (a, b) => posicion(a.clave) - posicion(b.clave),
  );
  return soloPrincipales ? ordenadas.slice(0, 5) : ordenadas;
}
