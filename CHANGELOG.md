# Changelog

Los cambios relevantes de Nexo se registran aquí siguiendo Keep a Changelog y Versionado Semántico.

## [Unreleased]

### Added

- Recepciones offline terminales, revisión administrativa y reemplazo seguro de dispositivos.
- Reconciliación de saldos/existencias y temporizador operativo nocturno.
- Contrato OpenAPI validado y tipos generados para web/móvil.
- CI de backend, web, móvil, CodeQL, auditoría, SBOM y escaneo de imagen.

### Changed

- Fechas monetarias separan captura cliente, recepción servidor y fecha operativa.
- Refresh tokens usan consumo atómico, familias y detección de reutilización.
- Búsqueda telefónica usa HMAC versionado con transición para índices anteriores.
- Una ruta sólo puede estar activa cuando tiene cobrador asignado.

### Security

- Revocación inmediata mediante `tokenVersion` y validación de cuenta por petición.
- Selectores de proveedores exponen exclusivamente `id` y `nombre`.
- Huella canónica completa para reintentos de ventas, abonos y entregas.

## [1.0.0] - 2026-08-19

Primera base empresarial con cobranza, ventas, inventario, pedidos, compras, rutas, devoluciones, cortes, roles y operación offline.
