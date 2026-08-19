import { PeriodicidadPago, TipoVenta } from "@prisma/client";
import { z } from "zod";

export const esquemaNuevaVenta = z.object({
  idOperacionMovil: z.string().trim().min(8).max(100).optional(),
  clienteId: z.string().uuid().nullable().optional(),
  numeroTarjeta: z.string().trim().min(3).max(30).optional(),
  tipo: z.nativeEnum(TipoVenta),
  descuento: z.coerce.number().min(0).default(0),
  anticipo: z.coerce.number().min(0).default(0),
  metodoAnticipo: z
    .enum(["EFECTIVO", "TRANSFERENCIA", "TARJETA", "OTRO"])
    .default("EFECTIVO"),
  fechaVenta: z.coerce.date().default(new Date()),
  notas: z.string().trim().max(1000).optional(),
  items: z
    .array(
      z.object({
        productoId: z.string().uuid(),
        cantidad: z.coerce.number().int().positive(),
        precioUnitario: z.coerce.number().positive().optional(),
      }),
    )
    .min(1),
  plan: z
    .object({
      periodicidad: z.nativeEnum(PeriodicidadPago),
      montoCuota: z.coerce.number().positive(),
      primerVencimiento: z.coerce.date(),
    })
    .optional(),
});

export type NuevaVenta = z.infer<typeof esquemaNuevaVenta>;
