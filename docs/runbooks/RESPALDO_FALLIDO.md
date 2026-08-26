# Runbook: respaldo o copia externa fallida

1. Declare incidente si el último respaldo verificable supera 26 horas. No borre archivos anteriores para liberar espacio sin confirmar la retención externa.
2. Revise espacio, permisos `0700/0600`, PostgreSQL, versión de `pg_dump`, clave disponible y salida del timer. No imprima `DATABASE_URL` ni `BACKUP_ENCRYPTION_KEY`.
3. Ejecute un respaldo manual desde el servicio autorizado y después `backup:verify`. Un archivo presente sin SHA/verificación no cuenta.
4. Copie el conjunto `.dump.enc`, `.sha256` y `.pg-major` al almacenamiento externo cifrado; verifique checksum en destino.
5. Si el dump falla por una migración, congele el despliegue y escale; no cambie esquema ni use herramientas de otra versión para “forzarlo”.
6. Cierre sólo con hora, tamaño, duración, ubicación externa, verificación y próximo ensayo de restauración.

RPO objetivo inicial: 24 horas. RTO objetivo inicial: 4 horas. La empresa debe aceptar o reducirlos por escrito antes del piloto.
