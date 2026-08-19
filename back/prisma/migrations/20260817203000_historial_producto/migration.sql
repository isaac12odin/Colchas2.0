-- Una venta es un documento histórico: conserva cómo se llamaba el producto
-- cuando se realizó, aunque después sea renombrado o dado de baja.
ALTER TABLE "detalles_venta"
ADD COLUMN "productoNombre" VARCHAR(180),
ADD COLUMN "productoSku" VARCHAR(60),
ADD COLUMN "productoMarca" VARCHAR(120);

UPDATE "detalles_venta" AS detalle
SET
  "productoNombre" = producto."nombre",
  "productoSku" = producto."sku",
  "productoMarca" = producto."marca"
FROM "productos" AS producto
WHERE producto."id" = detalle."productoId";

ALTER TABLE "detalles_venta"
ALTER COLUMN "productoNombre" SET NOT NULL,
ALTER COLUMN "productoSku" SET NOT NULL,
ALTER COLUMN "productoMarca" SET NOT NULL;
