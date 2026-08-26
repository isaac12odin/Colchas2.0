# Runbook: PostgreSQL, respaldo y restauración

## Caída

1. Confirme `/salud` y `/salud/listo`; no reinicie contenedores en bucle.
2. Revise servicio PostgreSQL, disco, memoria, conexiones y logs sin imprimir URLs con contraseña.
3. La app móvil puede seguir capturando offline; la web queda sólo para informar indisponibilidad.
4. Al recuperar, valide migraciones y ejecute smoke tests antes de sincronizar todos los teléfonos.

## Restauración

1. Declare incidente y congele escrituras.
2. Elija respaldo cifrado verificado y herramienta `pg_restore` de la misma versión mayor del servidor.
3. Restaure primero en una base cuyo nombre real termine exactamente `_restore_test` usando `npm run backup:restore-test`.
4. Compruebe migraciones, conteos, saldo/libro, inventario/libro, usuarios y lectura de campos cifrados.
5. La restauración productiva requiere aprobación, ventana y plan de reversa. Nunca use `--clean` contra una URL no verificada.
6. Tras abrir, invalide sesiones si el punto restaurado puede reintroducir tokens y concilie operaciones móviles posteriores al respaldo.

Retención: 14 diarios, 8 semanales y 12 mensuales fuera del servidor. Alerta a las 26 horas sin respaldo; restauración de ensayo trimestral.
