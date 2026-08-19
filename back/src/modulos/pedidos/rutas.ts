import { Router } from "express";
import { EstadoPedido } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../infraestructura/prisma.js";
import { autenticar, permitirPermiso } from "../../seguridad/middlewares.js";
import { ErrorAplicacion } from "../../compartido/errores.js";
import { entregarPedido, esquemaEntregaPedido } from "./servicio.js";
import {
  asegurarClienteAsignado,
  filtroClientesDelActor,
} from "../../seguridad/alcanceDatos.js";

export const rutasPedidos = Router();
rutasPedidos.use(autenticar);

export const esquemaPedido = z.object({
  clienteId: z.string().uuid(),
  fechaCompromiso: z.coerce.date().optional(),
  notas: z.string().trim().max(1000).optional(),
  items: z
    .array(
      z.object({
        productoId: z.string().uuid(),
        cantidad: z.coerce.number().int().positive(),
      }),
    )
    .min(1),
});

rutasPedidos.get(
  "/",
  permitirPermiso("PEDIDOS_CONSULTAR"),
  async (req, res) => {
    const estado = z
      .nativeEnum(EstadoPedido)
      .optional()
      .parse(req.query.estado);
    const datos = await prisma.pedidoVenta.findMany({
      where: {
        ...(estado ? { estado } : {}),
        cliente: filtroClientesDelActor(req.usuario!),
      },
      include: {
        cliente: {
          select: { id: true, nombreCompleto: true, numeroTarjeta: true },
        },
        items: {
          include: {
            producto: { select: { id: true, nombre: true, sku: true } },
            proveedor: { select: { id: true, nombre: true } },
            detalleCompra: {
              select: { id: true, compra: { select: { folio: true } } },
            },
          },
        },
        venta: { select: { id: true, folio: true } },
      },
      orderBy: [{ estado: "asc" }, { fechaCompromiso: "asc" }],
      take: 200,
    });
    res.json({ datos });
  },
);

rutasPedidos.post("/", permitirPermiso("PEDIDOS_CREAR"), async (req, res) => {
  const datos = esquemaPedido.parse(req.body);
  await prisma.$transaction((tx) =>
    asegurarClienteAsignado(tx, req.usuario!, datos.clienteId),
  );
  const ids = [...new Set(datos.items.map((item) => item.productoId))];
  if (ids.length !== datos.items.length)
    throw new ErrorAplicacion(
      "PRODUCTO_REPETIDO",
      "Agrupe el mismo producto en una sola línea.",
      422,
    );
  const [productos, cliente] = await Promise.all([
    prisma.producto.findMany({
      where: { id: { in: ids }, activo: true },
    }),
    prisma.cliente.findFirst({
      where: { id: datos.clienteId, activo: true },
      select: { id: true },
    }),
  ]);
  if (!cliente)
    throw new ErrorAplicacion(
      "CLIENTE_INVALIDO",
      "Seleccione un cliente activo del directorio.",
      422,
    );
  if (productos.length !== ids.length)
    throw new ErrorAplicacion(
      "PRODUCTO_INVALIDO",
      "Seleccione únicamente productos activos del inventario.",
      422,
    );
  const pedido = await prisma.pedidoVenta.create({
    data: {
      folio: `P-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      clienteId: datos.clienteId,
      fechaCompromiso: datos.fechaCompromiso,
      notas: datos.notas,
      items: {
        create: datos.items.map((item) => {
          const producto = productos.find(
            (actual) => actual.id === item.productoId,
          )!;
          return {
            productoId: producto.id,
            descripcion: producto.nombre,
            cantidad: item.cantidad,
            precioEstimado: producto.precioVenta,
          };
        }),
      },
    },
    include: { items: true, cliente: { select: { nombreCompleto: true } } },
  });
  res.status(201).json(pedido);
});

const transiciones: Record<EstadoPedido, EstadoPedido[]> = {
  PENDIENTE_PEDIR: ["PEDIDO_PROVEEDOR", "CANCELADO"],
  PEDIDO_PROVEEDOR: ["RECIBIDO_ALMACEN", "CANCELADO"],
  RECIBIDO_ALMACEN: ["LISTO_ENTREGA", "CANCELADO"],
  LISTO_ENTREGA: ["CANCELADO"],
  ENTREGADO: [],
  CANCELADO: [],
};

rutasPedidos.patch(
  "/:id/estado",
  permitirPermiso("PEDIDOS_ALMACEN"),
  async (req, res) => {
    const { estado, proveedores } = z
      .object({
        estado: z.nativeEnum(EstadoPedido),
        proveedores: z
          .array(
            z.object({
              itemPedidoId: z.string().uuid(),
              proveedorId: z.string().uuid(),
            }),
          )
          .optional(),
      })
      .parse(req.body);
    if (estado === "ENTREGADO")
      throw new ErrorAplicacion(
        "USE_ENTREGA",
        "Use la accion de entrega para generar la venta y el saldo.",
        422,
      );
    const actual = await prisma.pedidoVenta.findUniqueOrThrow({
      where: { id: String(req.params.id) },
    });
    if (!transiciones[actual.estado].includes(estado))
      throw new ErrorAplicacion(
        "TRANSICION_INVALIDA",
        `No se puede pasar de ${actual.estado} a ${estado}.`,
        422,
      );
    const pedido = await prisma.$transaction(async (tx) => {
      if (proveedores?.length) {
        const idsProveedor = [
          ...new Set(proveedores.map((item) => item.proveedorId)),
        ];
        const [totalProveedores, totalItems] = await Promise.all([
          tx.proveedor.count({
            where: { id: { in: idsProveedor }, activo: true },
          }),
          tx.itemPedidoVenta.count({
            where: {
              pedidoId: actual.id,
              id: { in: proveedores.map((item) => item.itemPedidoId) },
            },
          }),
        ]);
        if (
          totalProveedores !== idsProveedor.length ||
          totalItems !== proveedores.length
        )
          throw new ErrorAplicacion(
            "PROVEEDOR_INVALIDO",
            "La relacion entre proveedor y articulo no es valida.",
            422,
          );
        for (const item of proveedores)
          await tx.itemPedidoVenta.update({
            where: { id: item.itemPedidoId },
            data: { proveedorId: item.proveedorId },
          });
      }
      const actualizado = await tx.pedidoVenta.update({
        where: { id: actual.id },
        data: {
          estado,
          ...(estado === "RECIBIDO_ALMACEN" ? { recibidoEn: new Date() } : {}),
        },
      });
      await tx.auditoria.create({
        data: {
          usuarioId: req.usuario!.id,
          accion: estado === "CANCELADO" ? "CANCELAR" : "CAMBIAR_ESTADO",
          entidad: "PedidoVenta",
          entidadId: actual.id,
          datosAntes: { estado: actual.estado },
          datosDespues: { estado },
        },
      });
      return actualizado;
    });
    res.json(pedido);
  },
);

rutasPedidos.post(
  "/:id/entregar",
  permitirPermiso("PEDIDOS_ENTREGAR"),
  async (req, res) => {
    const datos = esquemaEntregaPedido
      .omit({ pedidoId: true, idOperacionMovil: true })
      .parse(req.body);
    const resultado = await entregarPedido(
      req.usuario!,
      String(req.params.id),
      datos,
    );
    res.status(201).json(resultado);
  },
);
