import { Prisma, RolUsuario } from "@prisma/client";

import { ErrorAplicacion } from "../compartido/errores.js";

export interface ActorDatos {
  id: string;
  rol: RolUsuario;
}

/**
 * El rol define capacidades; este filtro define qué filas puede tocar.
 * Un cobrador sólo recibe clientes vinculados a una ruta activa que le fue
 * asignada explícitamente por un administrador.
 */
export function filtroClientesDelActor(
  actor: ActorDatos,
): Prisma.ClienteWhereInput {
  if (actor.rol !== RolUsuario.COBRADOR) return {};
  return {
    rutas: {
      some: {
        activo: true,
        ruta: { activa: true, cobradorId: actor.id },
      },
    },
  };
}

export function filtroRutasDelActor(actor: ActorDatos): Prisma.RutaWhereInput {
  return actor.rol === RolUsuario.COBRADOR ? { cobradorId: actor.id } : {};
}

export function filtroVentasDelActor(
  actor: ActorDatos,
): Prisma.VentaWhereInput {
  if (actor.rol === RolUsuario.COBRADOR) {
    return {
      OR: [
        { usuarioId: actor.id },
        { cliente: { is: filtroClientesDelActor(actor) } },
      ],
    };
  }
  if (actor.rol === RolUsuario.VENDEDOR) return { usuarioId: actor.id };
  return {};
}

export async function asegurarClienteAsignado(
  tx: Prisma.TransactionClient,
  actor: ActorDatos,
  clienteId: string,
) {
  if (actor.rol !== RolUsuario.COBRADOR) return;
  const permitido = await tx.cliente.count({
    where: { id: clienteId, activo: true, ...filtroClientesDelActor(actor) },
  });
  if (!permitido) {
    throw new ErrorAplicacion(
      "CLIENTE_NO_ASIGNADO",
      "El cliente no pertenece a una ruta activa asignada a este cobrador.",
      403,
    );
  }
}

/** Evita carreras de saldo entre venta, anticipo y abono del mismo cliente. */
export async function bloquearCliente(
  tx: Prisma.TransactionClient,
  clienteId: string,
) {
  await tx.$queryRaw`
    SELECT 1::integer AS bloqueado
    FROM (
      SELECT pg_advisory_xact_lock(hashtext(${`nexo:cliente:${clienteId}`}))
    ) AS candado
  `;
}

/** Serializa devoluciones y cancelaciones que consumen unidades de una venta. */
export async function bloquearVenta(
  tx: Prisma.TransactionClient,
  ventaId: string,
) {
  await tx.$queryRaw`
    SELECT 1::integer AS bloqueado
    FROM (
      SELECT pg_advisory_xact_lock(hashtext(${`nexo:venta:${ventaId}`}))
    ) AS candado
  `;
}

/** Evita que dos operadores avancen o reasignen el mismo pedido a la vez. */
export async function bloquearPedido(
  tx: Prisma.TransactionClient,
  pedidoId: string,
) {
  await tx.$queryRaw`
    SELECT 1::integer AS bloqueado
    FROM (
      SELECT pg_advisory_xact_lock(hashtext(${`nexo:pedido:${pedidoId}`}))
    ) AS candado
  `;
}

export async function asegurarRutaAsignada(
  tx: Prisma.TransactionClient,
  actor: ActorDatos,
  rutaId: string,
) {
  if (actor.rol !== RolUsuario.COBRADOR) return;
  const permitida = await tx.ruta.count({
    where: { id: rutaId, activa: true, cobradorId: actor.id },
  });
  if (!permitida) {
    throw new ErrorAplicacion(
      "RUTA_NO_ASIGNADA",
      "La ruta no está asignada a este cobrador.",
      403,
    );
  }
}
