import type { Rol } from "../../../tipos";

import type { LeccionCapacitacionMovil } from "../tipos";
import { movilAbono } from "./movil-abono";
import { movilDevolucionAlmacen } from "./movil-devolucion-almacen";
import { movilDevolucion } from "./movil-devolucion";
import { movilInventario } from "./movil-inventario";
import { movilOrientacion } from "./movil-orientacion";
import { movilPedidoAlmacen } from "./movil-pedido-almacen";
import { movilPedidoCrear } from "./movil-pedido-crear";
import { movilPedidoEntrega } from "./movil-pedido-entrega";
import { movilPedidoProveedor } from "./movil-pedido-proveedor";
import { movilRuta } from "./movil-ruta";
import { movilSeguridad } from "./movil-seguridad";
import { movilSincronizacion } from "./movil-sincronizacion";
import { movilVentaCredito } from "./movil-venta-credito";

export const leccionesCapacitacionMovil: readonly LeccionCapacitacionMovil[] = [
  movilOrientacion,
  movilRuta,
  movilAbono,
  movilVentaCredito,
  movilInventario,
  movilPedidoCrear,
  movilPedidoProveedor,
  movilPedidoAlmacen,
  movilPedidoEntrega,
  movilSincronizacion,
  movilDevolucion,
  movilDevolucionAlmacen,
  movilSeguridad,
];

export function leccionesMovilesParaRol(rol: Rol) {
  return leccionesCapacitacionMovil.filter((leccion) =>
    leccion.roles.includes(rol),
  );
}
