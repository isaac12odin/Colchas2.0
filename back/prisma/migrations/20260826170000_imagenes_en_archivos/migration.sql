ALTER TABLE "productos"
  ADD COLUMN IF NOT EXISTS "fotoRuta" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "fotoBytes" INTEGER,
  ADD COLUMN IF NOT EXISTS "fotoAncho" INTEGER,
  ADD COLUMN IF NOT EXISTS "fotoAlto" INTEGER;

ALTER TABLE "devoluciones"
  ADD COLUMN IF NOT EXISTS "evidenciaRuta" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "evidenciaBytes" INTEGER,
  ADD COLUMN IF NOT EXISTS "evidenciaAncho" INTEGER,
  ADD COLUMN IF NOT EXISTS "evidenciaAlto" INTEGER;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "productos"
    WHERE "fotoContenido" IS NOT NULL
      AND (
        "fotoRuta" IS NULL OR "fotoMime" IS DISTINCT FROM 'image/webp' OR "fotoHash" IS NULL
        OR "fotoBytes" IS NULL OR "fotoAncho" IS NULL OR "fotoAlto" IS NULL
      )
  )
     OR EXISTS (
       SELECT 1 FROM "devoluciones"
       WHERE "evidenciaContenido" IS NOT NULL
         AND (
           "evidenciaRuta" IS NULL OR "evidenciaMime" IS DISTINCT FROM 'image/webp' OR "evidenciaHash" IS NULL
           OR "evidenciaBytes" IS NULL OR "evidenciaAncho" IS NULL OR "evidenciaAlto" IS NULL
         )
     )
  THEN
    RAISE EXCEPTION 'Hay imagenes binarias pendientes. Ejecute npm run db:migrar-imagenes -w back antes de aplicar esta migracion.';
  END IF;
END $$;

ALTER TABLE "productos"
  DROP CONSTRAINT IF EXISTS "productos_foto_coherente_check",
  DROP COLUMN "fotoContenido";

ALTER TABLE "devoluciones"
  DROP COLUMN "evidenciaContenido";

ALTER TABLE "productos"
  ADD CONSTRAINT "productos_foto_archivo_coherente_check"
  CHECK (
    (
      "fotoRuta" IS NULL
      AND "fotoNombre" IS NULL
      AND "fotoMime" IS NULL
      AND "fotoHash" IS NULL
      AND "fotoBytes" IS NULL
      AND "fotoAncho" IS NULL
      AND "fotoAlto" IS NULL
    )
    OR
    (
      "fotoRuta" IS NOT NULL
      AND "fotoRuta" !~ '(^/|(^|/)\.\.(/|$))'
      AND "fotoNombre" IS NOT NULL
      AND "fotoMime" = 'image/webp'
      AND "fotoHash" IS NOT NULL
      AND "fotoBytes" > 0
      AND "fotoAncho" > 0
      AND "fotoAlto" > 0
    )
  );

ALTER TABLE "devoluciones"
  ADD CONSTRAINT "devoluciones_evidencia_archivo_coherente_check"
  CHECK (
    (
      "evidenciaRuta" IS NULL
      AND "evidenciaNombre" IS NULL
      AND "evidenciaMime" IS NULL
      AND "evidenciaHash" IS NULL
      AND "evidenciaBytes" IS NULL
      AND "evidenciaAncho" IS NULL
      AND "evidenciaAlto" IS NULL
    )
    OR
    (
      "evidenciaRuta" IS NOT NULL
      AND "evidenciaRuta" !~ '(^/|(^|/)\.\.(/|$))'
      AND "evidenciaNombre" IS NOT NULL
      AND "evidenciaMime" = 'image/webp'
      AND "evidenciaHash" IS NOT NULL
      AND "evidenciaBytes" > 0
      AND "evidenciaAncho" > 0
      AND "evidenciaAlto" > 0
    )
  );
