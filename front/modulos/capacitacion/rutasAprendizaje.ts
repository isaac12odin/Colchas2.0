import type { Rol } from "@/lib/tipos";
import type { TextoCapacitacion } from "./tipos";

const t = (es: string, en: string): TextoCapacitacion => ({ es, en });

export interface EtapaAprendizaje {
  id: string;
  titulo: TextoCapacitacion;
  descripcion: TextoCapacitacion;
  necesitas: TextoCapacitacion;
  dejarasListo: TextoCapacitacion;
  lecciones: readonly string[];
}

export interface RutaAprendizaje {
  rol: Rol;
  titulo: TextoCapacitacion;
  descripcion: TextoCapacitacion;
  antesDeEmpezar: readonly TextoCapacitacion[];
  etapas: readonly EtapaAprendizaje[];
}

const etapa = (
  id: string,
  tituloEs: string,
  tituloEn: string,
  descripcionEs: string,
  descripcionEn: string,
  necesitasEs: string,
  necesitasEn: string,
  dejarasListoEs: string,
  dejarasListoEn: string,
  lecciones: string[],
): EtapaAprendizaje => ({
  id,
  titulo: t(tituloEs, tituloEn),
  descripcion: t(descripcionEs, descripcionEn),
  necesitas: t(necesitasEs, necesitasEn),
  dejarasListo: t(dejarasListoEs, dejarasListoEn),
  lecciones,
});

/**
 * Orden operativo, no sólo una colección de pantallas. Las dependencias de
 * cada etapa explican qué debe existir antes de capturar el siguiente dato.
 */
