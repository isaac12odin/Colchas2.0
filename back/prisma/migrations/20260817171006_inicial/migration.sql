-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMINISTRADOR', 'CONTABLE', 'ALMACENISTA', 'COBRADOR');

-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO');

-- CreateEnum
CREATE TYPE "TipoVenta" AS ENUM ('CREDITO', 'CONTADO', 'PUBLICO');

-- CreateEnum
CREATE TYPE "EstadoVenta" AS ENUM ('BORRADOR', 'CONFIRMADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "PeriodicidadPago" AS ENUM ('SEMANAL', 'QUINCENAL', 'MENSUAL');

-- CreateEnum
CREATE TYPE "EstadoCuota" AS ENUM ('PENDIENTE', 'PARCIAL', 'PAGADA', 'VENCIDA');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoMovimientoInventario" AS ENUM ('ENTRADA_COMPRA', 'SALIDA_VENTA', 'ENTRADA_DEVOLUCION', 'SALIDA_MERMA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'RESERVA_PEDIDO', 'LIBERACION_RESERVA');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('PENDIENTE_PEDIR', 'PEDIDO_PROVEEDOR', 'RECIBIDO_ALMACEN', 'LISTO_ENTREGA', 'ENTREGADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "ResultadoVisita" AS ENUM ('PAGO', 'NO_PAGO', 'AUSENTE', 'REPROGRAMADO', 'ENTREGA');

-- CreateEnum
CREATE TYPE "NivelRiesgo" AS ENUM ('BAJO', 'MEDIO', 'ALTO', 'CRITICO');

-- CreateEnum
CREATE TYPE "TipoMovimientoSaldo" AS ENUM ('CARGO_VENTA', 'ABONO', 'AJUSTE_CARGO', 'AJUSTE_ABONO', 'CANCELACION_VENTA');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "correo" VARCHAR(180) NOT NULL,
    "hashContrasena" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "debeCambiarContrasena" BOOLEAN NOT NULL DEFAULT false,
    "ultimoAcceso" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones" (
    "id" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "hashToken" TEXT NOT NULL,
    "agenteUsuario" TEXT,
    "ip" TEXT,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "revocadaEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "localidades" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "estado" VARCHAR(120) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "localidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rutas" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "diaSemana" "DiaSemana" NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rutas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rutas_localidades" (
    "rutaId" UUID NOT NULL,
    "localidadId" UUID NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rutas_localidades_pkey" PRIMARY KEY ("rutaId","localidadId")
);

-- CreateTable
CREATE TABLE "rutas_clientes" (
    "rutaId" UUID NOT NULL,
    "clienteId" UUID NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "rutas_clientes_pkey" PRIMARY KEY ("rutaId","clienteId")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" UUID NOT NULL,
    "nombreCompleto" VARCHAR(180) NOT NULL,
    "telefonoCifrado" TEXT NOT NULL,
    "telefonoHash" VARCHAR(64),
    "telefonoUltimos4" VARCHAR(4),
    "direccionCifrada" TEXT NOT NULL,
    "numeroTarjeta" VARCHAR(30),
    "localidadId" UUID NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "limiteCredito" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saldos_clientes" (
    "id" UUID NOT NULL,
    "clienteId" UUID NOT NULL,
    "saldoActual" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalCargos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAbonos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vencidoActual" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saldos_clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_saldo" (
    "id" UUID NOT NULL,
    "clienteId" UUID NOT NULL,
    "tipo" "TipoMovimientoSaldo" NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "saldoAnterior" DECIMAL(12,2) NOT NULL,
    "saldoNuevo" DECIMAL(12,2) NOT NULL,
    "referenciaId" UUID,
    "concepto" VARCHAR(200) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_saldo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" UUID NOT NULL,
    "sku" VARCHAR(60) NOT NULL,
    "nombre" VARCHAR(180) NOT NULL,
    "marca" VARCHAR(120) NOT NULL,
    "categoria" VARCHAR(100),
    "codigoBarras" VARCHAR(100),
    "codigoQr" VARCHAR(200),
    "existencia" INTEGER NOT NULL DEFAULT 0,
    "existenciaMinima" INTEGER NOT NULL DEFAULT 0,
    "precioVenta" DECIMAL(12,2) NOT NULL,
    "precioCompra" DECIMAL(12,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas" (
    "id" UUID NOT NULL,
    "folio" VARCHAR(40) NOT NULL,
    "clienteId" UUID,
    "usuarioId" UUID NOT NULL,
    "tipo" "TipoVenta" NOT NULL,
    "estado" "EstadoVenta" NOT NULL DEFAULT 'BORRADOR',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "anticipo" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "fechaVenta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmadaEn" TIMESTAMP(3),
    "canceladaEn" TIMESTAMP(3),
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalles_venta" (
    "id" UUID NOT NULL,
    "ventaId" UUID NOT NULL,
    "productoId" UUID NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "costoUnitario" DECIMAL(12,2) NOT NULL,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "detalles_venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planes_pago" (
    "id" UUID NOT NULL,
    "ventaId" UUID NOT NULL,
    "periodicidad" "PeriodicidadPago" NOT NULL,
    "numeroCuotas" INTEGER NOT NULL,
    "montoCuota" DECIMAL(12,2) NOT NULL,
    "primerVencimiento" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planes_pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuotas" (
    "id" UUID NOT NULL,
    "planPagoId" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "fechaVence" TIMESTAMP(3) NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "montoPagado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estado" "EstadoCuota" NOT NULL DEFAULT 'PENDIENTE',
    "pagadaEn" TIMESTAMP(3),

    CONSTRAINT "cuotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abonos" (
    "id" UUID NOT NULL,
    "clienteId" UUID NOT NULL,
    "ventaId" UUID,
    "usuarioId" UUID NOT NULL,
    "visitaId" UUID,
    "idOperacionMovil" VARCHAR(100),
    "monto" DECIMAL(12,2) NOT NULL,
    "metodo" "MetodoPago" NOT NULL DEFAULT 'EFECTIVO',
    "fechaAbono" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referencia" VARCHAR(120),
    "notas" TEXT,
    "anuladoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abonos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aplicaciones_abono" (
    "abonoId" UUID NOT NULL,
    "cuotaId" UUID NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "aplicaciones_abono_pkey" PRIMARY KEY ("abonoId","cuotaId")
);

-- CreateTable
CREATE TABLE "compras" (
    "id" UUID NOT NULL,
    "folio" VARCHAR(40) NOT NULL,
    "proveedor" VARCHAR(180) NOT NULL,
    "usuarioId" UUID NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "fechaCompra" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalles_compra" (
    "id" UUID NOT NULL,
    "compraId" UUID NOT NULL,
    "productoId" UUID NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "costoUnitario" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "detalles_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_inventario" (
    "id" UUID NOT NULL,
    "productoId" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "tipo" "TipoMovimientoInventario" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "existenciaAntes" INTEGER NOT NULL,
    "existenciaDespues" INTEGER NOT NULL,
    "referenciaTipo" VARCHAR(40),
    "referenciaId" UUID,
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos_venta" (
    "id" UUID NOT NULL,
    "folio" VARCHAR(40) NOT NULL,
    "clienteId" UUID NOT NULL,
    "ventaId" UUID,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'PENDIENTE_PEDIR',
    "fechaCompromiso" TIMESTAMP(3),
    "recibidoEn" TIMESTAMP(3),
    "entregadoEn" TIMESTAMP(3),
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items_pedido_venta" (
    "id" UUID NOT NULL,
    "pedidoId" UUID NOT NULL,
    "productoId" UUID,
    "descripcion" VARCHAR(200) NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioEstimado" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "items_pedido_venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitas_cobranza" (
    "id" UUID NOT NULL,
    "rutaId" UUID NOT NULL,
    "clienteId" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "idOperacionMovil" VARCHAR(100),
    "fechaProgramada" TIMESTAMP(3) NOT NULL,
    "fechaVisita" TIMESTAMP(3),
    "resultado" "ResultadoVisita",
    "promesaPagoFecha" TIMESTAMP(3),
    "latitud" DECIMAL(10,7),
    "longitud" DECIMAL(10,7),
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitas_cobranza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluaciones_riesgo" (
    "id" UUID NOT NULL,
    "clienteId" UUID NOT NULL,
    "puntuacion" INTEGER NOT NULL,
    "nivel" "NivelRiesgo" NOT NULL,
    "cuotasVencidas" INTEGER NOT NULL,
    "diasMoraMaximos" INTEGER NOT NULL,
    "porcentajePagado" DECIMAL(5,2) NOT NULL,
    "visitasSinPago" INTEGER NOT NULL,
    "razon" TEXT NOT NULL,
    "calculadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluaciones_riesgo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lotes_sincronizacion" (
    "id" UUID NOT NULL,
    "dispositivoId" VARCHAR(120) NOT NULL,
    "usuarioId" UUID NOT NULL,
    "idLoteCliente" VARCHAR(100) NOT NULL,
    "totalOperaciones" INTEGER NOT NULL,
    "exitosas" INTEGER NOT NULL,
    "fallidas" INTEGER NOT NULL,
    "detalleError" JSONB,
    "recibidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lotes_sincronizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" UUID NOT NULL,
    "usuarioId" UUID,
    "accion" VARCHAR(80) NOT NULL,
    "entidad" VARCHAR(80) NOT NULL,
    "entidadId" TEXT,
    "datosAntes" JSONB,
    "datosDespues" JSONB,
    "ip" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");

-- CreateIndex
CREATE INDEX "usuarios_rol_activo_idx" ON "usuarios"("rol", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_hashToken_key" ON "sesiones"("hashToken");

-- CreateIndex
CREATE INDEX "sesiones_usuarioId_expiraEn_idx" ON "sesiones"("usuarioId", "expiraEn");

-- CreateIndex
CREATE INDEX "localidades_estado_nombre_idx" ON "localidades"("estado", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "localidades_nombre_estado_key" ON "localidades"("nombre", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "rutas_nombre_key" ON "rutas"("nombre");

-- CreateIndex
CREATE INDEX "rutas_diaSemana_activa_idx" ON "rutas"("diaSemana", "activa");

-- CreateIndex
CREATE INDEX "rutas_clientes_rutaId_orden_idx" ON "rutas_clientes"("rutaId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_numeroTarjeta_key" ON "clientes"("numeroTarjeta");

-- CreateIndex
CREATE INDEX "clientes_localidadId_activo_idx" ON "clientes"("localidadId", "activo");

-- CreateIndex
CREATE INDEX "clientes_nombreCompleto_idx" ON "clientes"("nombreCompleto");

-- CreateIndex
CREATE INDEX "clientes_telefonoHash_idx" ON "clientes"("telefonoHash");

-- CreateIndex
CREATE UNIQUE INDEX "saldos_clientes_clienteId_key" ON "saldos_clientes"("clienteId");

-- CreateIndex
CREATE INDEX "saldos_clientes_saldoActual_idx" ON "saldos_clientes"("saldoActual");

-- CreateIndex
CREATE INDEX "movimientos_saldo_clienteId_creadoEn_idx" ON "movimientos_saldo"("clienteId", "creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "productos_sku_key" ON "productos"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "productos_codigoBarras_key" ON "productos"("codigoBarras");

-- CreateIndex
CREATE UNIQUE INDEX "productos_codigoQr_key" ON "productos"("codigoQr");

-- CreateIndex
CREATE INDEX "productos_nombre_marca_idx" ON "productos"("nombre", "marca");

-- CreateIndex
CREATE INDEX "productos_existencia_existenciaMinima_idx" ON "productos"("existencia", "existenciaMinima");

-- CreateIndex
CREATE UNIQUE INDEX "ventas_folio_key" ON "ventas"("folio");

-- CreateIndex
CREATE INDEX "ventas_clienteId_fechaVenta_idx" ON "ventas"("clienteId", "fechaVenta");

-- CreateIndex
CREATE INDEX "ventas_fechaVenta_estado_idx" ON "ventas"("fechaVenta", "estado");

-- CreateIndex
CREATE INDEX "detalles_venta_ventaId_idx" ON "detalles_venta"("ventaId");

-- CreateIndex
CREATE INDEX "detalles_venta_productoId_idx" ON "detalles_venta"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "planes_pago_ventaId_key" ON "planes_pago"("ventaId");

-- CreateIndex
CREATE INDEX "cuotas_fechaVence_estado_idx" ON "cuotas"("fechaVence", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "cuotas_planPagoId_numero_key" ON "cuotas"("planPagoId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "abonos_idOperacionMovil_key" ON "abonos"("idOperacionMovil");

-- CreateIndex
CREATE INDEX "abonos_clienteId_fechaAbono_idx" ON "abonos"("clienteId", "fechaAbono");

-- CreateIndex
CREATE INDEX "abonos_usuarioId_fechaAbono_idx" ON "abonos"("usuarioId", "fechaAbono");

-- CreateIndex
CREATE UNIQUE INDEX "compras_folio_key" ON "compras"("folio");

-- CreateIndex
CREATE INDEX "compras_fechaCompra_idx" ON "compras"("fechaCompra");

-- CreateIndex
CREATE INDEX "detalles_compra_compraId_idx" ON "detalles_compra"("compraId");

-- CreateIndex
CREATE INDEX "movimientos_inventario_productoId_creadoEn_idx" ON "movimientos_inventario"("productoId", "creadoEn");

-- CreateIndex
CREATE INDEX "movimientos_inventario_referenciaTipo_referenciaId_idx" ON "movimientos_inventario"("referenciaTipo", "referenciaId");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_venta_folio_key" ON "pedidos_venta"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_venta_ventaId_key" ON "pedidos_venta"("ventaId");

-- CreateIndex
CREATE INDEX "pedidos_venta_estado_fechaCompromiso_idx" ON "pedidos_venta"("estado", "fechaCompromiso");

-- CreateIndex
CREATE INDEX "pedidos_venta_clienteId_estado_idx" ON "pedidos_venta"("clienteId", "estado");

-- CreateIndex
CREATE INDEX "items_pedido_venta_pedidoId_idx" ON "items_pedido_venta"("pedidoId");

-- CreateIndex
CREATE UNIQUE INDEX "visitas_cobranza_idOperacionMovil_key" ON "visitas_cobranza"("idOperacionMovil");

-- CreateIndex
CREATE INDEX "visitas_cobranza_rutaId_fechaProgramada_idx" ON "visitas_cobranza"("rutaId", "fechaProgramada");

-- CreateIndex
CREATE INDEX "visitas_cobranza_usuarioId_fechaProgramada_idx" ON "visitas_cobranza"("usuarioId", "fechaProgramada");

-- CreateIndex
CREATE UNIQUE INDEX "visitas_cobranza_rutaId_clienteId_fechaProgramada_key" ON "visitas_cobranza"("rutaId", "clienteId", "fechaProgramada");

-- CreateIndex
CREATE INDEX "evaluaciones_riesgo_clienteId_calculadaEn_idx" ON "evaluaciones_riesgo"("clienteId", "calculadaEn");

-- CreateIndex
CREATE INDEX "evaluaciones_riesgo_nivel_puntuacion_idx" ON "evaluaciones_riesgo"("nivel", "puntuacion");

-- CreateIndex
CREATE UNIQUE INDEX "lotes_sincronizacion_idLoteCliente_key" ON "lotes_sincronizacion"("idLoteCliente");

-- CreateIndex
CREATE INDEX "lotes_sincronizacion_dispositivoId_recibidoEn_idx" ON "lotes_sincronizacion"("dispositivoId", "recibidoEn");

-- CreateIndex
CREATE INDEX "auditoria_entidad_entidadId_idx" ON "auditoria"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "auditoria_usuarioId_creadoEn_idx" ON "auditoria"("usuarioId", "creadoEn");

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rutas_localidades" ADD CONSTRAINT "rutas_localidades_rutaId_fkey" FOREIGN KEY ("rutaId") REFERENCES "rutas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rutas_localidades" ADD CONSTRAINT "rutas_localidades_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "localidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rutas_clientes" ADD CONSTRAINT "rutas_clientes_rutaId_fkey" FOREIGN KEY ("rutaId") REFERENCES "rutas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rutas_clientes" ADD CONSTRAINT "rutas_clientes_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "localidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saldos_clientes" ADD CONSTRAINT "saldos_clientes_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_saldo" ADD CONSTRAINT "movimientos_saldo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_venta" ADD CONSTRAINT "detalles_venta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_venta" ADD CONSTRAINT "detalles_venta_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planes_pago" ADD CONSTRAINT "planes_pago_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuotas" ADD CONSTRAINT "cuotas_planPagoId_fkey" FOREIGN KEY ("planPagoId") REFERENCES "planes_pago"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonos" ADD CONSTRAINT "abonos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonos" ADD CONSTRAINT "abonos_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonos" ADD CONSTRAINT "abonos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonos" ADD CONSTRAINT "abonos_visitaId_fkey" FOREIGN KEY ("visitaId") REFERENCES "visitas_cobranza"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aplicaciones_abono" ADD CONSTRAINT "aplicaciones_abono_abonoId_fkey" FOREIGN KEY ("abonoId") REFERENCES "abonos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aplicaciones_abono" ADD CONSTRAINT "aplicaciones_abono_cuotaId_fkey" FOREIGN KEY ("cuotaId") REFERENCES "cuotas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_compra" ADD CONSTRAINT "detalles_compra_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_compra" ADD CONSTRAINT "detalles_compra_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_venta" ADD CONSTRAINT "pedidos_venta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_venta" ADD CONSTRAINT "pedidos_venta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_pedido_venta" ADD CONSTRAINT "items_pedido_venta_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos_venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_pedido_venta" ADD CONSTRAINT "items_pedido_venta_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas_cobranza" ADD CONSTRAINT "visitas_cobranza_rutaId_fkey" FOREIGN KEY ("rutaId") REFERENCES "rutas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas_cobranza" ADD CONSTRAINT "visitas_cobranza_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas_cobranza" ADD CONSTRAINT "visitas_cobranza_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluaciones_riesgo" ADD CONSTRAINT "evaluaciones_riesgo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes_sincronizacion" ADD CONSTRAINT "lotes_sincronizacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
