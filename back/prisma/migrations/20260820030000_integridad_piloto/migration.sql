-- Revocación inmediata y familias de rotación de sesiones.
ALTER TABLE "usuarios"
  ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "sesiones"
  ADD COLUMN "familiaId" UUID;
UPDATE "sesiones" SET "familiaId" = "id" WHERE "familiaId" IS NULL;
ALTER TABLE "sesiones" ALTER COLUMN "familiaId" SET NOT NULL;
CREATE INDEX "sesiones_familiaId_revocadaEn_idx"
  ON "sesiones"("familiaId", "revocadaEn");

-- Una fecha capturada explica lo ocurrido en campo; la fecha operativa y la
-- recepción del servidor determinan el corte y no quedan a elección del cliente.
ALTER TABLE "ventas"
  ADD COLUMN "huellaOperacion" VARCHAR(64),
  ADD COLUMN "capturadaEnCliente" TIMESTAMP(3),
  ADD COLUMN "recibidaEnServidor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "fechaOperativa" DATE;
UPDATE "ventas"
SET "capturadaEnCliente" = "fechaVenta",
    "fechaOperativa" = ("fechaVenta" AT TIME ZONE 'America/Mexico_City')::date
WHERE "capturadaEnCliente" IS NULL OR "fechaOperativa" IS NULL;
ALTER TABLE "ventas" ALTER COLUMN "capturadaEnCliente" SET NOT NULL;
ALTER TABLE "ventas" ALTER COLUMN "capturadaEnCliente" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ventas" ALTER COLUMN "fechaOperativa" SET NOT NULL;
ALTER TABLE "ventas" ALTER COLUMN "fechaOperativa" SET DEFAULT CURRENT_DATE;
CREATE INDEX "ventas_fechaOperativa_usuarioId_estado_idx"
  ON "ventas"("fechaOperativa", "usuarioId", "estado");

ALTER TABLE "abonos"
  ADD COLUMN "huellaOperacion" VARCHAR(64),
  ADD COLUMN "capturadaEnCliente" TIMESTAMP(3),
  ADD COLUMN "recibidaEnServidor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "fechaOperativa" DATE;
UPDATE "abonos"
SET "capturadaEnCliente" = "fechaAbono",
    "fechaOperativa" = ("fechaAbono" AT TIME ZONE 'America/Mexico_City')::date
WHERE "capturadaEnCliente" IS NULL OR "fechaOperativa" IS NULL;
ALTER TABLE "abonos" ALTER COLUMN "capturadaEnCliente" SET NOT NULL;
ALTER TABLE "abonos" ALTER COLUMN "capturadaEnCliente" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "abonos" ALTER COLUMN "fechaOperativa" SET NOT NULL;
ALTER TABLE "abonos" ALTER COLUMN "fechaOperativa" SET DEFAULT CURRENT_DATE;
CREATE INDEX "abonos_fechaOperativa_usuarioId_anuladoEn_idx"
  ON "abonos"("fechaOperativa", "usuarioId", "anuladoEn");

ALTER TABLE "pedidos_venta"
  ADD COLUMN "fechaOperativaEntrega" DATE;
UPDATE "pedidos_venta"
SET "fechaOperativaEntrega" = ("entregadoEn" AT TIME ZONE 'America/Mexico_City')::date
WHERE "entregadoEn" IS NOT NULL AND "fechaOperativaEntrega" IS NULL;

-- Rechazos offline quedan visibles hasta una resolución administrativa.
ALTER TABLE "operaciones_sincronizadas"
  ADD COLUMN "requiereRevision" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "revisadaEn" TIMESTAMP(3),
  ADD COLUMN "revisadaPorId" UUID,
  ADD COLUMN "resolucion" VARCHAR(1000),
  ADD COLUMN "operacionCompensatoriaId" VARCHAR(100),
  ADD COLUMN "diferenciaRelojSegundos" INTEGER NOT NULL DEFAULT 0;
UPDATE "operaciones_sincronizadas"
SET "requiereRevision" = true
WHERE "estado" = 'RECHAZADA';
ALTER TABLE "operaciones_sincronizadas"
  ADD CONSTRAINT "operaciones_sincronizadas_revisadaPorId_fkey"
  FOREIGN KEY ("revisadaPorId") REFERENCES "usuarios"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "operaciones_sincronizadas_requiereRevision_procesadaEn_idx"
  ON "operaciones_sincronizadas"("requiereRevision", "procesadaEn");

-- Una ruta inactiva puede conservarse sin asignación histórica; una activa no.
UPDATE "rutas" SET "activa" = false
WHERE "activa" = true AND "cobradorId" IS NULL;
ALTER TABLE "rutas"
  ADD CONSTRAINT "rutas_activas_requieren_cobrador_chk"
  CHECK (NOT "activa" OR "cobradorId" IS NOT NULL);

