INSERT INTO "categorias_producto" ("id", "nombre", "orden", "activo", "creadoEn")
VALUES (gen_random_uuid(), 'Sin clasificar', 1000, true, CURRENT_TIMESTAMP)
ON CONFLICT ("nombre") DO UPDATE SET "activo" = true;

UPDATE "productos"
SET
  "categoriaId" = (
    SELECT "id"
    FROM "categorias_producto"
    WHERE "nombre" = 'Sin clasificar'
    LIMIT 1
  ),
  "categoria" = COALESCE(NULLIF(BTRIM("categoria"), ''), 'Sin clasificar')
WHERE "categoriaId" IS NULL;

ALTER TABLE "productos"
ALTER COLUMN "categoriaId" SET NOT NULL;
