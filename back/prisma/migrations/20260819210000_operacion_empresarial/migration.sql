-- Operacion empresarial: proveedores, trazabilidad de pedidos, devoluciones,
-- cortes firmados y segundo factor para cuentas administrativas.
CREATE TYPE "TipoDevolucion" AS ENUM ('PARCIAL', 'TOTAL', 'CAMBIO');
CREATE TYPE "EstadoDevolucion" AS ENUM ('REGISTRADA', 'CANCELADA');

ALTER TABLE "usuarios"
  ADD COLUMN "mfaHabilitado" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "mfaSecretoCifrado" TEXT,
  ADD COLUMN "mfaUltimoContador" BIGINT;

ALTER TABLE "ventas" ADD COLUMN "metodoPago" "MetodoPago" NOT NULL DEFAULT 'EFECTIVO';

ALTER TABLE "abonos"
  ADD COLUMN "anuladoPorId" UUID,
  ADD COLUMN "motivoAnulacion" VARCHAR(500);

CREATE TABLE "proveedores" (
  "id" UUID NOT NULL,
  "nombre" VARCHAR(180) NOT NULL,
  "contacto" VARCHAR(180),
  "telefono" VARCHAR(30),
  "correo" VARCHAR(180),
  "rfc" VARCHAR(20),
  "notas" TEXT,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "proveedores_nombre_key" ON "proveedores"("nombre");
CREATE INDEX "proveedores_nombre_activo_idx" ON "proveedores"("nombre", "activo");

-- Conserva el proveedor historico de las compras existentes y lo normaliza.
INSERT INTO "proveedores" ("id", "nombre", "actualizadoEn")
SELECT gen_random_uuid(), "proveedor", CURRENT_TIMESTAMP
FROM "compras"
GROUP BY "proveedor";

ALTER TABLE "compras" ADD COLUMN "proveedorId" UUID;
UPDATE "compras" c
SET "proveedorId" = p."id"
FROM "proveedores" p
WHERE p."nombre" = c."proveedor";
ALTER TABLE "compras" ALTER COLUMN "proveedorId" SET NOT NULL;
ALTER TABLE "compras" RENAME COLUMN "proveedor" TO "proveedorNombre";

ALTER TABLE "pedidos_venta" ADD COLUMN "entregadoPorId" UUID;
ALTER TABLE "items_pedido_venta"
  ADD COLUMN "proveedorId" UUID,
  ADD COLUMN "detalleCompraId" UUID;
CREATE INDEX "items_pedido_venta_proveedorId_idx" ON "items_pedido_venta"("proveedorId");

CREATE TABLE "devoluciones" (
  "id" UUID NOT NULL,
  "folio" VARCHAR(40) NOT NULL,
  "ventaId" UUID NOT NULL,
  "pedidoId" UUID,
  "clienteId" UUID,
  "usuarioId" UUID NOT NULL,
  "tipo" "TipoDevolucion" NOT NULL,
  "estado" "EstadoDevolucion" NOT NULL DEFAULT 'REGISTRADA',
  "motivo" VARCHAR(500) NOT NULL,
  "totalDevuelto" DECIMAL(12,2) NOT NULL,
  "aplicadoSaldo" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "montoReembolsado" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "metodoReembolso" "MetodoPago",
  "evidenciaContenido" BYTEA,
  "evidenciaMime" VARCHAR(80),
  "evidenciaNombre" VARCHAR(180),
  "evidenciaHash" VARCHAR(64),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "devoluciones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "detalles_devolucion" (
  "id" UUID NOT NULL,
  "devolucionId" UUID NOT NULL,
  "detalleVentaId" UUID NOT NULL,
  "productoId" UUID NOT NULL,
  "productoNombre" VARCHAR(180) NOT NULL,
  "cantidad" INTEGER NOT NULL,
  "precioUnitario" DECIMAL(12,2) NOT NULL,
  "total" DECIMAL(12,2) NOT NULL,
  CONSTRAINT "detalles_devolucion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "devoluciones_folio_key" ON "devoluciones"("folio");
CREATE INDEX "devoluciones_ventaId_creadoEn_idx" ON "devoluciones"("ventaId", "creadoEn");
CREATE INDEX "devoluciones_clienteId_creadoEn_idx" ON "devoluciones"("clienteId", "creadoEn");
CREATE INDEX "detalles_devolucion_devolucionId_idx" ON "detalles_devolucion"("devolucionId");
CREATE INDEX "detalles_devolucion_detalleVentaId_idx" ON "detalles_devolucion"("detalleVentaId");

CREATE TABLE "cortes_caja" (
  "id" UUID NOT NULL,
  "folio" VARCHAR(40) NOT NULL,
  "usuarioOperadorId" UUID NOT NULL,
  "cerradoPorId" UUID NOT NULL,
  "fechaOperativa" DATE NOT NULL,
  "efectivoSistema" DECIMAL(12,2) NOT NULL,
  "transferenciaSistema" DECIMAL(12,2) NOT NULL,
  "tarjetaSistema" DECIMAL(12,2) NOT NULL,
  "otroSistema" DECIMAL(12,2) NOT NULL,
  "efectivoDeclarado" DECIMAL(12,2) NOT NULL,
  "transferenciaDeclarada" DECIMAL(12,2) NOT NULL,
  "tarjetaDeclarada" DECIMAL(12,2) NOT NULL,
  "otroDeclarado" DECIMAL(12,2) NOT NULL,
  "diferencia" DECIMAL(12,2) NOT NULL,
  "cantidadAbonos" INTEGER NOT NULL,
  "totalVentasContado" DECIMAL(12,2) NOT NULL,
  "cantidadVentasContado" INTEGER NOT NULL,
  "cantidadEntregas" INTEGER NOT NULL,
  "totalReembolsos" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "cantidadReembolsos" INTEGER NOT NULL DEFAULT 0,
  "firmaNombre" VARCHAR(180) NOT NULL,
  "hashIntegridad" VARCHAR(64) NOT NULL,
  "notas" TEXT,
  "cerradoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cortes_caja_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cortes_caja_folio_key" ON "cortes_caja"("folio");
CREATE UNIQUE INDEX "cortes_caja_usuarioOperadorId_fechaOperativa_key" ON "cortes_caja"("usuarioOperadorId", "fechaOperativa");
CREATE INDEX "cortes_caja_fechaOperativa_cerradoEn_idx" ON "cortes_caja"("fechaOperativa", "cerradoEn");

ALTER TABLE "abonos" ADD CONSTRAINT "abonos_anuladoPorId_fkey" FOREIGN KEY ("anuladoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "compras" ADD CONSTRAINT "compras_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pedidos_venta" ADD CONSTRAINT "pedidos_venta_entregadoPorId_fkey" FOREIGN KEY ("entregadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "items_pedido_venta" ADD CONSTRAINT "items_pedido_venta_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "items_pedido_venta" ADD CONSTRAINT "items_pedido_venta_detalleCompraId_fkey" FOREIGN KEY ("detalleCompraId") REFERENCES "detalles_compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos_venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "detalles_devolucion" ADD CONSTRAINT "detalles_devolucion_devolucionId_fkey" FOREIGN KEY ("devolucionId") REFERENCES "devoluciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "detalles_devolucion" ADD CONSTRAINT "detalles_devolucion_detalleVentaId_fkey" FOREIGN KEY ("detalleVentaId") REFERENCES "detalles_venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "detalles_devolucion" ADD CONSTRAINT "detalles_devolucion_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cortes_caja" ADD CONSTRAINT "cortes_caja_usuarioOperadorId_fkey" FOREIGN KEY ("usuarioOperadorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cortes_caja" ADD CONSTRAINT "cortes_caja_cerradoPorId_fkey" FOREIGN KEY ("cerradoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
