# Runbook: recuperación offline

## Antes de intervenir

1. No reinstale la app, no borre almacenamiento y no cambie de usuario.
2. Tome captura de **Sincronización**: pendientes, rechazadas, último error y hora.
3. Conecte el equipo a una red estable y manténgalo desbloqueado.

## Pendientes numerosos

Pulse sincronizar una vez. La app envía prefijos de 100 hasta terminar; 501 operaciones requieren seis lotes y no son un error. Si falla transporte, sólo el prefijo `ERROR/ENVIANDO` se reintenta de forma idempotente.

## Rechazo terminal

`RECHAZADA` significa que el servidor verificó la firma pero no aplicó efectos. La operación queda como evidencia, avanza la cadena y no bloquea las siguientes.

- `ABONO_EXCEDENTE`: compare saldo confirmado; registre un nuevo abono correcto, nunca edite el histórico local.
- `INVENTARIO_INSUFICIENTE`: concilie mercancía; Administración decide nueva venta/pedido o cancelación.
- `JORNADA_CERRADA`: Contabilidad concilia el recibo rechazado y registra la corrección autorizada en la jornada vigente.
- `PEDIDO_NO_LISTO`/`PRODUCTO_FALTANTE`: Almacén corrige pedido/proveedor/stock y se crea una nueva entrega.
- `CLIENTE_NO_ASIGNADO`: Administración revisa la ruta; no amplíe permisos para forzar el cobro.

## Error criptográfico

Ante `HUELLA_LOTE_INVALIDA`, `CADENA_OFFLINE_DISCONTINUA`, `OPERACION_OFFLINE_MANIPULADA` o cambio de clave:

1. Detenga nuevas capturas en ese equipo.
2. No marque manualmente registros ni modifique SQLite.
3. Exporte únicamente el diagnóstico permitido por soporte; preserve el teléfono.
4. Administración revisa el dispositivo, último hash/secuencia y recibos en servidor.
5. Escale como incidente de integridad. No se avanza el ancla a mano.

## Reloj

`RELOJ_ADELANTADO` permite hasta 10 minutos; `OPERACION_DEMASIADO_ANTIGUA`, hasta 36 horas atrás. Active fecha/hora automáticas. Una operación fuera de ventana requiere conciliación administrativa, no alterar la hora para reenviarla.

## Cierre

Confirme: pendientes `0`, rechazos explicados, saldo/stock/caja conciliados y recibos visibles. Adjunte códigos e IDs, no PII.
