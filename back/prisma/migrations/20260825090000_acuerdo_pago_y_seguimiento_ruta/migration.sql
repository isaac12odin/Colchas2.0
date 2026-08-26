-- El acuerdo pertenece al cliente; una venta nueva extiende el plazo sin
-- aumentar silenciosamente el abono periódico ya aceptado.
CREATE TABLE "acuerdos_pago_cliente" (
  "id" UUID NOT NULL,
  "clienteId" UUID NOT NULL,
  "periodicidad" "PeriodicidadPago" NOT NULL,
  "montoPeriodico" DECIMAL(12,2) NOT NULL,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "acuerdos_pago_cliente_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "acuerdos_pago_cliente_clienteId_key"
  ON "acuerdos_pago_cliente"("clienteId");

ALTER TABLE "acuerdos_pago_cliente"
  ADD CONSTRAINT "acuerdos_pago_cliente_clienteId_fkey"
  FOREIGN KEY ("clienteId") REFERENCES "clientes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "acuerdos_pago_cliente"
  ADD CONSTRAINT "acuerdos_pago_cliente_monto_positivo_chk"
  CHECK ("montoPeriodico" > 0);

-- Recupera el acuerdo más antiguo todavía pendiente para instalaciones
-- existentes; no modifica cuotas ni saldos históricos.
INSERT INTO "acuerdos_pago_cliente" (
  "id", "clienteId", "periodicidad", "montoPeriodico", "actualizadoEn"
)
SELECT DISTINCT ON (v."clienteId")
  gen_random_uuid(), v."clienteId", p."periodicidad", p."montoCuota",
  CURRENT_TIMESTAMP
FROM "ventas" v
JOIN "planes_pago" p ON p."ventaId" = v."id"
JOIN "cuotas" c ON c."planPagoId" = p."id"
WHERE v."clienteId" IS NOT NULL
  AND v."estado" = 'CONFIRMADA'
  AND c."estado" IN ('PENDIENTE', 'PARCIAL', 'VENCIDA')
ORDER BY v."clienteId", c."fechaVence" ASC;

CREATE TYPE "MotivoNoCobro" AS ENUM (
  'AUSENTE',
  'SIN_DINERO',
  'PROMESA_PAGO',
  'DIRECCION_INCORRECTA',
  'RECHAZO',
  'OTRO'
);

ALTER TABLE "visitas_cobranza"
  ADD COLUMN "promesaPagoMonto" DECIMAL(12,2),
  ADD COLUMN "motivoNoCobro" "MotivoNoCobro";

ALTER TABLE "visitas_cobranza"
  ADD CONSTRAINT "visitas_promesa_monto_positivo_chk"
  CHECK ("promesaPagoMonto" IS NULL OR "promesaPagoMonto" > 0);
