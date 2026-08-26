import { Router } from "express";
import { Prisma, RolUsuario, TipoMovimientoInventario } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../infraestructura/prisma.js";
import { autenticar, permitirPermiso } from "../../seguridad/middlewares.js";
import { crearPagina, esquemaPaginacion } from "../../compartido/paginacion.js";
import { ErrorAplicacion } from "../../compartido/errores.js";
import { auditar } from "../../compartido/auditoria.js";
import {
  eliminarImagen,
  esquemaImagen,
  guardarImagen,
  leerImagen,
  procesarImagen,
} from "../../compartido/imagenes.js";
import { dineroNoNegativo, dineroPositivo } from "../../compartido/dinero.js";
import { registro } from "../../infraestructura/registro.js";

export const rutasInventario = Router();
rutasInventario.use(autenticar);

function rolSinCostos(rol: RolUsuario) {
  return rol === RolUsuario.COBRADOR || rol === RolUsuario.VENDEDOR;
}

const esquemaProducto = z.object({
  sku: z.string().trim().min(2).max(60),
  nombre: z.string().trim().min(2).max(180),
  marca: z.string().trim().min(1).max(120),
  categoriaId: z.string().uuid(),
  codigoBarras: z.string().trim().max(100).nullable().optional(),
  codigoQr: z.string().trim().max(200).nullable().optional(),
  existenciaMinima: z.coerce.number().int().min(0).default(0),
  precioVenta: dineroPositivo,
  precioCompra: dineroNoNegativo,
  activo: z.boolean().default(true),
});

const camposProductoCatalogo = {
  id: true,
  sku: true,
  nombre: true,
  marca: true,
  categoria: true,
  categoriaId: true,
  codigoBarras: true,
  codigoQr: true,
  existencia: true,
  existenciaMinima: true,
  precioVenta: true,
  precioCompra: true,
  fotoMime: true,
  fotoActualizadaEn: true,
  activo: true,
  creadoEn: true,
  actualizadoEn: true,
} satisfies Prisma.ProductoSelect;

type ProductoCatalogo = Prisma.ProductoGetPayload<{
  select: typeof camposProductoCatalogo;
}>;

function presentarProducto(producto: ProductoCatalogo, ocultarCosto = false) {
  const { fotoMime, ...datos } = producto;
  const presentado = { ...datos, tieneFoto: Boolean(fotoMime) };
  if (ocultarCosto) {
    const { precioCompra: _precioCompra, ...permitido } = presentado;
    return permitido;
  }
  return presentado;
}

function prepararFoto(datos: z.infer<typeof esquemaImagen>) {
  return procesarImagen(datos, {
    codigo: "FOTO_PRODUCTO_INVALIDA",
    nombreVisible: "La fotografía del producto",
    dimensionMaxima: 1_280,
    objetivoBytes: 240_000,
  });
}

async function resolverCategoria(categoriaId: string) {
  const categoria = await prisma.categoriaProducto.findFirst({
    where: { id: categoriaId, activo: true },
    select: { id: true, nombre: true },
  });
  if (!categoria)
    throw new ErrorAplicacion(
      "CATEGORIA_PRODUCTO_INVALIDA",
      "Seleccione una categoría activa del catálogo.",
      422,
    );
  return categoria;
}

async function limpiarArchivoSinReferencia(ruta: string | null | undefined) {
  await eliminarImagen(ruta).catch((error) =>
    registro.warn({ err: error }, "No se pudo eliminar una imagen huérfana"),
  );
}

