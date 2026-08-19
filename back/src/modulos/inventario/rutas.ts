import { Router } from "express";
import { RolUsuario, TipoMovimientoInventario } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../infraestructura/prisma.js";
import { autenticar, permitirPermiso } from "../../seguridad/middlewares.js";
import { crearPagina, esquemaPaginacion } from "../../compartido/paginacion.js";
import { ErrorAplicacion } from "../../compartido/errores.js";
import { auditar } from "../../compartido/auditoria.js";

export const rutasInventario = Router();
rutasInventario.use(autenticar);

function rolSinCostos(rol: RolUsuario) {
  return rol === RolUsuario.COBRADOR || rol === RolUsuario.VENDEDOR;
}

const esquemaProducto = z.object({
  sku: z.string().trim().min(2).max(60),
  nombre: z.string().trim().min(2).max(180),
  marca: z.string().trim().min(1).max(120),
  categoria: z.string().trim().max(100).optional(),
  codigoBarras: z.string().trim().max(100).nullable().optional(),
  codigoQr: z.string().trim().max(200).nullable().optional(),
  existenciaMinima: z.coerce.number().int().min(0).default(0),
  precioVenta: z.coerce.number().positive(),
  precioCompra: z.coerce.number().min(0),
  activo: z.boolean().default(true),
});

rutasInventario.get(
  "/productos",
  permitirPermiso("INVENTARIO_CATALOGO"),
  async (req, res) => {
    const { pagina, limite, buscar } = esquemaPaginacion.parse(req.query);
    const where = {
      activo: true,
      ...(buscar
        ? {
            OR: [
              { nombre: { contains: buscar, mode: "insensitive" as const } },
              { marca: { contains: buscar, mode: "insensitive" as const } },
              { sku: { contains: buscar, mode: "insensitive" as const } },
              {
                codigoBarras: {
                  contains: buscar,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    };
    const [productos, total] = await prisma.$transaction([
      prisma.producto.findMany({
        where,
        orderBy: { nombre: "asc" },
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      prisma.producto.count({ where }),
    ]);
    const datos = rolSinCostos(req.usuario!.rol)
      ? productos.map(
          ({ precioCompra: _precioCompra, ...producto }) => producto,
        )
      : productos;
    res.json(crearPagina(datos, total, pagina, limite));
  },
);

rutasInventario.get(
  "/productos/codigo/:codigo",
  permitirPermiso("INVENTARIO_CATALOGO"),
  async (req, res) => {
    const producto = await prisma.producto.findFirst({
      where: {
        OR: [
          { codigoBarras: String(req.params.codigo) },
          { codigoQr: String(req.params.codigo) },
          { sku: String(req.params.codigo) },
        ],
        activo: true,
      },
    });
    if (!producto)
      throw new ErrorAplicacion(
        "PRODUCTO_NO_ENCONTRADO",
        "No se encontro un producto con ese codigo.",
        404,
      );
    if (rolSinCostos(req.usuario!.rol)) {
      const { precioCompra: _precioCompra, ...catalogo } = producto;
      res.json(catalogo);
      return;
    }
    res.json(producto);
  },
);

rutasInventario.post(
  "/productos",
  permitirPermiso("INVENTARIO_GESTIONAR"),
  async (req, res) => {
    const datos = esquemaProducto
      .extend({ existenciaInicial: z.coerce.number().int().min(0).default(0) })
      .parse(req.body);
    const { existenciaInicial, ...productoDatos } = datos;
    const producto = await prisma.$transaction(async (tx) => {
      const creado = await tx.producto.create({
        data: { ...productoDatos, existencia: existenciaInicial },
      });
      if (existenciaInicial > 0) {
        await tx.movimientoInventario.create({
          data: {
            productoId: creado.id,
            usuarioId: req.usuario!.id,
            tipo: "AJUSTE_POSITIVO",
            cantidad: existenciaInicial,
            existenciaAntes: 0,
            existenciaDespues: existenciaInicial,
            notas: "Existencia inicial",
          },
        });
      }
      return creado;
    });
    await auditar(req, "CREAR", "Producto", producto.id, undefined, producto);
    res.status(201).json(producto);
  },
);

rutasInventario.patch(
  "/productos/:id",
  permitirPermiso("INVENTARIO_GESTIONAR"),
  async (req, res) => {
    const datos = esquemaProducto.partial().parse(req.body);
    const antes = await prisma.producto.findUniqueOrThrow({
      where: { id: String(req.params.id) },
    });
    const producto = await prisma.producto.update({
      where: { id: String(req.params.id) },
      data: datos,
    });
    await auditar(req, "ACTUALIZAR", "Producto", producto.id, antes, producto);
    res.json(producto);
  },
);

rutasInventario.delete(
  "/productos/:id",
  permitirPermiso("INVENTARIO_GESTIONAR"),
  async (req, res) => {
    const id = String(req.params.id);
    const producto = await prisma.producto.findUniqueOrThrow({
      where: { id },
    });
    if (!producto.activo) {
      res.status(204).send();
      return;
    }
    const pedidosPendientes = await prisma.itemPedidoVenta.count({
      where: {
        productoId: id,
        pedido: { estado: { notIn: ["ENTREGADO", "CANCELADO"] } },
      },
    });
    if (pedidosPendientes > 0)
      throw new ErrorAplicacion(
        "PRODUCTO_CON_PEDIDOS",
        "No puede dar de baja un producto incluido en pedidos pendientes.",
        409,
      );
    const actualizado = await prisma.producto.update({
      where: { id },
      data: { activo: false },
    });
    await auditar(req, "DAR_DE_BAJA", "Producto", id, producto, actualizado);
    res.status(204).send();
  },
);

rutasInventario.post(
  "/productos/:id/ajuste",
  permitirPermiso("INVENTARIO_GESTIONAR"),
  async (req, res) => {
    const datos = z
      .object({
        cantidad: z.coerce
          .number()
          .int()
          .refine((valor) => valor !== 0),
        notas: z.string().trim().min(3).max(500),
      })
      .parse(req.body);
    const producto = await prisma.$transaction(async (tx) => {
      const actual = await tx.producto.findUniqueOrThrow({
        where: { id: String(req.params.id) },
      });
      const existenciaDespues = actual.existencia + datos.cantidad;
      if (existenciaDespues < 0)
        throw new ErrorAplicacion(
          "STOCK_NEGATIVO",
          "El ajuste dejaria una existencia negativa.",
          422,
        );
      const actualizado = await tx.producto.update({
        where: { id: actual.id },
        data: { existencia: existenciaDespues },
      });
      await tx.movimientoInventario.create({
        data: {
          productoId: actual.id,
          usuarioId: req.usuario!.id,
          tipo:
            datos.cantidad > 0
              ? TipoMovimientoInventario.AJUSTE_POSITIVO
              : TipoMovimientoInventario.AJUSTE_NEGATIVO,
          cantidad: Math.abs(datos.cantidad),
          existenciaAntes: actual.existencia,
          existenciaDespues,
          notas: datos.notas,
        },
      });
      return actualizado;
    });
    res.json(producto);
  },
);

rutasInventario.get(
  "/movimientos",
  permitirPermiso("INVENTARIO_MOVIMIENTOS"),
  async (req, res) => {
    const { pagina, limite } = esquemaPaginacion.parse(req.query);
    const [datos, total] = await prisma.$transaction([
      prisma.movimientoInventario.findMany({
        include: { producto: true, usuario: { select: { nombre: true } } },
        orderBy: { creadoEn: "desc" },
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      prisma.movimientoInventario.count(),
    ]);
    res.json(crearPagina(datos, total, pagina, limite));
  },
);
