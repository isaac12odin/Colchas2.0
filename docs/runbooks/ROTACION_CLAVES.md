# Runbook: rotación de claves y secretos

## JWT

Rotar `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` invalida todas las sesiones. Anuncie ventana, cambie ambos en el gestor, recree API y verifique que se exija login.

## HMAC de teléfono

1. Conserve temporalmente la clave anterior según el mecanismo de transición aprobado.
2. Defina la nueva `SEARCH_HMAC_KEY` y versión, ejecute `db:reindexar-telefonos` en tarea aislada y verifique conteos/duplicados/búsqueda.
3. Retire lectura anterior sólo en otra liberación. No registre teléfonos descifrados.

## Cifrado de campos

`FIELD_ENCRYPTION_KEY` no se sustituye en caliente. Requiere migración que descifre/re-cifre fila por fila, respaldo, rollback y verificación de PII/MFA/dispositivos. Perderla hace irrecuperables los campos cifrados.

## Respaldo

Rote `BACKUP_ENCRYPTION_KEY` conservando la anterior durante toda la retención de archivos cifrados con ella, o vuelva a cifrar/verificar cada respaldo. Custodie copia offline separada.

Siempre registre versión de clave y fecha, nunca el valor.
