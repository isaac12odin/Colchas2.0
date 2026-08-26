ALTER TABLE "operaciones_sincronizadas"
  ADD COLUMN "estado" VARCHAR(20) NOT NULL DEFAULT 'CONFIRMADA',
  ADD COLUMN "codigoError" VARCHAR(80),
  ADD COLUMN "mensajeError" VARCHAR(500);

ALTER TABLE "operaciones_sincronizadas"
  ADD CONSTRAINT "operaciones_sincronizadas_estado_check"
  CHECK ("estado" IN ('CONFIRMADA', 'RECHAZADA'));