-- Guardarraíles de dominio. NOT VALID evita que una inconsistencia histórica
-- bloquee el despliegue, pero PostgreSQL sí protege toda escritura nueva.
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_limite_credito_no_negativo_chk"
  CHECK ("limiteCredito" >= 0) NOT VALID;
ALTER TABLE "saldos_clientes" ADD CONSTRAINT "saldos_no_negativos_chk"
  CHECK ("saldoActual" >= 0 AND "totalCargos" >= 0 AND "totalAbonos" >= 0 AND "vencidoActual" >= 0) NOT VALID;
ALTER TABLE "movimientos_saldo" ADD CONSTRAINT "movimientos_saldo_monto_positivo_chk"
  CHECK ("monto" > 0 AND "saldoAnterior" >= 0 AND "saldoNuevo" >= 0) NOT VALID;
ALTER TABLE "productos" ADD CONSTRAINT "productos_existencias_precios_validos_chk"
  CHECK ("existencia" >= 0 AND "existenciaMinima" >= 0 AND "precioVenta" >= 0 AND "precioCompra" >= 0) NOT VALID;
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_importes_validos_chk"
  CHECK ("subtotal" >= 0 AND "descuento" >= 0 AND "descuento" <= "subtotal" AND "total" >= 0 AND "anticipo" >= 0 AND "anticipo" <= "total") NOT VALID;
ALTER TABLE "detalles_venta" ADD CONSTRAINT "detalles_venta_importes_validos_chk"
  CHECK ("cantidad" > 0 AND "precioUnitario" >= 0 AND "costoUnitario" >= 0 AND "descuento" >= 0 AND "total" >= 0) NOT VALID;
ALTER TABLE "planes_pago" ADD CONSTRAINT "planes_pago_validos_chk"
  CHECK ("numeroCuotas" > 0 AND "montoCuota" > 0) NOT VALID;
ALTER TABLE "cuotas" ADD CONSTRAINT "cuotas_importes_validos_chk"
  CHECK ("numero" > 0 AND "monto" > 0 AND "montoPagado" >= 0 AND "montoPagado" <= "monto") NOT VALID;
ALTER TABLE "abonos" ADD CONSTRAINT "abonos_monto_positivo_chk"
  CHECK ("monto" > 0) NOT VALID;
ALTER TABLE "aplicaciones_abono" ADD CONSTRAINT "aplicaciones_abono_monto_positivo_chk"
  CHECK ("monto" > 0) NOT VALID;
ALTER TABLE "compras" ADD CONSTRAINT "compras_total_no_negativo_chk"
  CHECK ("total" >= 0) NOT VALID;
ALTER TABLE "detalles_compra" ADD CONSTRAINT "detalles_compra_importes_validos_chk"
  CHECK ("cantidad" > 0 AND "costoUnitario" >= 0 AND "total" >= 0) NOT VALID;
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_validos_chk"
  CHECK ("cantidad" > 0 AND "existenciaAntes" >= 0 AND "existenciaDespues" >= 0) NOT VALID;
ALTER TABLE "items_pedido_venta" ADD CONSTRAINT "items_pedido_validos_chk"
  CHECK ("cantidad" > 0 AND "precioEstimado" >= 0) NOT VALID;
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_importes_validos_chk"
  CHECK ("totalDevuelto" >= 0 AND "aplicadoSaldo" >= 0 AND "montoReembolsado" >= 0 AND "aplicadoSaldo" + "montoReembolsado" <= "totalDevuelto") NOT VALID;
ALTER TABLE "detalles_devolucion" ADD CONSTRAINT "detalles_devolucion_validos_chk"
  CHECK ("cantidad" > 0 AND "precioUnitario" >= 0 AND "total" >= 0) NOT VALID;
ALTER TABLE "cortes_caja" ADD CONSTRAINT "cortes_declaraciones_no_negativas_chk"
  CHECK ("efectivoDeclarado" >= 0 AND "transferenciaDeclarada" >= 0 AND "tarjetaDeclarada" >= 0 AND "otroDeclarado" >= 0 AND "cantidadAbonos" >= 0 AND "cantidadVentasContado" >= 0 AND "cantidadEntregas" >= 0 AND "cantidadReembolsos" >= 0) NOT VALID;
ALTER TABLE "evaluaciones_riesgo" ADD CONSTRAINT "evaluaciones_porcentaje_valido_chk"
  CHECK ("porcentajePagado" >= 0 AND "porcentajePagado" <= 100) NOT VALID;
