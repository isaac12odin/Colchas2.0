CREATE TABLE "categorias_producto" (
  "id" UUID NOT NULL,
  "nombre" VARCHAR(100) NOT NULL,
  "orden" INTEGER NOT NULL DEFAULT 0,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "categorias_producto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "categorias_producto_nombre_key"
  ON "categorias_producto"("nombre");
CREATE INDEX "categorias_producto_activo_orden_nombre_idx"
  ON "categorias_producto"("activo", "orden", "nombre");

INSERT INTO "categorias_producto" ("id", "nombre", "orden")
VALUES
  (gen_random_uuid(), 'Colcha', 10),
  (gen_random_uuid(), 'Sábana', 20),
  (gen_random_uuid(), 'Edredón', 30),
  (gen_random_uuid(), 'Toalla', 40),
  (gen_random_uuid(), 'Almohada', 50)
ON CONFLICT ("nombre") DO NOTHING;

INSERT INTO "categorias_producto" ("id", "nombre", "orden")
SELECT gen_random_uuid(), existentes.nombre, 100
FROM (
  SELECT MIN(BTRIM("categoria")) AS nombre
  FROM "productos"
  WHERE NULLIF(BTRIM("categoria"), '') IS NOT NULL
  GROUP BY LOWER(BTRIM("categoria"))
) AS existentes
WHERE NOT EXISTS (
  SELECT 1
  FROM "categorias_producto" AS catalogo
  WHERE LOWER(catalogo."nombre") = LOWER(existentes.nombre)
);

ALTER TABLE "productos" ADD COLUMN "categoriaId" UUID;

UPDATE "productos" AS producto
SET "categoriaId" = categoria."id",
    "categoria" = categoria."nombre"
FROM "categorias_producto" AS categoria
WHERE LOWER(BTRIM(producto."categoria")) = LOWER(categoria."nombre");

CREATE INDEX "productos_categoriaId_activo_idx"
  ON "productos"("categoriaId", "activo");

ALTER TABLE "productos"
  ADD CONSTRAINT "productos_categoriaId_fkey"
  FOREIGN KEY ("categoriaId") REFERENCES "categorias_producto"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
