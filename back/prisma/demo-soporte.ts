import { prisma } from "../src/infraestructura/prisma.js";

export const MARCA_DEMO = "NEXO_DEMO_AUTOMATICA_V2";
export const CORREOS_DEMO = [
  "admin.demo@nexo.local",
  "contable.demo@nexo.local",
  "vendedor.demo@nexo.local",
  "almacen.demo@nexo.local",
  "cobrador.demo@nexo.local",
];

export function asegurarEntornoDemo() {
  const valor = process.env.DATABASE_URL;
  if (!valor) throw new Error("DATABASE_URL no está configurada.");
  if (process.env.NODE_ENV === "production")
    throw new Error(
      "Los datos demo no pueden generarse con NODE_ENV=production.",
    );
  const url = new URL(valor);
  const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (!local && process.env.DEMO_ALLOW_REMOTE_DATABASE !== "SI")
    throw new Error(
      "Se bloqueó la generación demo sobre una base remota. Use PostgreSQL local o confirme DEMO_ALLOW_REMOTE_DATABASE=SI.",
    );
}

/** Elimina exclusivamente registros etiquetados por el generador demo. */
export async function limpiarDatosDemo() {
  const [usuarios, clientes, productos, proveedores, rutas, localidades] =
    await Promise.all([
      prisma.usuario.findMany({
        where: { correo: { in: CORREOS_DEMO } },
        select: { id: true },
      }),
      prisma.cliente.findMany({
        where: { notas: MARCA_DEMO },
        select: { id: true },
      }),
      prisma.producto.findMany({
        where: { sku: { startsWith: "DEMO-" } },
        select: { id: true },
      }),
      prisma.proveedor.findMany({
        where: { notas: MARCA_DEMO },
        select: { id: true },
      }),
      prisma.ruta.findMany({
        where: { notas: MARCA_DEMO },
        select: { id: true },
      }),
      prisma.localidad.findMany({
        where: { nombre: { startsWith: "DEMO ·" } },
        select: { id: true },
      }),
    ]);
  const usuarioIds = usuarios.map(({ id }) => id);
  const clienteIds = clientes.map(({ id }) => id);
  const productoIds = productos.map(({ id }) => id);
  const proveedorIds = proveedores.map(({ id }) => id);
  const rutaIds = rutas.map(({ id }) => id);

  await prisma.auditoria.deleteMany({
    where: { usuarioId: { in: usuarioIds } },
  });
  await prisma.corteCaja.deleteMany({
    where: {
      OR: [
        { usuarioOperadorId: { in: usuarioIds } },
        { cerradoPorId: { in: usuarioIds } },
      ],
    },
  });
  await prisma.operacionSincronizada.deleteMany({
    where: { usuarioId: { in: usuarioIds } },
  });
  await prisma.loteSincronizacion.deleteMany({
    where: { usuarioId: { in: usuarioIds } },
  });
  await prisma.aplicacionAbono.deleteMany({
    where: { abono: { clienteId: { in: clienteIds } } },
  });
  await prisma.abono.deleteMany({
    where: {
      OR: [
        { clienteId: { in: clienteIds } },
        { usuarioId: { in: usuarioIds } },
      ],
    },
  });
  await prisma.devolucion.deleteMany({
    where: {
      OR: [
        { clienteId: { in: clienteIds } },
        { autorizadoPorId: { in: usuarioIds } },
        { usuarioOperadorId: { in: usuarioIds } },
      ],
    },
  });
  await prisma.pedidoVenta.deleteMany({
    where: { clienteId: { in: clienteIds } },
  });
  await prisma.venta.deleteMany({
    where: {
      OR: [
        { clienteId: { in: clienteIds } },
        { usuarioId: { in: usuarioIds } },
      ],
    },
  });
  await prisma.visitaCobranza.deleteMany({
    where: {
      OR: [
        { rutaId: { in: rutaIds } },
        { clienteId: { in: clienteIds } },
        { usuarioId: { in: usuarioIds } },
      ],
    },
  });
  await prisma.movimientoSaldo.deleteMany({
    where: { clienteId: { in: clienteIds } },
  });
  await prisma.movimientoInventario.deleteMany({
    where: {
      OR: [
        { productoId: { in: productoIds } },
        { usuarioId: { in: usuarioIds } },
      ],
    },
  });
  await prisma.compra.deleteMany({
    where: {
      OR: [
        { proveedorId: { in: proveedorIds } },
        { usuarioId: { in: usuarioIds } },
      ],
    },
  });
  await prisma.ruta.deleteMany({ where: { id: { in: rutaIds } } });
  await prisma.cliente.deleteMany({ where: { id: { in: clienteIds } } });
  await prisma.producto.deleteMany({ where: { id: { in: productoIds } } });
  await prisma.proveedor.deleteMany({
    where: { id: { in: proveedorIds } },
  });
  await prisma.localidad.deleteMany({
    where: { id: { in: localidades.map(({ id }) => id) } },
  });
  await prisma.usuario.deleteMany({ where: { id: { in: usuarioIds } } });

  return {
    usuarios: usuarioIds.length,
    clientes: clienteIds.length,
    productos: productoIds.length,
    proveedores: proveedorIds.length,
    rutas: rutaIds.length,
    localidades: localidades.length,
  };
}