rutasInventario.get(
  "/productos",
  permitirPermiso("INVENTARIO_CATALOGO"),
  async (req, res) => {
    const { pagina, limite, buscar } = esquemaPaginacion.parse(req.query);
    const categoriaId = z
      .string()
      .uuid()
      .optional()
      .parse(req.query.categoriaId);
    const where = {
      activo: true,
      ...(categoriaId ? { categoriaId } : {}),
      ...(buscar
        ? {
            OR: [
              { nombre: { contains: buscar, mode: "insensitive" as const } },
              { marca: { contains: buscar, mode: "insensitive" as const } },
              { sku: { contains: buscar, mode: "insensitive" as const } },
              {
                categoria: {
                  contains: buscar,
                  mode: "insensitive" as const,
                },
              },
              {
                codigoBarras: {
                  contains: buscar,
                  mode: "insensitive" as const,
                },
              },
              {
                codigoQr: {
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
        select: camposProductoCatalogo,
        orderBy: { nombre: "asc" },
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      prisma.producto.count({ where }),
    ]);
    const datos = productos.map((producto) =>
      presentarProducto(producto, rolSinCostos(req.usuario!.rol)),
    );
    res.json(crearPagina(datos, total, pagina, limite));
  },
);

rutasInventario.get(
  "/catalogos-producto",
  permitirPermiso("INVENTARIO_CATALOGO"),
  async (_req, res) => {
    const [marcas, categorias] = await prisma.$transaction([
      prisma.producto.findMany({
        where: { activo: true },
        distinct: ["marca"],
        select: { marca: true },
        orderBy: { marca: "asc" },
      }),
      prisma.categoriaProducto.findMany({
        where: { activo: true },
        select: { id: true, nombre: true },
        orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      }),
    ]);
    res.json({
      marcas: marcas.map((producto) => producto.marca).filter(Boolean),
      categorias,
    });
  },
);

rutasInventario.post(
  "/categorias-producto",
  permitirPermiso("INVENTARIO_GESTIONAR"),
  async (req, res) => {
    const datos = z
      .object({ nombre: z.string().trim().min(2).max(100) })
      .parse(req.body);
    const repetida = await prisma.categoriaProducto.findFirst({
      where: { nombre: { equals: datos.nombre, mode: "insensitive" } },
    });
    if (repetida) {
      if (!repetida.activo)
        return res.json(
          await prisma.categoriaProducto.update({
            where: { id: repetida.id },
            data: { activo: true },
            select: { id: true, nombre: true },
          }),
        );
      res.json({ id: repetida.id, nombre: repetida.nombre });
      return;
    }
    const categoria = await prisma.categoriaProducto.create({
      data: { nombre: datos.nombre, orden: 100 },
      select: { id: true, nombre: true },
    });
    await auditar(
      req,
      "CREAR",
      "CategoriaProducto",
      categoria.id,
      undefined,
      categoria,
    );
    res.status(201).json(categoria);
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
      select: camposProductoCatalogo,
    });
    if (!producto)
      throw new ErrorAplicacion(
        "PRODUCTO_NO_ENCONTRADO",
        "No se encontro un producto con ese codigo.",
        404,
      );
    res.json(presentarProducto(producto, rolSinCostos(req.usuario!.rol)));
  },
);

rutasInventario.get(
  "/productos/:id/foto",
  permitirPermiso("INVENTARIO_CATALOGO"),
  async (req, res) => {
    const foto = await prisma.producto.findFirst({
      where: { id: String(req.params.id), activo: true },
      select: {
        fotoRuta: true,
        fotoMime: true,
        fotoHash: true,
      },
    });
    if (!foto?.fotoRuta || !foto.fotoMime || !foto.fotoHash)
      throw new ErrorAplicacion(
        "FOTO_PRODUCTO_NO_ENCONTRADA",
        "El producto no tiene una fotografía registrada.",
        404,
      );
    const etag = `"${foto.fotoHash}"`;
    if (req.headers["if-none-match"] === etag) {
      res.status(304).send();
      return;
    }
    res.setHeader("Content-Type", foto.fotoMime);
    res.setHeader("Content-Disposition", 'inline; filename="producto"');
    res.setHeader("Cache-Control", "private, max-age=3600, must-revalidate");
    res.setHeader("ETag", etag);
    res.setHeader("X-Content-Hash", foto.fotoHash);
    try {
      res.send(await leerImagen(foto.fotoRuta));
    } catch {
      throw new ErrorAplicacion(
        "FOTO_PRODUCTO_NO_ENCONTRADA",
        "El archivo de la fotografía no está disponible.",
        404,
      );
    }
  },
);

rutasInventario.post(
  "/productos",
  permitirPermiso("INVENTARIO_GESTIONAR"),
  async (req, res) => {
    const datos = esquemaProducto
      .extend({
        existenciaInicial: z.coerce.number().int().min(0).default(0),
        foto: esquemaImagen.optional(),
      })
      .parse(req.body);
    const { existenciaInicial, foto, ...productoDatos } = datos;
    const categoria = await resolverCategoria(productoDatos.categoriaId);
    const imagen = foto ? await prepararFoto(foto) : null;
    const archivo = imagen ? await guardarImagen(imagen, "productos") : null;
    let producto: ProductoCatalogo;
    try {
      producto = await prisma.$transaction(async (tx) => {
        const creado = await tx.producto.create({
          data: {
            ...productoDatos,
            categoria: categoria.nombre,
            existencia: existenciaInicial,
            ...(archivo
              ? {
                  fotoNombre: archivo.nombre,
                  fotoMime: archivo.mime,
                  fotoRuta: archivo.ruta,
                  fotoHash: archivo.hash,
                  fotoBytes: archivo.bytes,
                  fotoAncho: archivo.ancho,
                  fotoAlto: archivo.alto,
                  fotoActualizadaEn: new Date(),
                }
              : {}),
          },
          select: camposProductoCatalogo,
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
    } catch (error) {
      await limpiarArchivoSinReferencia(archivo?.ruta);
      throw error;
    }
    const presentado = presentarProducto(producto);
    await auditar(req, "CREAR", "Producto", producto.id, undefined, presentado);
    res.status(201).json(presentado);
  },
);

rutasInventario.patch(
  "/productos/:id",
  permitirPermiso("INVENTARIO_GESTIONAR"),
  async (req, res) => {
    const datos = esquemaProducto
      .partial()
      .extend({
        foto: esquemaImagen.optional(),
        eliminarFoto: z.boolean().optional(),
      })
      .refine((valor) => !(valor.foto && valor.eliminarFoto), {
        message:
          "No puede reemplazar y eliminar la fotografía al mismo tiempo.",
      })
      .parse(req.body);
    const { foto, eliminarFoto, ...productoDatos } = datos;
    const registroAnterior = await prisma.producto.findUniqueOrThrow({
      where: { id: String(req.params.id) },
      select: { ...camposProductoCatalogo, fotoRuta: true },
    });
    const { fotoRuta: rutaAnterior, ...antes } = registroAnterior;
    const categoria = productoDatos.categoriaId
      ? await resolverCategoria(productoDatos.categoriaId)
      : null;
    const imagen = foto ? await prepararFoto(foto) : null;
    const archivo = imagen ? await guardarImagen(imagen, "productos") : null;
    let producto: ProductoCatalogo;
    try {
      producto = await prisma.producto.update({
        where: { id: String(req.params.id) },
        data: {
          ...productoDatos,
          ...(categoria ? { categoria: categoria.nombre } : {}),
          ...(archivo
            ? {
                fotoNombre: archivo.nombre,
                fotoMime: archivo.mime,
                fotoRuta: archivo.ruta,
                fotoHash: archivo.hash,
                fotoBytes: archivo.bytes,
                fotoAncho: archivo.ancho,
                fotoAlto: archivo.alto,
                fotoActualizadaEn: new Date(),
              }
            : {}),
          ...(eliminarFoto
            ? {
                fotoNombre: null,
                fotoMime: null,
                fotoRuta: null,
                fotoHash: null,
                fotoBytes: null,
                fotoAncho: null,
                fotoAlto: null,
                fotoActualizadaEn: null,
              }
            : {}),
        },
        select: camposProductoCatalogo,
      });
    } catch (error) {
      await limpiarArchivoSinReferencia(archivo?.ruta);
      throw error;
    }
    if (archivo || eliminarFoto)
      await limpiarArchivoSinReferencia(rutaAnterior);
    const antesPresentado = presentarProducto(antes);
    const presentado = presentarProducto(producto);
    await auditar(
      req,
      "ACTUALIZAR",
      "Producto",
      producto.id,
      antesPresentado,
      presentado,
    );
    res.json(presentado);
  },
);

rutasInventario.delete(
  "/productos/:id",
  permitirPermiso("INVENTARIO_GESTIONAR"),
  async (req, res) => {
    const id = String(req.params.id);
    const producto = await prisma.producto.findUniqueOrThrow({
      where: { id },
      select: camposProductoCatalogo,
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
      select: camposProductoCatalogo,
    });
    await auditar(
      req,
      "DAR_DE_BAJA",
      "Producto",
      id,
      presentarProducto(producto),
      presentarProducto(actualizado),
    );
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
        select: camposProductoCatalogo,
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
        select: camposProductoCatalogo,
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
    res.json(presentarProducto(producto));
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
