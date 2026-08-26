# Modelo de amenazas

## Activos y fronteras

Activos: PII de clientes, saldo/libros, inventario, caja, evidencia, credenciales, claves de cifrado/HMAC, respaldos y artefactos. Fronteras: navegador↔Nginx↔API, móvil↔API, API↔PostgreSQL, host↔almacenamiento externo y pipeline↔registro de imágenes.

## Actores relevantes

- Externo sin cuenta: fuerza bruta, explotación web/API y enumeración.
- Usuario interno válido: acceso fuera de cartera, precio manipulado, abono/reembolso fraudulento.
- Teléfono perdido/manipulado: robo de tokens, modificación/repetición de cola offline.
- Operador de infraestructura o dependencia comprometida: secretos, imagen o respaldo.
- Error humano: migración/restauración contra base equivocada, ruta huérfana o corte inconsistente.

## Controles y riesgo residual

| Amenaza                       | Controles                                                              | Residual/acción                                            |
| ----------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| Robo de credenciales          | Argon2id, rate limit, bloqueo atómico, MFA admin, sesiones revocables  | MFA de todos los admins debe probarse.                     |
| Acceso horizontal             | permisos y filtros por ruta/cliente, pruebas negativas                 | revisar cada endpoint nuevo.                               |
| Precio/saldo/stock manipulado | cálculo servidor, checks DB, locks, huella idempotente, reconciliación | monitoreo nocturno aún debe activarse.                     |
| Repetición offline            | HMAC por dispositivo, secuencia, hash previo, recibos/idempotencia     | equipo rooteado/clave extraída requiere MDM/attestation.   |
| Fuga de PII                   | AES-GCM, HMAC de búsqueda, DTO mínimos, logs sanitizados               | fotos en DB migrarán a objetos privados al crecer.         |
| Supply chain                  | lockfile, imagen backend mínima, audit/CodeQL/Trivy/SBOM CI            | pentest y revisión de acciones externos pendientes.        |
| Pérdida de host               | respaldo cifrado, prueba de restauración y copia externa definida      | activar copia/alerta y custodiar clave separada.           |
| XSS/clickjacking/transporte   | HTTPS, HSTS, CSP, frame-ancestors, cookies seguras/CSRF                | eliminar `unsafe-inline` cuando Next lo permita con nonce. |

Revisar trimestralmente y al añadir pagos externos, CFDI, almacenamiento de objetos, Redis, múltiples réplicas o una nueva clase de PII.
