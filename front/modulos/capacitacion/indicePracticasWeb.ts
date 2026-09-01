import type { Rol } from "@/lib/tipos";

/**
 * Índice deliberadamente pequeño para validar `?practica=` sin importar el
 * catálogo, los guiones ni el entrenador en el bundle operativo común.
 *
 * La prueba de paridad con el catálogo obliga a actualizar este índice cuando
 * se agrega o mueve una práctica de pantalla real.
 */
const practicasWeb = [
  {
    id: "orientacion-inicio",
    rutaReal: "/inicio",
    roles: ["ADMINISTRADOR", "CONTABLE", "VENDEDOR", "ALMACENISTA", "COBRADOR"],
  },
  {
    id: "clientes-expediente",
    rutaReal: "/clientes",
    roles: ["ADMINISTRADOR", "CONTABLE", "VENDEDOR", "COBRADOR"],
  },
  {
    id: "clientes-edicion",
    rutaReal: "/clientes",
    roles: ["ADMINISTRADOR", "CONTABLE", "VENDEDOR"],
  },
  {
    id: "clientes-alta",
    rutaReal: "/clientes",
    roles: ["ADMINISTRADOR", "CONTABLE", "VENDEDOR"],
  },
  {
    id: "configuracion-localidades",
    rutaReal: "/configuracion",
    roles: ["ADMINISTRADOR"],
  },
  {
    id: "importacion-inicial",
    rutaReal: "/configuracion",
    roles: ["ADMINISTRADOR"],
  },
  {
    id: "ventas-contado-credito",
    rutaReal: "/ventas",
    roles: ["ADMINISTRADOR", "CONTABLE", "VENDEDOR"],
  },
  {
    id: "cobranza-abono",
    rutaReal: "/clientes",
    roles: ["ADMINISTRADOR", "CONTABLE", "COBRADOR"],
  },
  {
    id: "inventario-producto",
    rutaReal: "/inventario",
    roles: ["ADMINISTRADOR", "ALMACENISTA"],
  },
  {
    id: "compras-proveedores",
    rutaReal: "/compras",
    roles: ["ADMINISTRADOR", "ALMACENISTA"],
  },
  {
    id: "pedido-crear",
    rutaReal: "/pedidos",
    roles: ["ADMINISTRADOR", "CONTABLE", "VENDEDOR", "COBRADOR"],
  },
  {
    id: "pedido-asignar-proveedor",
    rutaReal: "/pedidos",
    roles: ["ADMINISTRADOR", "CONTABLE", "ALMACENISTA"],
  },
  {
    id: "pedido-recibir-preparar",
    rutaReal: "/pedidos",
    roles: ["ADMINISTRADOR", "ALMACENISTA"],
  },
  {
    id: "pedido-entregar",
    rutaReal: "/pedidos",
    roles: ["ADMINISTRADOR", "COBRADOR"],
  },
  {
    id: "compras-proveedor",
    rutaReal: "/compras",
    roles: ["ADMINISTRADOR", "ALMACENISTA"],
  },
  {
    id: "rutas-configuracion",
    rutaReal: "/rutas",
    roles: ["ADMINISTRADOR"],
  },
  {
    id: "rutas-jornada",
    rutaReal: "/rutas",
    roles: ["ADMINISTRADOR", "COBRADOR"],
  },
  {
    id: "cortes-liquidacion",
    rutaReal: "/cortes",
    roles: ["ADMINISTRADOR", "CONTABLE", "COBRADOR"],
  },
  {
    id: "devoluciones-seguras",
    rutaReal: "/devoluciones",
    roles: ["ADMINISTRADOR", "CONTABLE"],
  },
  {
    id: "devolucion-revisar-almacen",
    rutaReal: "/devoluciones",
    roles: ["ALMACENISTA"],
  },
  {
    id: "alertas-priorizar",
    rutaReal: "/alertas",
    roles: ["ADMINISTRADOR", "CONTABLE", "VENDEDOR", "ALMACENISTA", "COBRADOR"],
  },
  {
    id: "reportes-balance",
    rutaReal: "/reportes",
    roles: ["ADMINISTRADOR", "CONTABLE"],
  },
  {
    id: "seguridad-usuarios",
    rutaReal: "/usuarios",
    roles: ["ADMINISTRADOR"],
  },
  {
    id: "configuracion-operacion",
    rutaReal: "/configuracion",
    roles: ["ADMINISTRADOR"],
  },
] as const satisfies readonly {
  id: string;
  rutaReal: string;
  roles: readonly Rol[];
}[];

export type PracticaWebSegura = (typeof practicasWeb)[number];

export const indicePracticasWeb: readonly PracticaWebSegura[] = practicasWeb;

/**
 * Una práctica sólo existe si coinciden identificador, pantalla y rol. El
 * administrador puede ensayar recorridos de cualquier puesto desde una ruta
 * web que ya tenga autorizada.
 */
export function obtenerPracticaWebSegura(
  id: string | null,
  ruta: string,
  rol: Rol,
): PracticaWebSegura | null {
  if (!id) return null;
  const practica = practicasWeb.find((candidata) => candidata.id === id);
  if (
    !practica ||
    (practica.rutaReal !== ruta && !ruta.startsWith(`${practica.rutaReal}/`))
  )
    return null;
  if (
    rol !== "ADMINISTRADOR" &&
    !practica.roles.some((permitido) => permitido === rol)
  )
    return null;
  return practica;
}
