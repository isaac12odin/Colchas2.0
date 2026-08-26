# Invariantes normativas del negocio

Este documento define reglas que ninguna interfaz, importación, tarea ni integración puede omitir. Si el código y este documento difieren, se detiene la liberación y se corrige uno de ambos junto con sus pruebas.

## Dinero

- Toda entrada monetaria es finita, no admite `NaN`/`Infinity` y tiene máximo dos decimales. Los contratos comparten `dineroNoNegativo` o `dineroPositivo` de `back/src/compartido/dinero.ts`.
- Los cálculos se redondean a centavos antes de persistir. PostgreSQL `Decimal(12,2)` no es un validador de entrada.
- El precio vigente, costo, descuento permitido, total y existencia se vuelven a calcular en el servidor. Cobranza, Venta, Almacén y Contabilidad no pueden sustituir el precio; Administración nunca vende debajo del costo.
- Una venta `CONTADO` deja saldo financiado cero. Una venta `CREDITO` carga al cliente el total confirmado y descuenta el anticipo. El saldo resultante se devuelve en `resumenSaldo`.
- Un abono no puede superar el saldo confirmado. Si se anula, se crea la compensación y se restauran saldo/cuotas; el abono original no se borra.
- Las cuotas suman exactamente el importe financiado; la última absorbe cualquier diferencia de redondeo.

## Autoridad de fechas y caja

- El servidor admite una fecha monetaria del dispositivo hasta 36 horas atrás para trabajo offline y como máximo 10 minutos en el futuro por deriva de reloj.
- Fuera de esa ventana responde `OPERACION_DEMASIADO_ANTIGUA` o `RELOJ_ADELANTADO`; el operador no debe cambiar manualmente el reloj para evitarlo.
- La fecha aceptada decide la jornada/corte. Una jornada firmada rechaza movimientos posteriores de esa fecha aunque estén dentro de la ventana.
- El primer vencimiento es igual o posterior a la venta/entrega. Nunca se crea una deuda que ya nació vencida por captura.
- Un reembolso afecta la caja de `usuarioOperadorId`; `autorizadoPorId` sólo registra quién autorizó.

## Libros, proyecciones y correcciones

- `MovimientoSaldo`, `MovimientoInventario`, `Abono`, `Venta`, `Devolucion`, `CorteCaja`, `OperacionSincronizada` y `Auditoria` explican historia y no se editan para ocultar hechos.
- `SaldoCliente` y `Producto.existencia` son proyecciones rápidas que deben coincidir con sus libros.
- Una operación confirmada se anula, devuelve o compensa; nunca se elimina físicamente.
- Una baja de cliente/producto es lógica. Los detalles de venta preservan nombre, SKU, marca, costo y precio históricos.

## Efectos por operación

| Operación                 | Saldo                                | Inventario                   | Caja                                              |
| ------------------------- | ------------------------------------ | ---------------------------- | ------------------------------------------------- |
| Venta contado             | No cambia                            | Resta piezas                 | Suma total al método cobrado                      |
| Venta crédito             | Suma financiado                      | Resta piezas                 | Suma anticipo                                     |
| Abono                     | Resta deuda                          | No cambia                    | Suma abono                                        |
| Pedido capturado/recibido | No cambia                            | No cambia                    | No cambia                                         |
| Pedido entregado contado  | No cambia                            | Resta piezas                 | Suma total                                        |
| Pedido entregado crédito  | Suma financiado                      | Resta piezas                 | Suma anticipo                                     |
| Compra                    | No cambia                            | Suma piezas                  | Se registra egreso contable, no caja del cobrador |
| Devolución                | Reduce deuda pendiente y/o reembolsa | Reingresa piezas autorizadas | Resta reembolso al operador                       |
| Anulación de abono        | Restaura deuda                       | No cambia                    | Compensa el cobro original                        |

## Pedido y proveedor

- Un pedido referencia productos registrados; no acepta artículos libres.
- Capturar o avanzar un pedido no crea venta, deuda ni salida de stock.
- Administración, Contabilidad o Almacén asignan proveedor. Cobranza no puede hacerlo.
- Sólo una entrega confirmada crea la venta. La transacción verifica pedido, proveedor, stock, cliente, plan y jornada antes de aplicar efectos.

## Integridad offline

- Cada equipo/usuario tiene una secuencia y cadena HMAC-SHA-512 continua. No se aceptan huecos, reordenamientos ni contenido distinto bajo el mismo identificador.
- El móvil envía el prefijo pendiente en lotes de máximo 100; la API admite como máximo 500.
- Una regla de negocio inválida se revierte en su `SAVEPOINT`, crea recibo terminal `RECHAZADA`, no aplica efectos y sí avanza el ancla. Queda visible para conciliación y no se reenvía eternamente.
- Un error técnico no genera recibo terminal: revierte el lote y se reintenta.
- Reinstalar, limpiar almacenamiento o transferir un teléfono con pendientes está prohibido hasta recuperar o conciliar la cola.

## Concurrencia y candados

- Orden de candados financieros: jornada/caja, venta cuando aplique, cliente, inventario/productos. Todo módulo nuevo debe respetarlo.
- La devolución bloquea jornada, venta y cliente antes de calcular cantidades ya devueltas.
- La anulación relee el abono después de bloquear jornada y cliente y usa actualización condicional.
- El corte calcula y sella bajo el mismo candado de jornada.
- Un refresh token se consume y crea su sucesor en una sola transacción; sólo una renovación concurrente gana.
- La degradación/desactivación de administradores usa el candado `nexo:administradores-activos`; siempre queda al menos uno activo.

## Privacidad y autorización

- Permiso por rol y alcance por fila son controles distintos. Cobranza sólo ve rutas/clientes asignados.
- Teléfono, dirección, MFA y claves de dispositivo se cifran con AES-256-GCM. La búsqueda exacta de teléfono usa HMAC-SHA-256 versionado con `SEARCH_HMAC_KEY`, nunca SHA-256 sin clave.
- Costos de compra no se exponen a Venta ni Cobranza. Logs, auditoría y respuestas de error no incluyen tokens, contraseñas, teléfono completo, dirección ni imágenes en base64.

## Pruebas que hacen cumplir estas reglas

- `back/tests/dinero.test.ts` y `fechas-monetarias.test.ts` validan dinero, reloj, vencimiento e índice HMAC.
- `back/tests/e2e/seguridad-permisos.e2e.test.ts` cubre rotación concurrente y continuidad administrativa.
- `back/tests/e2e/operacion-completa.e2e.test.ts` cubre rechazo offline aislado, saldo, inventario, abonos y recibos.
- `back/tests/e2e/reglas-adversariales.e2e.test.ts` cubre carreras de devolución, anulación y cortes.
