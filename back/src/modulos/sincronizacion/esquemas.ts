import { MotivoNoCobro, ResultadoVisita } from "@prisma/client";
import { z } from "zod";

import { esquemaAbono } from "../cobranza/servicio.js";
import { esquemaEntregaPedido } from "../pedidos/servicio.js";
import { esquemaNuevaVentaBase } from "../ventas/esquemas.js";
import { dineroPositivo } from "../../compartido/dinero.js";

export const esquemaVisitaSincronizada = z.object({
  rutaId: z.string().uuid(),
  clienteId: z.string().uuid(),
  fechaProgramada: z.coerce.date(),
  fechaVisita: z.coerce.date().default(() => new Date()),
  resultado: z.nativeEnum(ResultadoVisita),
  motivoNoCobro: z.nativeEnum(MotivoNoCobro).nullable().optional(),
  promesaPagoFecha: z.coerce.date().nullable().optional(),
  promesaPagoMonto: dineroPositivo.nullable().optional(),
  latitud: z.coerce.number().min(-90).max(90).optional(),
  longitud: z.coerce.number().min(-180).max(180).optional(),
  notas: z.string().trim().max(1000).optional(),
});

const identificadorOperacion = z.string().trim().min(8).max(100);
const hashIntegridad = z
  .string()
  .trim()
  .regex(/^[a-f0-9]{128}$/i);
const metadatosIntegridad = {
  secuencia: z.coerce.number().int().positive(),
  hashAnterior: z.union([z.literal("GENESIS"), hashIntegridad]),
  creadoEn: z.coerce.date(),
  hashIntegridad,
};

export const esquemaLoteSincronizacion = z.object({
  idLoteCliente: identificadorOperacion,
  dispositivoId: z.string().trim().min(3).max(120),
  huellaIntegridad: hashIntegridad,
  operaciones: z
    .array(
      z.discriminatedUnion("tipo", [
        z.object({
          idOperacion: identificadorOperacion,
          tipo: z.literal("VISITA"),
          ...metadatosIntegridad,
          datos: esquemaVisitaSincronizada,
        }),
        z.object({
          idOperacion: identificadorOperacion,
          tipo: z.literal("ABONO"),
          ...metadatosIntegridad,
          visitaOperacionId: identificadorOperacion.optional(),
          datos: esquemaAbono.omit({ idOperacionMovil: true, visitaId: true }),
        }),
        z.object({
          idOperacion: identificadorOperacion,
          tipo: z.literal("VENTA"),
          ...metadatosIntegridad,
          datos: esquemaNuevaVentaBase.omit({ idOperacionMovil: true }),
        }),
        z.object({
          idOperacion: identificadorOperacion,
          tipo: z.literal("ENTREGA"),
          ...metadatosIntegridad,
          datos: esquemaEntregaPedido
            .omit({ idOperacionMovil: true, pedidoId: true })
            .extend({ pedidoId: z.string().uuid() }),
        }),
      ]),
    )
    .min(1)
    .max(500),
});

export type LoteSincronizacionEntrada = z.infer<
  typeof esquemaLoteSincronizacion
>;
export type OperacionSincronizacion =
  LoteSincronizacionEntrada["operaciones"][number];
