import type { ClienteJornada, PedidoMovil } from "../../../tipos";
import type { ProductoInventarioMovil } from "../../inventario/tipos";
import { fechaSugeridaEntregaPractica } from "../simuladores/dominio";

export type IdiomaReplica = "es" | "en";

export type ControlPractica =
  | "INICIO_ESTADO"
  | "INICIO_RUTA"
  | "INICIO_SINCRONIZAR"
  | "RUTA_ABRIR"
  | "RUTA_CLIENTE"
  | "RUTA_NO_PAGO"
  | "INVENTARIO_FOLIO"
  | "INVENTARIO_BUSCAR"
  | "INVENTARIO_NUEVO"
  | "INVENTARIO_ESCANEAR"
  | "INVENTARIO_EXISTENCIA"
  | "PEDIDO_CLIENTE"
  | "PEDIDO_PRODUCTO"
  | "PEDIDO_GUARDAR"
  | "PEDIDO_ASIGNAR"
  | "PEDIDO_ELEGIR_PROVEEDOR"
  | "PEDIDO_CONFIRMAR_PROVEEDOR"
  | "PEDIDO_COMPARAR"
  | "PEDIDO_RECIBIR"
  | "PEDIDO_LISTO"
  | "PERFIL_CONTRASENA"
  | "PERFIL_CERRAR_SESION"
  | "PERFIL_REVOCAR"
  | "DESCONOCIDO";

export const clientePractica: ClienteJornada = {
  id: "cliente-practica",
  nombreCompleto: "Ana López",
  numeroTarjeta: "0042",
  telefono: "555 010 2244",
  direccion: "Av. Reforma 118",
  localidad: { id: "localidad-practica", nombre: "Centro", estado: "Puebla" },
  orden: 2,
  saldo: { saldoActual: "800" },
  visita: null,
  pedidos: [],
  ventas: [],
  abonos: [],
  evaluacionesRiesgo: [{ nivel: "MEDIO", puntuacion: 48 }],
  estadoCuenta: {
    saldoTotal: 800,
    abonoPeriodico: 200,
    vencido: 200,
    venceHoy: 0,
    cobrarHoy: 200,
    proximoVencimiento: null,
    cuotasVencidas: 1,
  },
};

export const productoPractica: ProductoInventarioMovil = {
  id: "producto-practica",
  sku: "COL-VIE-AZ",
  nombre: "Colcha Viena azul",
  marca: "Vektra Hogar",
  categoria: "Colchas",
  categoriaId: "categoria-practica",
  codigoBarras: "750100000042",
  codigoQr: null,
  existencia: 3,
  existenciaMinima: 2,
  precioVenta: "1200",
  precioCompra: "720",
  tieneFoto: false,
  fotoActualizadaEn: null,
};

export function normalizarReplica(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function identificarControl(
  pantalla: string,
  accion: string,
): ControlPractica {
  const texto = normalizarReplica(accion);
  if (pantalla === "inicio") {
    if (texto.includes("rol") || texto.includes("role")) return "INICIO_ESTADO";
    if (texto.includes("sincron") || texto.includes("synchron"))
      return "INICIO_SINCRONIZAR";
    return "INICIO_RUTA";
  }
  if (pantalla === "rutas") {
    if (
      texto.includes("abrir la ruta") ||
      texto.includes("open the assigned route")
    )
      return "RUTA_ABRIR";
    if (texto.includes("confirmar nombre") || texto.includes("confirm name"))
      return "RUTA_CLIENTE";
    return "RUTA_NO_PAGO";
  }
  if (pantalla === "inventario") {
    if (texto.includes("folio") || texto.includes("receipt"))
      return "INVENTARIO_FOLIO";
    if (
      texto.includes("buscar") ||
      texto.includes("search") ||
      texto.includes("find")
    )
      return "INVENTARIO_BUSCAR";
    if (texto.includes("nuevo") || texto.includes("tap new"))
      return "INVENTARIO_NUEVO";
    if (texto.includes("escanear") || texto.includes("scan"))
      return "INVENTARIO_ESCANEAR";
    if (texto.includes("existencia") || texto.includes("stock"))
      return "INVENTARIO_EXISTENCIA";
  }
  if (pantalla === "pedidos") {
    if (
      texto.includes("elegir cliente") ||
      texto.includes("select the customer")
    )
      return "PEDIDO_CLIENTE";
    if (
      texto.includes("buscar un producto") ||
      texto.includes("search for a registered")
    )
      return "PEDIDO_PRODUCTO";
    if (texto.includes("guardar pedido") || texto.includes("save pending"))
      return "PEDIDO_GUARDAR";
    if (texto.includes("abrir asignar") || texto.includes("open assign"))
      return "PEDIDO_ASIGNAR";
    if (
      texto.includes("elegir proveedor") ||
      texto.includes("choose a supplier")
    )
      return "PEDIDO_ELEGIR_PROVEEDOR";
    if (
      texto.includes("confirmar pedido") ||
      texto.includes("confirm supplier")
    )
      return "PEDIDO_CONFIRMAR_PROVEEDOR";
    if (texto.includes("comparar") || texto.includes("compare"))
      return "PEDIDO_COMPARAR";
    if (texto.includes("recibido") || texto.includes("received"))
      return "PEDIDO_RECIBIR";
    if (texto.includes("listo") || texto.includes("ready"))
      return "PEDIDO_LISTO";
  }
  if (pantalla === "perfil") {
    if (texto.includes("contrasena") || texto.includes("password"))
      return "PERFIL_CONTRASENA";
    if (texto.includes("cerrar sesion") || texto.includes("sign out"))
      return "PERFIL_CERRAR_SESION";
    if (texto.includes("revocar") || texto.includes("revoke"))
      return "PERFIL_REVOCAR";
  }
  return "DESCONOCIDO";
}

export function estadoPedidoParaControl(control: ControlPractica) {
  if (
    [
      "PEDIDO_ASIGNAR",
      "PEDIDO_ELEGIR_PROVEEDOR",
      "PEDIDO_CONFIRMAR_PROVEEDOR",
    ].includes(control)
  )
    return "PENDIENTE_PEDIR";
  if (control === "PEDIDO_COMPARAR" || control === "PEDIDO_RECIBIR")
    return "PEDIDO_PROVEEDOR";
  return "RECIBIDO_ALMACEN";
}

export function pedidoPractica(estado: string): PedidoMovil {
  return {
    id: "pedido-practica",
    folio: "PED-1042",
    estado,
    fechaCompromiso: fechaSugeridaEntregaPractica(14),
    clienteId: clientePractica.id,
    cliente: {
      id: clientePractica.id,
      nombreCompleto: clientePractica.nombreCompleto,
      numeroTarjeta: clientePractica.numeroTarjeta,
    },
    items: [
      {
        id: "item-practica",
        descripcion: "Colcha Viena azul",
        cantidad: 1,
        precioEstimado: "1200",
        productoId: productoPractica.id,
        producto: { nombre: productoPractica.nombre },
        proveedor:
          estado === "PENDIENTE_PEDIR"
            ? null
            : { id: "proveedor-practica", nombre: "Textiles del Centro" },
      },
    ],
  };
}
