# Runbooks operativos

Ejecute primero el runbook específico; no improvise sobre la base de producción.

- `OFFLINE.md`: cola pendiente, operación rechazada, HMAC y reloj.
- `DISPOSITIVO.md`: equipo perdido, reinstalación, reemplazo o transferencia.
- `BASE_DATOS.md`: caída de PostgreSQL, respaldo y restauración.
- `INCIDENTE_SEGURIDAD.md`: sospecha de fuga, credenciales o acceso indebido.
- `RESPALDO_FALLIDO.md`: ausencia de respaldo, copia externa o verificación.
- `DISCO_LLENO.md`: contención y recuperación de almacenamiento.
- `RECONCILIACION.md`: diferencias de saldo/existencia y compensación.
- `ROTACION_CLAVES.md`: JWT, cifrado, HMAC de búsqueda y respaldos.
- `DESPLIEGUE_ROLLBACK.md`: liberación, compatibilidad y reversa.

Registre inicio, responsable, síntomas, comandos ejecutados, evidencia, resultado y hora de cierre. Nunca copie secretos, PII ni cuerpos de peticiones al ticket.
