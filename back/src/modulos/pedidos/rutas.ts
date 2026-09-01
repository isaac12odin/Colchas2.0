import { Router } from "express";
import { EstadoPedido } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../infraestructura/prisma.js";
import { autenticar, permitirPermiso } from "../../seguridad/middlewares.js";
import { rolTienePermiso } from "../../seguridad/permisos.js";
import { ErrorAplicacion } from "../../compartido/errores.js";
import { validarFechaPlaneada } from "../../compartido/fechas.js";
import { crearPagina, esquemaPaginacion } from "../../compartido/paginacion.js";
import { entregarPedido, esquemaEntregaPedido } from "./servicio.js";
import {
  asegurarClienteAsignado,
  bloquearPedido,
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

export const esquemaConsultaPedidos = esquemaPaginacion.extend({
  estado: z.nativeEnum(EstadoPedido).optional(),
  clienteId: z.string().uuid().optional(),
  pedidoId: z.string().uuid().optional(),
});

rutasPedidos.get(
  "/",
  permitirPermiso("PEDIDOS_CONSULTAR"),
  async (req, res) => {
    const { pagina, limite, buscar, estado, clienteId, pedidoId } =
      esquemaConsultaPedidos.parse(req.query);
    const filtroTexto = buscar
      ? {
          OR: [
            { folio: { contains: buscar, mode: "insensitive" as const } },
            {
              cliente: {
                nombreCompleto: {
                  contains: buscar,
                  mode: "insensitive" as const,
                },
              },
            },
            {
              cliente: {
                numeroTarjeta: {
                  contains: buscar,
                  mode: "insensitive" as const,
                },
              },
            },
            ...(buscar.replace(/\D/g, "").length >= 4
              ? [
                  {
                    cliente: {
                      telefonoUltimos4: {
                        contains: buscar.replace(/\D/g, "").slice(-4),
                      },
                    },
                  },
                ]
              : []),
            {
              items: {
                some: {
                  OR: [
                    {
                      descripcion: {
                        contains: buscar,
                        mode: "insensitive" as const,
                      },
                    },
                    {
                      producto: {
                        nombre: {
                          contains: buscar,
                          mode: "insensitive" as const,
                        },
                      },
                    },
                    {
                      producto: {
                        sku: {
                          contains: buscar,
                          mode: "insensitive" as const,
                        },
                      },
                    },
                  ],
                },
              },
            },
          ],
        }
      : {};
    const where = {
      ...(estado ? { estado } : {}),
      ...(clienteId ? { clienteId } : {}),
      ...(pedidoId ? { id: pedidoId } : {}),
      cliente: filtroClientesDelActor(req.usuario!),
      ...filtroTexto,
    };
    const [datos, total] = await prisma.$transaction([
      prisma.pedidoVenta.findMany({
        where,
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
        orderBy: [{ estado: "asc" }, { fechaCompromiso: "asc" }, { id: "asc" }],
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      prisma.pedidoVenta.count({ where }),
    ]);
    res.json(crearPagina(datos, total, pagina, limite));
  },
);

rutasPedidos.post("/", permitirPermiso("PEDIDOS_CREAR"), async (req, res) => {
  const datos = esquemaPedido.parse(req.body);
  if (datos.fechaCompromiso)
    validarFechaPlaneada(
      datos.fechaCompromiso,
      new Date(),
      "La fecha compromiso",
    );
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

rutasPedidos.patch("/:id/estado", async (req, res) => {
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
  const permisoRequerido =
    estado === "PEDIDO_PROVEEDOR"
      ? "PEDIDOS_ASIGNAR_PROVEEDOR"
      : "PEDIDOS_ALMACEN";
  if (!rolTienePermiso(req.usuario!.rol, permisoRequerido))
    throw new ErrorAplicacion(
      "SIN_PERMISO",
      estado === "PEDIDO_PROVEEDOR"
        ? "Solo Administracion, Contabilidad o Almacen pueden asignar al proveedor."
        : "Solo Administracion o Almacen pueden recibir, preparar o cancelar el pedido.",
      403,
    );
  if (proveedores?.length && estado !== "PEDIDO_PROVEEDOR")
    throw new ErrorAplicacion(
      "ASIGNACION_FUERA_DE_ETAPA",
      "El proveedor se asigna antes de pedir la mercancia, no durante otra etapa.",
      422,
    );
  if (estado === "ENTREGADO")
    throw new ErrorAplicacion(
      "USE_ENTREGA",
      "Use la accion de entrega para generar la venta y el saldo.",
      422,
    );
  const pedidoId = String(req.params.id);
  const pedido = await prisma.$transaction(async (tx) => {
    // Serializa cambios del mismo pedido para evitar dos avances simultáneos.
    await bloquearPedido(tx, pedidoId);
    const actual = await tx.pedidoVenta.findUniqueOrThrow({
      where: { id: pedidoId },
    });
    if (!transiciones[actual.estado].includes(estado))
      throw new ErrorAplicacion(
        "TRANSICION_INVALIDA",
        `No se puede pasar de ${actual.estado} a ${estado}.`,
        422,
      );
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
    if (
      ["PEDIDO_PROVEEDOR", "RECIBIDO_ALMACEN"].includes(estado) &&
      (await tx.itemPedidoVenta.count({
        where: { pedidoId: actual.id, proveedorId: null },
      })) > 0
    ) {
      throw new ErrorAplicacion(
        "PROVEEDOR_REQUERIDO",
        "Elija quién surtirá cada artículo antes de continuar el pedido.",
        422,
      );
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
        datosDespues: {
          estado,
          ...(estado === "PEDIDO_PROVEEDOR"
            ? {
                proveedores: proveedores?.map((item) => ({
                  itemPedidoId: item.itemPedidoId,
                  proveedorId: item.proveedorId,
                })),
              }
            : {}),
        },
      },
    });
    return actualizado;
  });
  res.json(pedido);
});

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
