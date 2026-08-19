-- El autorizador aprueba la reversa; el operador identifica la caja que
-- entrega el reembolso. Son responsabilidades distintas para auditoría y corte.
ALTER TABLE "devoluciones"
  RENAME COLUMN "usuarioId" TO "autorizadoPorId";

ALTER TABLE "devoluciones"
  RENAME CONSTRAINT "devoluciones_usuarioId_fkey"
  TO "devoluciones_autorizadoPorId_fkey";

ALTER TABLE "devoluciones"
  ADD COLUMN "usuarioOperadorId" UUID;

-- La mejor atribución posible para datos anteriores es conservar al
-- autorizador si ya era operador de caja; si fue Contabilidad, usar al
-- operador de la venta únicamente cuando también era Administrador/Cobrador.
UPDATE "devoluciones" AS d
SET "usuarioOperadorId" = CASE
  WHEN autorizador."rol" IN ('ADMINISTRADOR', 'COBRADOR')
    THEN d."autorizadoPorId"
  WHEN operador_venta."rol" IN ('ADMINISTRADOR', 'COBRADOR')
    THEN venta."usuarioId"
  ELSE NULL
END
FROM "ventas" AS venta, "usuarios" AS operador_venta, "usuarios" AS autorizador
WHERE venta."id" = d."ventaId"
  AND operador_venta."id" = venta."usuarioId"
  AND autorizador."id" = d."autorizadoPorId"
  AND d."montoReembolsado" > 0;

ALTER TABLE "devoluciones"
  ADD CONSTRAINT "devoluciones_usuarioOperadorId_fkey"
  FOREIGN KEY ("usuarioOperadorId") REFERENCES "usuarios"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- NOT VALID permite conservar un legado cuya caja no pueda inferirse, pero
-- PostgreSQL sí exige operador en cada reembolso creado desde esta migración.
ALTER TABLE "devoluciones"
  ADD CONSTRAINT "devoluciones_reembolso_operador_check"
  CHECK ("montoReembolsado" <= 0 OR "usuarioOperadorId" IS NOT NULL)
  NOT VALID;

CREATE INDEX "devoluciones_usuarioOperadorId_creadoEn_idx"
  ON "devoluciones"("usuarioOperadorId", "creadoEn");
