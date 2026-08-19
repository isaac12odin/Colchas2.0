-- Las visitas extraordinarias se conservan en la misma jornada, pero quedan
-- diferenciadas para auditoría, métricas y control del cobrador.
ALTER TABLE "visitas_cobranza"
ADD COLUMN "fueraDeRuta" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "visitas_cobranza_rutaId_fechaProgramada_fueraDeRuta_idx"
ON "visitas_cobranza"("rutaId", "fechaProgramada", "fueraDeRuta");
