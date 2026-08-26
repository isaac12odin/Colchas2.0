import { PeriodicidadPago, TipoVenta } from "@prisma/client";
import { z } from "zod";
import { dineroNoNegativo, dineroPositivo } from "../../compartido/dinero.js";

export const esquemaNuevaVentaBase = z.object({
  idOperacionMovil: z.string().trim().min(8).max(100).optional(),
  clienteId: z.string().uuid().nullable().optional(),
  numeroTarjeta: z.string().trim().min(3).max(30).optional(),
  tipo: z.nativeEnum(TipoVenta),
  descuento: dineroNoNegativo.default(0),
  anticipo: dineroNoNegativo.default(0),
  metodoAnticipo: z
    .enum(["EFECTIVO", "TRANSFERENCIA", "TARJETA", "OTRO"])
    .default("EFECTIVO"),
  fechaVenta: z.coerce.date().default(() => new Date()),
  notas: z.string().trim().max(1000).optional(),
  items: z
    .array(
      z.object({
        productoId: z.string().uuid(),
        cantidad: z.coerce.number().int().positive(),
        precioUnitario: dineroPositivo.optional(),
      }),
    )
    .min(1),
  plan: z
    .object({
      periodicidad: z.nativeEnum(PeriodicidadPago),
      montoCuota: dineroPositivo,
      primerVencimiento: z.coerce.date(),
    })
    .optional(),
});

export const esquemaNuevaVenta = esquemaNuevaVentaBase.superRefine(
  (datos, contexto) => {
    if (
      datos.plan &&
      datos.plan.primerVencimiento.getTime() < datos.fechaVenta.getTime()
    ) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["plan", "primerVencimiento"],
        message: "El primer vencimiento no puede ser anterior a la venta.",
      });
    }
  },
);

export type NuevaVenta = z.infer<typeof esquemaNuevaVenta>;
