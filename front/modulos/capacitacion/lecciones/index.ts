import { alertasPriorizar } from "./alertas-priorizar";
import { clientesAlta } from "./clientes-alta";
import { clientesEdicion } from "./clientes-edicion";
import { clientesExpediente } from "./clientes-expediente";
import { cobranzaAbono } from "./cobranza-abono";
import { comprasProveedor } from "./compras-proveedor";
import { comprasProveedores } from "./compras-proveedores";
import { configuracionLocalidades } from "./configuracion-localidades";
import { configuracionOperacion } from "./configuracion-operacion";
import { cortesLiquidacion } from "./cortes-liquidacion";
import { devolucionRevisarAlmacen } from "./devolucion-revisar-almacen";
import { devolucionesSeguras } from "./devoluciones-seguras";
import { importacionInicial } from "./importacion-inicial";
import { inventarioProducto } from "./inventario-producto";
import { movilOffline } from "./movil-offline";
import { orientacionInicio } from "./orientacion-inicio";
import { pedidoAsignarProveedor } from "./pedido-asignar-proveedor";
import { pedidoCrear } from "./pedido-crear";
import { pedidoEntregar } from "./pedido-entregar";
import { pedidoRecibirPreparar } from "./pedido-recibir-preparar";
import { reportesBalance } from "./reportes-balance";
import { rutasConfiguracion } from "./rutas-configuracion";
import { rutasJornada } from "./rutas-jornada";
import { seguridadUsuarios } from "./seguridad-usuarios";
import { ventasContadoCredito } from "./ventas-contado-credito";

export const leccionesDefinidas = [
  orientacionInicio,
  clientesExpediente,
  clientesEdicion,
  clientesAlta,
  configuracionLocalidades,
  importacionInicial,
  ventasContadoCredito,
  cobranzaAbono,
  inventarioProducto,
  comprasProveedores,
  pedidoCrear,
  pedidoAsignarProveedor,
  pedidoRecibirPreparar,
  pedidoEntregar,
  comprasProveedor,
  rutasConfiguracion,
  rutasJornada,
  cortesLiquidacion,
  devolucionesSeguras,
  devolucionRevisarAlmacen,
  alertasPriorizar,
  reportesBalance,
  seguridadUsuarios,
  configuracionOperacion,
  movilOffline,
] as const;
