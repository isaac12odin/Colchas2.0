DROP INDEX IF EXISTS "clientes_telefonoHash_idx";

ALTER TABLE "clientes"
  ADD COLUMN "telefonoHashVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "clientes"
  ALTER COLUMN "telefonoHashVersion" SET DEFAULT 1;

CREATE INDEX "clientes_telefonoHashVersion_telefonoHash_idx"
  ON "clientes"("telefonoHashVersion", "telefonoHash");

COMMENT ON COLUMN "clientes"."telefonoHashVersion" IS
  '0=SHA-256 legado pendiente de migración; 1=HMAC-SHA-256 con SEARCH_HMAC_KEY';
