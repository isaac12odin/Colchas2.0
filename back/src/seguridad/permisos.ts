import { RolUsuario } from "@prisma/client";

/**
 * Capacidades compartidas por los endpoints operativos. Mantener permisos por
 * acción evita convertir un rol en un interruptor global demasiado amplio.
 */
export const rolesPorPermiso = {
  RUTAS_CONFIGURAR: [RolUsuario.ADMINISTRADOR],
  RUTAS_OPERAR: [RolUsuario.ADMINISTRADOR, RolUsuario.COBRADOR],
  RUTAS_HISTORIAL: [
    RolUsuario.ADMINISTRADOR,
    RolUsuario.CONTABLE,
    RolUsuario.COBRADOR,
  ],
  INVENTARIO_CATALOGO: [
    RolUsuario.ADMINISTRADOR,
    RolUsuario.CONTABLE,
    RolUsuario.VENDEDOR,
    RolUsuario.ALMACENISTA,
    RolUsuario.COBRADOR,
  ],
  INVENTARIO_GESTIONAR: [RolUsuario.ADMINISTRADOR, RolUsuario.ALMACENISTA],
  INVENTARIO_MOVIMIENTOS: [
    RolUsuario.ADMINISTRADOR,
    RolUsuario.CONTABLE,
    RolUsuario.ALMACENISTA,
  ],
  PEDIDOS_CONSULTAR: [
    RolUsuario.ADMINISTRADOR,
    RolUsuario.CONTABLE,
    RolUsuario.VENDEDOR,
    RolUsuario.ALMACENISTA,
    RolUsuario.COBRADOR,
  ],
  PEDIDOS_CREAR: [
    RolUsuario.ADMINISTRADOR,
    RolUsuario.CONTABLE,
    RolUsuario.VENDEDOR,
    RolUsuario.COBRADOR,
  ],
  PEDIDOS_ASIGNAR_PROVEEDOR: [
    RolUsuario.ADMINISTRADOR,
    RolUsuario.CONTABLE,
    RolUsuario.ALMACENISTA,
  ],
  PEDIDOS_ALMACEN: [RolUsuario.ADMINISTRADOR, RolUsuario.ALMACENISTA],
  PEDIDOS_ENTREGAR: [RolUsuario.ADMINISTRADOR, RolUsuario.COBRADOR],
  COMPRAS_GESTIONAR: [RolUsuario.ADMINISTRADOR, RolUsuario.ALMACENISTA],
  PROVEEDORES_CONSULTAR: [RolUsuario.ADMINISTRADOR, RolUsuario.ALMACENISTA],
  PROVEEDORES_SELECCIONAR: [
    RolUsuario.ADMINISTRADOR,
    RolUsuario.CONTABLE,
    RolUsuario.ALMACENISTA,
  ],
  PROVEEDORES_GESTIONAR: [RolUsuario.ADMINISTRADOR, RolUsuario.ALMACENISTA],
  CORTES_CONSULTAR: [
    RolUsuario.ADMINISTRADOR,
    RolUsuario.CONTABLE,
    RolUsuario.COBRADOR,
  ],
  CORTES_CERRAR: [
    RolUsuario.ADMINISTRADOR,
    RolUsuario.CONTABLE,
    RolUsuario.COBRADOR,
  ],
  DEVOLUCIONES_CONSULTAR: [
    RolUsuario.ADMINISTRADOR,
    RolUsuario.CONTABLE,
    RolUsuario.ALMACENISTA,
  ],
  DEVOLUCIONES_AUTORIZAR: [RolUsuario.ADMINISTRADOR, RolUsuario.CONTABLE],
  IMPORTACIONES_EJECUTAR: [RolUsuario.ADMINISTRADOR],
  AUDITORIA_CONSULTAR: [RolUsuario.ADMINISTRADOR],
  RECONCILIACION_CONSULTAR: [RolUsuario.ADMINISTRADOR, RolUsuario.CONTABLE],
} as const satisfies Record<string, readonly RolUsuario[]>;

export type Permiso = keyof typeof rolesPorPermiso;

export function rolTienePermiso(rol: RolUsuario, permiso: Permiso) {
  return (rolesPorPermiso[permiso] as readonly RolUsuario[]).includes(rol);
}
