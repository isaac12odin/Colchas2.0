import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../infraestructura/prisma.js";
import { autenticar, permitirPermiso } from "../../seguridad/middlewares.js";
import { ErrorAplicacion } from "../../compartido/errores.js";
import { crearPagina, esquemaPaginacion } from "../../compartido/paginacion.js";

export const rutasCompras = Router();
rutasCompras.use(autenticar, permitirPermiso("COMPRAS_GESTIONAR"));

const esquemaCompra = z.object({
  proveedorId: z.string().uuid(),
  fechaCompra: z.coerce.date().default(new Date()),
  notas: z.string().trim().max(1000).optional(),
  items: z
    .array(
      z.object({
        productoId: z.string().uuid(),
        cantidad: z.coerce.number().int().positive(),
        costoUnitario: z.coerce.number().positive(),
        itemPedidoId: z.string().uuid().optional(),
      }),
    )
    .min(1)
    .max(100),
});

rutasCompras.get("/", async (req, res) => {
  const { pagina, limite, buscar } = esquemaPaginacion.parse(req.query);
  const where = buscar
    ? {
        OR: [
          { folio: { contains: buscar, mode: "insensitive" as const } },
          {
            proveedorNombre: {
              contains: buscar,
              mode: "insensitive" as const,
            },
          },
        ],
      }
    : {};
  const [datos, total] = await prisma.$transaction([
    prisma.compra.findMany({
      where,
      include: {
        proveedor: true,
        detalles: {
          include: {
            producto: { select: { id: true, nombre: true, sku: true } },
            itemsPedido: {
              select: { id: true, pedido: { select: { folio: true } } },
            },
          },
        },
        usuario: { select: { nombre: true } },
      },
      orderBy: { fechaCompra: "desc" },
      skip: (pagina - 1) * limite,
      take: limite,
    }),
    prisma.compra.count({ where }),
  ]);
  res.json(crearPagina(datos, total, pagina, limite));
});

rutasCompras.post("/", async (req, res) => {
  const datos = esquemaCompra.parse(req.body);
  const ids = [...new Set(datos.items.map((item) => item.productoId))];
  if (ids.length !== datos.items.length)
    throw new ErrorAplicacion(
      "PRODUCTO_REPETIDO",
      "Agrupe las cantidades del mismo producto.",
      422,
    );

  const compra = await prisma.$transaction(async (tx) => {
    const [productos, proveedor] = await Promise.all([
      tx.producto.findMany({ where: { id: { in: ids }, activo: true } }),
      tx.proveedor.findFirst({
        where: { id: datos.proveedorId, activo: true },
      }),
    ]);
    if (!proveedor)
      throw new ErrorAplicacion(
        "PROVEEDOR_INVALIDO",
        "El proveedor no existe o esta inactivo.",
        422,
      );
    if (productos.length !== ids.length)
      throw new ErrorAplicacion(
        "PRODUCTO_INVALIDO",
        "Uno de los productos no existe o esta inactivo.",
        422,
      );

    const pedidoIds = datos.items
      .map((item) => item.itemPedidoId)
      .filter((id): id is string => Boolean(id));
    if (new Set(pedidoIds).size !== pedidoIds.length)
      throw new ErrorAplicacion(
        "ITEM_PEDIDO_REPETIDO",
        "No relacione dos entradas con el mismo articulo pendiente.",
        422,
      );
    if (pedidoIds.length) {
      const itemsPedido = await tx.itemPedidoVenta.findMany({
        where: {
          id: { in: pedidoIds },
          pedido: {
            estado: { in: ["PENDIENTE_PEDIR", "PEDIDO_PROVEEDOR"] },
          },
        },
      });
      if (
        itemsPedido.length !== pedidoIds.length ||
        itemsPedido.some((item) => {
          const compraItem = datos.items.find(
            (actual) => actual.itemPedidoId === item.id,
          );
          return compraItem?.productoId !== item.productoId;
        })
      )
        throw new ErrorAplicacion(
          "PEDIDO_INVALIDO",
          "El articulo pendiente no corresponde al producto comprado.",
          422,
        );
    }

    const total = datos.items.reduce(
      (suma, item) => suma + item.cantidad * item.costoUnitario,
      0,
    );
    const creada = await tx.compra.create({
      data: {
        folio: `C-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
        proveedorId: proveedor.id,
        proveedorNombre: proveedor.nombre,
        fechaCompra: datos.fechaCompra,
        notas: datos.notas,
        total,
        usuarioId: req.usuario!.id,
        detalles: {
          create: datos.items.map((item) => ({
            productoId: item.productoId,
            cantidad: item.cantidad,
            costoUnitario: item.costoUnitario,
            total: item.cantidad * item.costoUnitario,
          })),
        },
      },
      include: { detalles: true, proveedor: true },
    });

    for (let indice = 0; indice < datos.items.length; indice += 1) {
      const item = datos.items[indice]!;
      const detalle = creada.detalles[indice]!;
      const actualizado = await tx.producto.update({
        where: { id: item.productoId },
        data: {
          existencia: { increment: item.cantidad },
          precioCompra: item.costoUnitario,
        },
      });
      await tx.movimientoInventario.create({
        data: {
          productoId: item.productoId,
          usuarioId: req.usuario!.id,
          tipo: "ENTRADA_COMPRA",
          cantidad: item.cantidad,
          existenciaAntes: actualizado.existencia - item.cantidad,
          existenciaDespues: actualizado.existencia,
          referenciaTipo: "COMPRA",
          referenciaId: creada.id,
          notas: `Proveedor: ${proveedor.nombre}`,
        },
      });
      if (item.itemPedidoId) {
        await tx.itemPedidoVenta.update({
          where: { id: item.itemPedidoId },
          data: {
            proveedorId: proveedor.id,
            detalleCompraId: detalle.id,
          },
        });
      }
    }
    await tx.auditoria.create({
      data: {
        usuarioId: req.usuario!.id,
        accion: "REGISTRAR_COMPRA",
        entidad: "Compra",
        entidadId: creada.id,
        datosDespues: {
          folio: creada.folio,
          proveedorId: proveedor.id,
          total,
          productos: datos.items.length,
        },
      },
    });
    return creada;
  });
  res.status(201).json(compra);
});
