ALTER TABLE "productos"
  ADD COLUMN "fotoNombre" VARCHAR(180),
  ADD COLUMN "fotoMime" VARCHAR(40),
  ADD COLUMN "fotoContenido" BYTEA,
  ADD COLUMN "fotoHash" VARCHAR(64),
  ADD COLUMN "fotoActualizadaEn" TIMESTAMP(3);

ALTER TABLE "productos"
  ADD CONSTRAINT "productos_foto_coherente_check"
  CHECK (
    ("fotoContenido" IS NULL AND "fotoMime" IS NULL AND "fotoHash" IS NULL)
    OR
    ("fotoContenido" IS NOT NULL AND "fotoMime" IS NOT NULL AND "fotoHash" IS NOT NULL)
  );
