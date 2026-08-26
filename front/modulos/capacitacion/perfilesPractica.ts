import type { CapturaPasoPractica } from "./progreso";

export type Idioma = "es" | "en";
type TipoControl = "BUSQUEDA" | "CAPTURA" | "ARCHIVO" | "VERIFICACION";

interface PerfilPantalla {
  titulo: string;
  registro: string;
  campoPrimario: string;
  ejemploPrimario: string;
  campoSecundario: string;
  ejemploSecundario: string;
  resumen: Array<[string, string]>;
}

export const capturaVacia: CapturaPasoPractica = {
  primario: "",
  secundario: "",
  archivo: "",
  verificado: false,
};

export function perfilPantalla(
  pantalla: string,
  idioma: Idioma,
): PerfilPantalla {
  const es = idioma === "es";
  const perfiles: Record<string, PerfilPantalla> = {
    inicio: {
      titulo: es ? "Inicio operativo" : "Operations home",
      registro: es ? "Pendiente prioritario" : "Priority item",
      campoPrimario: es ? "Buscar tarea" : "Find task",
      ejemploPrimario: es ? "Cobranza pendiente" : "Pending collection",
      campoSecundario: es ? "Acción rápida" : "Quick action",
      ejemploSecundario: es ? "Revisar cartera" : "Review receivables",
      resumen: [
        [es ? "Alertas" : "Alerts", "2"],
        [es ? "Prioridad" : "Priority", es ? "Alta" : "High"],
      ],
    },
    clientes: {
      titulo: es ? "Expediente de clienta" : "Customer record",
      registro: "María López · tarjeta 0042",
      campoPrimario: es ? "Nombre, teléfono o tarjeta" : "Name, phone, or card",
      ejemploPrimario: "222 555 0101",
      campoSecundario: es
        ? "Dato que vas a registrar"
        : "Information to record",
      ejemploSecundario: es ? "Centro · saldo $850" : "Downtown · balance $850",
      resumen: [
        [es ? "Saldo" : "Balance", "$850.00"],
        [es ? "Próximo pago" : "Next payment", "$200.00"],
      ],
    },
    configuracion: {
      titulo: es ? "Configuración del negocio" : "Business settings",
      registro: es ? "Localidad Centro · Puebla" : "Downtown · Puebla",
      campoPrimario: es ? "Nombre de localidad" : "Location name",
      ejemploPrimario: "Centro",
      campoSecundario: es ? "Estado" : "State",
      ejemploSecundario: "Puebla",
      resumen: [
        [es ? "Estado" : "Status", es ? "Activa" : "Active"],
        [
          es ? "Uso" : "Usage",
          es ? "Clientes y rutas" : "Customers and routes",
        ],
      ],
    },
    inventario: {
      titulo: es ? "Catálogo de inventario" : "Inventory catalog",
      registro: "Colcha Viena azul · COL-001",
      campoPrimario: es ? "Código o producto" : "Code or product",
      ejemploPrimario: "COL-001",
      campoSecundario: es ? "Marca y precio" : "Brand and price",
      ejemploSecundario: "Vektra Hogar · $1,200",
      resumen: [
        [es ? "Existencia" : "Stock", "3"],
        [es ? "Costo" : "Cost", "$650.00"],
      ],
    },
    compras: {
      titulo: es ? "Compras y proveedores" : "Purchases and suppliers",
      registro: "Textiles del Centro · FAC-1042",
      campoPrimario: es ? "Proveedor o folio" : "Supplier or invoice",
      ejemploPrimario: "Textiles del Centro",
      campoSecundario: es
        ? "Producto, cantidad y costo"
        : "Product, quantity, and cost",
      ejemploSecundario: "Colcha Viena · 5 · $650",
      resumen: [
        [es ? "Entrada" : "Receipt", "5 piezas"],
        [es ? "Total" : "Total", "$3,250.00"],
      ],
    },
    pedidos: {
      titulo: es ? "Seguimiento de pedido" : "Order tracking",
      registro: "PED-1042 · María López",
      campoPrimario: es
        ? "Cliente, folio o producto"
        : "Customer, order, or product",
      ejemploPrimario: "PED-1042",
      campoSecundario: es ? "Producto y responsable" : "Product and owner",
      ejemploSecundario: es
        ? "Colcha Viena · Proveedor Centro"
        : "Viena quilt · Central Supplier",
      resumen: [
        [
          es ? "Estado" : "Status",
          es ? "Listo para entrega" : "Ready for delivery",
        ],
        [es ? "Cantidad" : "Quantity", "1"],
      ],
    },
    rutas: {
      titulo: es ? "Ruta de cobranza" : "Collection route",
      registro: es ? "Ruta Centro · martes" : "Downtown route · Tuesday",
      campoPrimario: es ? "Localidad y cobrador" : "Location and collector",
      ejemploPrimario: es
        ? "Centro · Ana Cobradora"
        : "Downtown · Ana Collector",
      campoSecundario: es
        ? "Clienta con saldo y orden"
        : "Customer with balance and order",
      ejemploSecundario: "1. María $850 · 2. Rosa $420",
      resumen: [
        [es ? "Con saldo" : "With balance", "2"],
        [es ? "Orden" : "Order", es ? "Definido manualmente" : "Manually set"],
      ],
    },
    cortes: {
      titulo: es ? "Corte de caja" : "Cash closing",
      registro: es ? "Ana Cobradora · hoy" : "Ana Collector · today",
      campoPrimario: es ? "Operador y fecha" : "Operator and date",
      ejemploPrimario: es ? "Ana Cobradora · hoy" : "Ana Collector · today",
      campoSecundario: es ? "Efectivo entregado" : "Cash handed in",
      ejemploSecundario: "1250",
      resumen: [
        [es ? "Sistema" : "System", "$1,250.00"],
        [es ? "Diferencia" : "Difference", "$0.00"],
      ],
    },
    devoluciones: {
      titulo: es ? "Devolución auditada" : "Audited return",
      registro: "V-1042 · Colcha Viena",
      campoPrimario: es ? "Venta o folio" : "Sale or receipt",
      ejemploPrimario: "V-1042",
      campoSecundario: es ? "Motivo y cantidad" : "Reason and quantity",
      ejemploSecundario: es ? "Costura abierta · 1" : "Open seam · 1",
      resumen: [
        [es ? "Saldo a compensar" : "Balance adjustment", "$550.00"],
        [es ? "Inventario" : "Inventory", "+1"],
      ],
    },
    alertas: {
      titulo: es ? "Centro de alertas" : "Alert center",
      registro: es ? "Ruta incompleta" : "Incomplete route",
      campoPrimario: es ? "Tipo o responsable" : "Type or owner",
      ejemploPrimario: es ? "Ruta incompleta" : "Incomplete route",
      campoSecundario: es ? "Acción correctiva" : "Corrective action",
      ejemploSecundario: es
        ? "Revisar visitas pendientes"
        : "Review pending visits",
      resumen: [
        [es ? "Severidad" : "Severity", es ? "Alta" : "High"],
        [es ? "Estado" : "Status", es ? "Pendiente" : "Pending"],
      ],
    },
    reportes: {
      titulo: es ? "Reportes del periodo" : "Period reports",
      registro: es ? "Cartera del mes" : "Monthly receivables",
      campoPrimario: es ? "Periodo" : "Period",
      ejemploPrimario: "2026-08",
      campoSecundario: es ? "Vista o agrupación" : "View or grouping",
      ejemploSecundario: es ? "Saldo por localidad" : "Balance by location",
      resumen: [
        [es ? "Saldo" : "Balance", "$18,420.00"],
        [es ? "Vencido" : "Overdue", "$2,100.00"],
      ],
    },
    usuarios: {
      titulo: es ? "Usuarios y acceso" : "Users and access",
      registro: "cobranza@nexo.local · COBRADOR",
      campoPrimario: es ? "Correo y nombre" : "Email and name",
      ejemploPrimario: "cobranza@nexo.local",
      campoSecundario: es ? "Rol mínimo necesario" : "Least-privilege role",
      ejemploSecundario: "COBRADOR",
      resumen: [
        ["MFA", es ? "Pendiente de activar" : "Pending activation"],
        [es ? "Contraseña" : "Password", es ? "Temporal" : "Temporary"],
      ],
    },
    sincronizacion: {
      titulo: es ? "Operaciones sin conexión" : "Offline operations",
      registro: es ? "3 operaciones pendientes" : "3 pending operations",
      campoPrimario: es ? "Folio u operación" : "Receipt or operation",
      ejemploPrimario: "MOV-1042",
      campoSecundario: es ? "Decisión de corrección" : "Correction decision",
      ejemploSecundario: es
        ? "Conservar y enviar a revisión"
        : "Keep and send for review",
      resumen: [
        [es ? "Integridad" : "Integrity", es ? "Válida" : "Valid"],
        [es ? "Estado" : "Status", es ? "Pendiente" : "Pending"],
      ],
    },
  };
  return (
    perfiles[pantalla] ?? {
      titulo: es ? "Operación de práctica" : "Practice operation",
      registro: es ? "Registro de ejemplo" : "Sample record",
      campoPrimario: es ? "Dato principal" : "Primary value",
      ejemploPrimario: es ? "Dato verificado" : "Verified value",
      campoSecundario: es ? "Dato complementario" : "Additional value",
      ejemploSecundario: es ? "Captura de práctica" : "Practice entry",
      resumen: [[es ? "Estado" : "Status", es ? "Listo" : "Ready"]],
    }
  );
}

export function tipoControl(accion: string): TipoControl {
  if (/buscar|escribir|find|search|enter it/i.test(accion)) return "BUSQUEDA";
  if (
    /foto|fotograf|archivo|excel|descargar|subir|adjuntar|photo|file|download|upload|attach/i.test(
      accion,
    )
  )
    return "ARCHIVO";
  if (
    /capturar|agregar|asignar|elegir|seleccionar|preguntar|generar|enter |add |assign|choose|select|ask|generate/i.test(
      accion,
    )
  )
    return "CAPTURA";
  return "VERIFICACION";
}
