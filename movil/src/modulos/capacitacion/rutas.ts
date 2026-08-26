import type { Rol } from "../../tipos";

import { t } from "./lecciones/definirLeccion";
import type { EtapaCapacitacionMovil, RutaCapacitacionMovil } from "./tipos";

const e = (
  id: string,
  tituloEs: string,
  tituloEn: string,
  necesitasEs: string,
  necesitasEn: string,
  resultadoEs: string,
  resultadoEn: string,
  lecciones: string[],
): EtapaCapacitacionMovil => ({
  id,
  titulo: t(tituloEs, tituloEn),
  necesitas: t(necesitasEs, necesitasEn),
  resultado: t(resultadoEs, resultadoEn),
  lecciones,
});

export const rutasCapacitacionMovil: Record<Rol, RutaCapacitacionMovil> = {
  ADMINISTRADOR: {
    titulo: t(
      "Supervisar toda la operación móvil",
      "Supervise all mobile operations",
    ),
    antesDeSalir: [
      t(
        "Usuarios creados con su rol y contraseña personal.",
        "Users created with personal role and password.",
      ),
      t(
        "Productos, clientes, localidades y rutas ya configurados en la web.",
        "Products, customers, locations, and routes already configured on the web.",
      ),
      t(
        "Cada teléfono vinculado al usuario correcto y con hora automática.",
        "Each phone linked to the correct user with automatic time.",
      ),
    ],
    etapas: [
      e(
        "equipo",
        "Preparar cuenta y equipo",
        "Prepare account and device",
        "Cuenta, teléfono y conexión inicial.",
        "Account, phone, and initial connection.",
        "Acceso seguro y trabajo autorizado visible.",
        "Secure access and authorized work visible.",
        ["movil-seguridad", "movil-orientacion", "movil-inventario"],
      ),
      e(
        "campo",
        "Practicar venta y cobranza",
        "Practice sales and collections",
        "Ruta descargada, clientes y productos.",
        "Downloaded route, customers, and products.",
        "Visitas, abonos y ventas correctamente capturados.",
        "Visits, payments, and sales correctly recorded.",
        ["movil-ruta", "movil-abono", "movil-venta-credito"],
      ),
      e(
        "pedidos",
        "Completar el ciclo de pedidos",
        "Complete the order cycle",
        "Cliente, catálogo, proveedores y stock.",
        "Customer, catalog, suppliers, and stock.",
        "Pedido trazable desde captura hasta entrega.",
        "Traceable order from entry to delivery.",
        [
          "movil-pedido-crear",
          "movil-pedido-proveedor",
          "movil-pedido-almacen",
          "movil-pedido-entrega",
        ],
      ),
      e(
        "cierre",
        "Sincronizar antes de cerrar",
        "Synchronize before closing",
        "Conexión estable y folios locales.",
        "Stable connection and local receipts.",
        "Operaciones confirmadas o conflictos visibles.",
        "Confirmed operations or visible conflicts.",
        ["movil-devolucion", "movil-sincronizacion"],
      ),
    ],
  },
  CONTABLE: {
    titulo: t(
      "Operación móvil de Contabilidad",
      "Mobile Accounting operations",
    ),
    antesDeSalir: [
      t(
        "Los proveedores ya deben existir; Contabilidad sólo los asigna.",
        "Suppliers must already exist; Accounting only assigns them.",
      ),
      t(
        "Ten folios, comprobantes y cliente confirmado antes de capturar.",
        "Have receipts, evidence, and confirmed customer before entry.",
      ),
    ],
    etapas: [
      e(
        "acceso",
        "Proteger acceso",
        "Protect access",
        "Cuenta personal y teléfono correcto.",
        "Personal account and correct phone.",
        "Sesión aislada y responsabilidades visibles.",
        "Isolated session and visible responsibilities.",
        ["movil-seguridad", "movil-orientacion"],
      ),
      e(
        "pedidos",
        "Asignar proveedor existente",
        "Assign existing supplier",
        "Pedido pendiente y proveedores creados por Administración o Almacén.",
        "Pending order and suppliers created by Administration or Warehouse.",
        "Pedido listo para recepción de Almacén.",
        "Order ready for Warehouse receipt.",
        ["movil-pedido-crear", "movil-pedido-proveedor"],
      ),
      e(
        "devoluciones",
        "Autorizar devoluciones documentadas",
        "Authorize documented returns",
        "Venta confirmada, motivo, evidencia y caja operadora.",
        "Confirmed sale, reason, evidence, and operating cash desk.",
        "Compensación y reembolso auditables.",
        "Auditable offset and refund.",
        ["movil-devolucion"],
      ),
    ],
  },
  VENDEDOR: {
    titulo: t("Captura móvil de Ventas", "Mobile Sales entry"),
    antesDeSalir: [
      t(
        "Localidades, clientes y productos deben existir en la web.",
        "Locations, customers, and products must exist on the web.",
      ),
      t(
        "Confirma producto y cliente antes de guardar un pedido.",
        "Confirm product and customer before saving an order.",
      ),
    ],
    etapas: [
      e(
        "acceso",
        "Conocer el área de trabajo",
        "Know the workspace",
        "Cuenta personal activa.",
        "Active personal account.",
        "Sólo acciones autorizadas visibles.",
        "Only authorized actions visible.",
        ["movil-seguridad", "movil-orientacion"],
      ),
      e(
        "pedido",
        "Capturar lo que solicita el cliente",
        "Capture the customer request",
        "Cliente y producto ya registrados.",
        "Existing customer and product.",
        "Pedido pendiente sin crear deuda todavía.",
        "Pending order without creating debt yet.",
        ["movil-pedido-crear"],
      ),
    ],
  },
  ALMACENISTA: {
    titulo: t("Preparación móvil de Almacén", "Mobile Warehouse preparation"),
    antesDeSalir: [
      t(
        "Ten producto físico, códigos, costo, precio, mínimo y fotografía.",
        "Have physical product, codes, cost, price, minimum, and photo.",
      ),
      t(
        "Confirma proveedor y cantidades antes de recibir.",
        "Confirm supplier and quantities before receipt.",
      ),
    ],
    etapas: [
      e(
        "catalogo",
        "Crear el catálogo físico",
        "Create the physical catalog",
        "Ficha completa y producto enfrente.",
        "Complete data and product at hand.",
        "Producto identificable con fotografía.",
        "Identifiable product with photo.",
        ["movil-seguridad", "movil-orientacion", "movil-inventario"],
      ),
      e(
        "surtido",
        "Asignar, recibir y preparar",
        "Assign, receive, and prepare",
        "Pedido pendiente, proveedor y mercancía física.",
        "Pending order, supplier, and physical goods.",
        "Pedido listo para entregar sin crear venta.",
        "Order ready for delivery without creating a sale.",
        ["movil-pedido-proveedor", "movil-pedido-almacen"],
      ),
      e(
        "devoluciones",
        "Revisar devoluciones recibidas",
        "Inspect received returns",
        "Mercancía física y devolución ya autorizada.",
        "Physical goods and an already authorized return.",
        "Entrada de inventario verificada sin operar caja.",
        "Inventory receipt verified without operating cash.",
        ["movil-devolucion-almacen"],
      ),
    ],
  },
  COBRADOR: {
    titulo: t(
      "Jornada de cobranza, de inicio a cierre",
      "Collections day from start to finish",
    ),
    antesDeSalir: [
      t(
        "Ruta asignada con localidades, clientes y pendientes de entrega.",
        "Assigned route with locations, customers, and pending deliveries.",
      ),
      t(
        "Teléfono con batería, hora automática y sesión personal.",
        "Phone with battery, automatic time, and personal session.",
      ),
      t(
        "Con internet: descarga la jornada y confirma que no haya pendientes de ayer.",
        "While online: download the workday and confirm no pending work from yesterday.",
      ),
    ],
    etapas: [
      e(
        "preparar",
        "Antes de salir",
        "Before leaving",
        "Cuenta propia, ruta asignada e internet inicial.",
        "Own account, assigned route, and initial internet.",
        "Jornada descargada con clientes autorizados.",
        "Downloaded workday with authorized customers.",
        ["movil-seguridad", "movil-orientacion", "movil-ruta"],
      ),
      e(
        "visitar",
        "Durante cada visita",
        "During each visit",
        "Identidad, saldo, producto y método de pago confirmados.",
        "Confirmed identity, balance, product, and payment method.",
        "Visita, abono, venta o pedido con folio local.",
        "Visit, payment, sale, or order with local receipt.",
        [
          "movil-abono",
          "movil-venta-credito",
          "movil-pedido-crear",
          "movil-pedido-entrega",
        ],
      ),
      e(
        "cerrar",
        "Al regresar con señal",
        "After returning online",
        "Folios locales, comprobantes y conexión estable.",
        "Local receipts, evidence, and stable connection.",
        "Todos los movimientos confirmados o conflictos atendidos.",
        "All movements confirmed or conflicts addressed.",
        ["movil-sincronizacion"],
      ),
    ],
  },
};

export function rutaCapacitacionMovilParaRol(rol: Rol) {
  return rutasCapacitacionMovil[rol];
}

export function contextoLeccionMovil(rol: Rol, leccionId: string) {
  const ruta = rutaCapacitacionMovilParaRol(rol);
  for (
    let indiceEtapa = 0;
    indiceEtapa < ruta.etapas.length;
    indiceEtapa += 1
  ) {
    const etapa = ruta.etapas[indiceEtapa]!;
    const indiceLeccion = etapa.lecciones.indexOf(leccionId);
    if (indiceLeccion >= 0) return { ruta, etapa, indiceEtapa, indiceLeccion };
  }
  return null;
}