export const rutasAprendizaje: Record<Rol, RutaAprendizaje> = {
  ADMINISTRADOR: {
    rol: "ADMINISTRADOR",
    titulo: t(
      "Puesta en marcha completa del negocio",
      "Complete business setup",
    ),
    descripcion: t(
      "Sigue este orden la primera vez. Primero protege el acceso, después crea catálogos, carga la operación y sólo entonces comienza a vender y cobrar.",
      "Follow this order the first time. Secure access, create catalogs, load operations, and only then begin selling and collecting.",
    ),
    antesDeEmpezar: [
      t(
        "Lista del personal y qué hará cada persona: administrar, vender, llevar almacén, cobrar o contabilizar.",
        "Staff list and each person's responsibility: administration, sales, warehouse, collections, or accounting.",
      ),
      t(
        "Lista de localidades, estado, días de cobranza y quién atenderá cada zona.",
        "Locations, state, collection days, and the person assigned to each area.",
      ),
      t(
        "Proveedores y productos con códigos, costo, precio, existencia inicial, mínimo y fotografía.",
        "Suppliers and products with codes, cost, price, opening stock, minimum, and photo.",
      ),
      t(
        "Clientes con teléfono, dirección, localidad, tarjeta si tiene saldo, deuda inicial y forma de pago acordada.",
        "Customers with phone, address, location, card when carrying balance, opening debt, and agreed payment plan.",
      ),
    ],
    etapas: [
      etapa(
        "seguridad",
        "Protege el acceso y reparte responsabilidades",
        "Secure access and assign responsibilities",
        "Crea cuentas personales antes de entregar el sistema al equipo.",
        "Create personal accounts before giving the system to the team.",
        "Correo seguro del administrador y lista definitiva del personal.",
        "Secure administrator email and final staff list.",
        "Usuarios con el rol mínimo necesario, contraseña final y MFA administrativo.",
        "Users with least privilege, final passwords, and administrator MFA.",
        ["orientacion-inicio", "seguridad-usuarios"],
      ),
      etapa(
        "catalogos",
        "Crea los catálogos base",
        "Create base catalogs",
        "Nada debe capturarse como texto improvisado: primero localidades, proveedores y productos.",
        "Nothing should be improvised free text: locations, suppliers, and products come first.",
        "Localidades, contactos de proveedores y ficha comercial de cada producto.",
        "Locations, supplier contacts, and each product's commercial data.",
        "Localidades buscables, proveedores activos y productos identificables con foto y precios.",
        "Searchable locations, active suppliers, and identifiable products with photos and prices.",
        [
          "configuracion-localidades",
          "compras-proveedores",
          "inventario-producto",
        ],
      ),
      etapa(
        "carga-inicial",
        "Carga clientes, saldos, inventario y rutas",
        "Load customers, balances, stock, and routes",
        "Elige captura manual para pocos datos o importación Excel para iniciar con volumen.",
        "Choose manual entry for a few records or Excel import for a larger opening load.",
        "Catálogos base terminados y datos iniciales revisados sin duplicados.",
        "Completed base catalogs and reviewed opening data without duplicates.",
        "Clientes localizables, stock real y rutas multilocalidad asignadas a un cobrador.",
        "Searchable customers, real stock, and multi-location routes assigned to a collector.",
        [
          "importacion-inicial",
          "clientes-alta",
          "clientes-expediente",
          "clientes-edicion",
          "compras-proveedor",
          "rutas-configuracion",
        ],
      ),
      etapa(
        "operacion",
        "Empieza a vender, pedir y cobrar",
        "Begin selling, ordering, and collecting",
        "Practica el ciclo completo una vez antes de operar con clientes reales.",
        "Practice the complete cycle once before operating with real customers.",
        "Productos con stock, clientes activos y responsables capacitados.",
        "Products with stock, active customers, and trained operators.",
        "Ventas correctas de contado/crédito, pedidos trazables y abonos aplicados al saldo.",
        "Correct cash/credit sales, traceable orders, and payments applied to balance.",
        [
          "ventas-contado-credito",
          "pedido-crear",
          "pedido-asignar-proveedor",
          "pedido-recibir-preparar",
          "pedido-entregar",
          "cobranza-abono",
          "rutas-jornada",
          "movil-offline",
        ],
      ),
      etapa(
        "control",
        "Cierra, revisa y corrige sin borrar",
        "Close, review, and correct without deleting",
        "Completa el ciclo diario con caja, alertas, devoluciones y reportes.",
        "Complete the daily cycle with cash closing, alerts, returns, and reports.",
        "Operaciones del día sincronizadas y comprobantes disponibles.",
        "Daily operations synchronized and supporting evidence available.",
        "Caja cuadrada, incidencias auditadas y balances listos para decisión.",
        "Balanced cash, audited incidents, and decision-ready reports.",
        [
          "cortes-liquidacion",
          "devoluciones-seguras",
          "alertas-priorizar",
          "reportes-balance",
          "configuracion-operacion",
        ],
      ),
    ],
  },
  CONTABLE: {
    rol: "CONTABLE",
    titulo: t("Ruta de Contabilidad", "Accounting path"),
    descripcion: t(
      "Aprende a mantener cartera, ventas, abonos, pedidos y cierres sin modificar catálogos operativos restringidos.",
      "Learn to maintain receivables, sales, payments, orders, and closings without changing restricted operational catalogs.",
    ),
    antesDeEmpezar: [
      t(
        "Administración ya creó localidades, productos y cuentas de usuario.",
        "Administration has already created locations, products, and user accounts.",
      ),
      t(
        "Dispón de saldos comprobados, formas de pago y evidencia de cada ajuste.",
        "Have verified balances, payment methods, and evidence for every adjustment.",
      ),
      t(
        "Los proveedores deben existir; Contabilidad puede asignarlos, pero no dar de alta uno nuevo.",
        "Suppliers must exist; Accounting may assign them but cannot create new ones.",
      ),
    ],
    etapas: [
      etapa(
        "cartera",
        "Conoce y prepara la cartera",
        "Understand and prepare receivables",
        "Primero confirma identidad, saldo y localidad; después captura o corrige.",
        "Confirm identity, balance, and location before entering or correcting data.",
        "Localidades creadas y documentos del cliente a la mano.",
        "Created locations and customer documents at hand.",
        "Expedientes completos y cartera lista para operar.",
        "Complete records and receivables ready to operate.",
        [
          "orientacion-inicio",
          "clientes-expediente",
          "clientes-alta",
          "clientes-edicion",
        ],
      ),
      etapa(
        "movimientos",
        "Registra ventas y cobros",
        "Record sales and collections",
        "Distingue caja, anticipo y deuda antes de confirmar.",
        "Distinguish cash, deposit, and debt before confirming.",
        "Cliente identificado, producto registrado y comprobante del pago.",
        "Identified customer, registered product, and payment evidence.",
        "Saldo consistente con ventas a crédito y abonos.",
        "Balance consistent with credit sales and payments.",
        ["ventas-contado-credito", "cobranza-abono"],
      ),
      etapa(
        "pedidos",
        "Da seguimiento financiero a pedidos",
        "Track orders financially",
        "Captura el pedido y asigna únicamente proveedores ya registrados.",
        "Capture the order and assign only existing suppliers.",
        "Cliente, producto y proveedores activos.",
        "Active customer, product, and suppliers.",
        "Pedido trazable listo para que Almacén lo reciba.",
        "Traceable order ready for Warehouse receipt.",
        ["pedido-crear", "pedido-asignar-proveedor"],
      ),
      etapa(
        "cierre",
        "Revisa caja, incidencias y balances",
        "Review cash, incidents, and reports",
        "Cierra sólo después de que el trabajo de campo esté sincronizado.",
        "Close only after field work is synchronized.",
        "Comprobantes, operaciones sincronizadas y autorización de ajustes.",
        "Receipts, synchronized operations, and adjustment authorization.",
        "Cortes explicados, devoluciones auditadas y reportes exportables.",
        "Explained closings, audited returns, and exportable reports.",
        [
          "cortes-liquidacion",
          "devoluciones-seguras",
          "alertas-priorizar",
          "reportes-balance",
        ],
      ),
    ],
  },
  VENDEDOR: {
    rol: "VENDEDOR",
    titulo: t("Ruta de Ventas", "Sales path"),
    descripcion: t(
      "Aprende a identificar al cliente, capturarlo correctamente y elegir entre venta inmediata o pedido.",
      "Learn to identify the customer, create the record correctly, and choose an immediate sale or an order.",
    ),
    antesDeEmpezar: [
      t(
        "Administración debe crear localidades y Almacén debe registrar productos, precios y existencia.",
        "Administration must create locations and Warehouse must register products, prices, and stock.",
      ),
      t(
        "Ten teléfono, dirección y localidad del cliente; la tarjeta se captura manualmente sólo cuando corresponda saldo.",
        "Have customer phone, address, and location; card number is entered manually only when balance applies.",
      ),
    ],
    etapas: [
      etapa(
        "cliente",
        "Busca antes de crear",
        "Search before creating",
        "Evita duplicados y confirma los datos básicos.",
        "Avoid duplicates and confirm basic information.",
        "Teléfono, dirección y localidad del cliente.",
        "Customer phone, address, and location.",
        "Expediente único, completo y actual.",
        "One complete and current customer record.",
        [
          "orientacion-inicio",
          "clientes-expediente",
          "clientes-alta",
          "clientes-edicion",
        ],
      ),
      etapa(
        "venta",
        "Vende con el efecto correcto",
        "Sell with the correct effect",
        "Primero confirma stock; después elige contado o crédito.",
        "Confirm stock before choosing cash or credit.",
        "Cliente activo y producto con precio y existencia.",
        "Active customer and product with price and stock.",
        "Venta que descuenta inventario y sólo crea la deuda financiada.",
        "Sale that deducts stock and creates only financed debt.",
        ["ventas-contado-credito"],
      ),
      etapa(
        "pedido",
        "Captura lo que todavía no puedes entregar",
        "Capture what cannot yet be delivered",
        "Un pedido no es venta y todavía no aumenta saldo.",
        "An order is not a sale and does not yet increase balance.",
        "Cliente y producto ya registrados.",
        "Existing customer and product.",
        "Solicitud lista para asignación de proveedor por el rol autorizado.",
        "Request ready for supplier assignment by an authorized role.",
        ["pedido-crear", "alertas-priorizar"],
      ),
    ],
  },
  ALMACENISTA: {
    rol: "ALMACENISTA",
    titulo: t("Ruta de Almacén", "Warehouse path"),
    descripcion: t(
      "Primero construye el catálogo físico, después registra entradas y finalmente prepara pedidos y devoluciones.",
      "Build the physical catalog, record receipts, and then prepare orders and returns.",
    ),
    antesDeEmpezar: [
      t(
        "Ten fichas de proveedores, facturas y costos reales.",
        "Have supplier records, invoices, and actual costs.",
      ),
      t(
        "Cada producto necesita nombre, marca, código, costo, precio, existencia mínima y fotografía.",
        "Each product needs name, brand, code, cost, price, minimum stock, and photo.",
      ),
      t(
        "No recibas un pedido sin comparar físicamente producto y cantidad.",
        "Never receive an order without physically comparing product and quantity.",
      ),
    ],
    etapas: [
      etapa(
        "catalogo",
        "Crea proveedores y productos",
        "Create suppliers and products",
        "Busca primero para no duplicar catálogos.",
        "Search first to avoid duplicate catalogs.",
        "Datos fiscales/contacto y ficha completa del producto.",
        "Tax/contact data and complete product information.",
        "Catálogo visual listo para compra, pedido y venta.",
        "Visual catalog ready for purchase, order, and sale.",
        ["orientacion-inicio", "compras-proveedores", "inventario-producto"],
      ),
      etapa(
        "existencias",
        "Registra la entrada real",
        "Record the actual receipt",
        "La existencia aumenta por compra confirmada, no por editar un número sin evidencia.",
        "Stock increases through a confirmed purchase, not an unsupported manual number.",
        "Proveedor, factura, productos, costos y cantidades verificadas.",
        "Verified supplier, invoice, products, costs, and quantities.",
        "Stock e historial de costo actualizados.",
        "Updated stock and cost history.",
        ["compras-proveedor"],
      ),
      etapa(
        "surtido",
        "Pide, recibe y prepara",
        "Order, receive, and prepare",
        "El proveedor se asigna antes de recibir y nunca durante la entrega al cliente.",
        "Supplier is assigned before receipt and never during customer delivery.",
        "Pedido pendiente, proveedores activos y mercancía física.",
        "Pending order, active suppliers, and physical goods.",
        "Pedido listo para el cobrador sin crear todavía venta o saldo.",
        "Order ready for the collector without creating a sale or balance yet.",
        ["pedido-asignar-proveedor", "pedido-recibir-preparar"],
      ),
      etapa(
        "incidencias",
        "Atiende devoluciones y alertas",
        "Handle returns and alerts",
        "Todo ajuste necesita movimiento, evidencia y autorización.",
        "Every adjustment needs a movement, evidence, and authorization.",
        "Venta original, mercancía devuelta y fotografía.",
        "Original sale, returned goods, and photo.",
        "Inventario compensado sin borrar el historial.",
        "Compensated stock without deleting history.",
        ["devolucion-revisar-almacen", "alertas-priorizar"],
      ),
    ],
  },
  COBRADOR: {
    rol: "COBRADOR",
    titulo: t("Ruta diaria de Cobranza", "Daily Collections path"),
    descripcion: t(
      "Prepara el teléfono con señal, trabaja la jornada incluso offline, sincroniza y sólo entonces liquida caja.",
      "Prepare the phone online, work the day even offline, synchronize, and only then close cash.",
    ),
    antesDeEmpezar: [
      t(
        "Administración debe asignarte una ruta con una o varias localidades y clientes con saldo o entrega pendiente.",
        "Administration must assign a route with one or more locations and customers with balance or pending delivery.",
      ),
      t(
        "Inicia sesión con tu propia cuenta y descarga la jornada mientras tengas internet.",
        "Sign in with your own account and download the workday while online.",
      ),
      t(
        "Confirma batería, hora del equipo, efectivo inicial y que no existan movimientos pendientes de ayer.",
        "Confirm battery, device time, opening cash, and no pending operations from yesterday.",
      ),
    ],
    etapas: [
      etapa(
        "preparacion",
        "Prepara la jornada antes de salir",
        "Prepare the workday before leaving",
        "No salgas hasta ver ruta, clientes y estado de sincronización.",
        "Do not leave until route, customers, and sync status are visible.",
        "Cuenta personal, teléfono vinculado, ruta asignada y conexión inicial.",
        "Personal account, linked phone, assigned route, and initial connectivity.",
        "Jornada descargada y clientes autorizados disponibles.",
        "Downloaded workday and authorized customers available.",
        ["orientacion-inicio", "clientes-expediente", "rutas-jornada"],
      ),
      etapa(
        "visita",
        "Cobra y registra el resultado",
        "Collect and record the result",
        "Confirma identidad antes de dinero, venta o entrega.",
        "Confirm identity before payment, sale, or delivery.",
        "Cliente, saldo y método de pago confirmados.",
        "Confirmed customer, balance, and payment method.",
        "Abono o visita sin pago con folio e historial.",
        "Payment or no-payment visit with receipt and history.",
        ["cobranza-abono", "pedido-crear", "pedido-entregar"],
      ),
      etapa(
        "offline",
        "Trabaja sin señal sin duplicar",
        "Work offline without duplicates",
        "Conserva cada folio local hasta recibir confirmación del servidor.",
        "Keep each local receipt until server confirmation.",
        "Jornada descargada y usuario correcto en el dispositivo.",
        "Downloaded workday and correct user on the device.",
        "Abonos, ventas, entregas y visitas cifrados y pendientes de sincronizar.",
        "Encrypted payments, sales, deliveries, and visits pending sync.",
        ["movil-offline"],
      ),
      etapa(
        "cierre",
        "Sincroniza y liquida el día",
        "Synchronize and settle the day",
        "El corte se firma después de confirmar todos los pendientes.",
        "Cash closing is signed after all pending work is confirmed.",
        "Conexión estable, comprobantes y efectivo contado.",
        "Stable connection, receipts, and counted cash.",
        "Ruta terminada, caja explicada y diferencias visibles.",
        "Finished route, explained cash, and visible differences.",
        ["cortes-liquidacion", "alertas-priorizar"],
      ),
    ],
  },
};

export function rutaAprendizajeParaRol(rol: Rol) {
  return rutasAprendizaje[rol];
}

export function contextoDeLeccion(rol: Rol, leccionId: string) {
  const ruta = rutaAprendizajeParaRol(rol);
  for (
    let indiceEtapa = 0;
    indiceEtapa < ruta.etapas.length;
    indiceEtapa += 1
  ) {
    const etapaActual = ruta.etapas[indiceEtapa]!;
    const indiceLeccion = etapaActual.lecciones.indexOf(leccionId);
    if (indiceLeccion >= 0)
      return { ruta, etapa: etapaActual, indiceEtapa, indiceLeccion };
  }
  return null;
}
