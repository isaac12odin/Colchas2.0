-- Controles de acceso e idempotencia para operaciones provenientes del móvil.
ALTER TABLE "lotes_sincronizacion" ADD COLUMN "huellaIntegridad" VARCHAR(128);

ALTER TABLE "usuarios"
ADD COLUMN "bloqueadoHasta" TIMESTAMP(3),
ADD COLUMN "intentosFallidos" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ventas" ADD COLUMN "idOperacionMovil" VARCHAR(100);

CREATE TABLE "operaciones_sincronizadas" (
    "id" UUID NOT NULL,
    "idOperacion" VARCHAR(100) NOT NULL,
    "loteId" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "dispositivoId" VARCHAR(120) NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "entidadId" UUID,
    "hashContenido" VARCHAR(128),
    "procesadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "operaciones_sincronizadas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "operaciones_sincronizadas_idOperacion_key" ON "operaciones_sincronizadas"("idOperacion");
CREATE INDEX "operaciones_sincronizadas_dispositivoId_procesadaEn_idx" ON "operaciones_sincronizadas"("dispositivoId", "procesadaEn");
CREATE UNIQUE INDEX "ventas_idOperacionMovil_key" ON "ventas"("idOperacionMovil");

ALTER TABLE "operaciones_sincronizadas" ADD CONSTRAINT "operaciones_sincronizadas_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "lotes_sincronizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "operaciones_sincronizadas" ADD CONSTRAINT "operaciones_sincronizadas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- La aplicación valida estas reglas y PostgreSQL actúa como última barrera de
-- integridad ante errores, concurrencia o escrituras administrativas directas.
ALTER TABLE "productos" ADD CONSTRAINT "productos_existencias_no_negativas" CHECK ("existencia" >= 0 AND "existenciaMinima" >= 0);
ALTER TABLE "productos" ADD CONSTRAINT "productos_precios_validos" CHECK ("precioVenta" > 0 AND "precioCompra" >= 0);
ALTER TABLE "saldos_clientes" ADD CONSTRAINT "saldos_clientes_no_negativos" CHECK ("saldoActual" >= 0 AND "totalCargos" >= 0 AND "totalAbonos" >= 0 AND "vencidoActual" >= 0);
ALTER TABLE "movimientos_saldo" ADD CONSTRAINT "movimientos_saldo_monto_positivo" CHECK ("monto" > 0 AND "saldoAnterior" >= 0 AND "saldoNuevo" >= 0);
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_importes_validos" CHECK ("subtotal" >= 0 AND "descuento" >= 0 AND "descuento" <= "subtotal" AND "total" >= 0 AND "anticipo" >= 0 AND "anticipo" <= "total");
ALTER TABLE "detalles_venta" ADD CONSTRAINT "detalles_venta_importes_validos" CHECK ("cantidad" > 0 AND "precioUnitario" > 0 AND "costoUnitario" >= 0 AND "descuento" >= 0 AND "total" >= 0);
ALTER TABLE "planes_pago" ADD CONSTRAINT "planes_pago_valores_positivos" CHECK ("numeroCuotas" > 0 AND "montoCuota" > 0);
ALTER TABLE "cuotas" ADD CONSTRAINT "cuotas_importes_validos" CHECK ("monto" > 0 AND "montoPagado" >= 0 AND "montoPagado" <= "monto");
ALTER TABLE "abonos" ADD CONSTRAINT "abonos_monto_positivo" CHECK ("monto" > 0);
ALTER TABLE "aplicaciones_abono" ADD CONSTRAINT "aplicaciones_abono_monto_positivo" CHECK ("monto" > 0);
ALTER TABLE "compras" ADD CONSTRAINT "compras_total_no_negativo" CHECK ("total" >= 0);
ALTER TABLE "detalles_compra" ADD CONSTRAINT "detalles_compra_importes_validos" CHECK ("cantidad" > 0 AND "costoUnitario" >= 0 AND "total" >= 0);
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_valores_validos" CHECK ("cantidad" > 0 AND "existenciaAntes" >= 0 AND "existenciaDespues" >= 0);
ALTER TABLE "items_pedido_venta" ADD CONSTRAINT "items_pedido_valores_validos" CHECK ("cantidad" > 0 AND "precioEstimado" >= 0);
ALTER TABLE "lotes_sincronizacion" ADD CONSTRAINT "lotes_conteos_validos" CHECK ("totalOperaciones" >= 0 AND "exitosas" >= 0 AND "fallidas" >= 0 AND "exitosas" + "fallidas" <= "totalOperaciones");
