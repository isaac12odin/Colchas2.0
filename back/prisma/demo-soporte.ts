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
  return prisma.$transaction(async (prisma) => {
    const [clientes, productos, proveedores, rutas, localidades] =
      await Promise.all([
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
    const clienteIds = clientes.map(({ id }) => id);
    const productoIds = productos.map(({ id }) => id);
    const proveedorIds = proveedores.map(({ id }) => id);
    const rutaIds = rutas.map(({ id }) => id);

    await prisma.aplicacionAbono.deleteMany({
      where: { abono: { clienteId: { in: clienteIds } } },
    });
    await prisma.abono.deleteMany({
      where: { clienteId: { in: clienteIds } },
    });
    await prisma.devolucion.deleteMany({
      where: { clienteId: { in: clienteIds } },
    });
    await prisma.pedidoVenta.deleteMany({
      where: { clienteId: { in: clienteIds } },
    });
    await prisma.venta.deleteMany({
      where: {
        OR: [{ clienteId: { in: clienteIds } }, { notas: MARCA_DEMO }],
      },
    });
    await prisma.visitaCobranza.deleteMany({
      where: {
        OR: [{ rutaId: { in: rutaIds } }, { clienteId: { in: clienteIds } }],
      },
    });
    await prisma.movimientoSaldo.deleteMany({
      where: { clienteId: { in: clienteIds } },
    });
    await prisma.movimientoInventario.deleteMany({
      where: { productoId: { in: productoIds } },
    });
    await prisma.compra.deleteMany({
      where: { proveedorId: { in: proveedorIds } },
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
    const usuariosDesactivados = await prisma.usuario.updateMany({
      where: { correo: { in: CORREOS_DEMO } },
      data: {
        activo: false,
        tokenVersion: { increment: 1 },
      },
    });
    return {
      usuarios: usuariosDesactivados.count,
      clientes: clienteIds.length,
      productos: productoIds.length,
      proveedores: proveedorIds.length,
      rutas: rutaIds.length,
      localidades: localidades.length,
    };
  });
}
