-- La ruta tiene un propietario operativo explícito. Las rutas existentes quedan
-- sin asignar y por ello ningún cobrador puede verlas hasta que un administrador
-- las asigne.
ALTER TABLE "rutas" ADD COLUMN "cobradorId" UUID;
CREATE INDEX "rutas_cobradorId_activa_diaSemana_idx"
  ON "rutas"("cobradorId", "activa", "diaSemana");
ALTER TABLE "rutas" ADD CONSTRAINT "rutas_cobradorId_fkey"
  FOREIGN KEY ("cobradorId") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Ancla de la cadena criptográfica que el servidor valida por usuario/equipo.
CREATE TABLE "dispositivos_sincronizacion" (
  "id" UUID NOT NULL,
  "usuarioId" UUID NOT NULL,
  "dispositivoId" VARCHAR(120) NOT NULL,
  "claveIntegridadCifrada" TEXT NOT NULL,
  "ultimaSecuencia" INTEGER NOT NULL DEFAULT 0,
  "ultimoHash" VARCHAR(128) NOT NULL DEFAULT 'GENESIS',
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "registradoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ultimoUsoEn" TIMESTAMP(3),
  CONSTRAINT "dispositivos_sincronizacion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "dispositivos_sincronizacion_usuarioId_dispositivoId_key"
  ON "dispositivos_sincronizacion"("usuarioId", "dispositivoId");
CREATE INDEX "dispositivos_sincronizacion_usuarioId_activo_idx"
  ON "dispositivos_sincronizacion"("usuarioId", "activo");
ALTER TABLE "dispositivos_sincronizacion"
  ADD CONSTRAINT "dispositivos_sincronizacion_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "operaciones_sincronizadas"
  ADD COLUMN "secuencia" INTEGER,
  ADD COLUMN "hashAnterior" VARCHAR(128),
  ADD COLUMN "creadaEnCliente" TIMESTAMP(3);

-- Conserva los recibos del protocolo anterior para no perder idempotencia ni
-- trazabilidad. Los números negativos identifican explícitamente el legado y
-- nunca se mezclan con la cadena v3, que comienza en 1.
WITH legado AS (
  SELECT "id",
    -ROW_NUMBER() OVER (
      PARTITION BY "usuarioId", "dispositivoId"
      ORDER BY "procesadaEn", "id"
    ) AS numero
  FROM "operaciones_sincronizadas"
)
UPDATE "operaciones_sincronizadas" AS operacion
SET "secuencia" = legado.numero,
    "hashAnterior" = 'LEGACY',
    "hashContenido" = COALESCE(operacion."hashContenido", 'LEGACY:' || operacion."id"::text),
    "creadaEnCliente" = operacion."procesadaEn"
FROM legado
WHERE operacion."id" = legado."id";

ALTER TABLE "operaciones_sincronizadas"
  ALTER COLUMN "secuencia" SET NOT NULL,
  ALTER COLUMN "hashAnterior" SET NOT NULL,
  ALTER COLUMN "creadaEnCliente" SET NOT NULL,
  ALTER COLUMN "hashContenido" SET NOT NULL;
CREATE UNIQUE INDEX "operaciones_sincronizadas_usuarioId_dispositivoId_secuencia_key"
  ON "operaciones_sincronizadas"("usuarioId", "dispositivoId", "secuencia");
