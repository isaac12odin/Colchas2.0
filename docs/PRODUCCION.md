# Puesta en producción y recuperación

## Arquitectura de despliegue

`docker-compose.production.yml` publica únicamente Caddy en 80/443. La web y la API permanecen en la red interna; PostgreSQL no forma parte del compose y debe vivir en una red privada o servicio administrado separado. Caddy solicita y renueva TLS automáticamente para `DOMINIO`.

1. Copie `.env.production.example` como `.env.production` en el servidor.
2. Genere secretos independientes con `openssl rand -base64 64` y la clave de campos con `openssl rand -base64 32`.
3. Defina `SEED_ADMIN_EMAIL` y un `SEED_ADMIN_PASSWORD` aleatorio de al menos 16 caracteres en el gestor de secretos. No hay credenciales fallback.
4. Ejecute `npm run db:deploy -w back` desde un trabajo de despliegue con acceso privado a PostgreSQL y después `npm run db:seed`; retire `SEED_ADMIN_PASSWORD` del entorno al terminar.
5. Ejecute `docker compose -f docker-compose.production.yml up -d --build`.
6. Compruebe `https://DOMINIO/salud` y el healthcheck interno `/salud/listo`. Caddy enruta ambas rutas directamente a `api:4000`; no pasan por Next.js.
7. Cambie la contraseña inicial y habilite MFA desde **Mi perfil** antes de crear otros usuarios.

Nunca cambie `FIELD_ENCRYPTION_KEY` directamente: dejaría ilegibles teléfono, dirección y secretos MFA existentes. Su rotación requiere una migración que descifre con la clave anterior y vuelva a cifrar con la nueva. Rotar los secretos JWT cierra efectivamente todas las sesiones; hágalo en una ventana anunciada.

## Respaldos automáticos

El comando `npm run backup` detecta la versión mayor del servidor, exige un `pg_dump` de esa misma versión, crea un formato custom, lo cifra con AES-256/PBKDF2 y genera SHA-256 más un archivo `.pg-major`. Verificación y restauración vuelven a resolver un `pg_restore` compatible y la prueba se niega a restaurar si origen y destino tienen versiones mayores distintas. Esto evita que una herramienta más nueva introduzca parámetros que el servidor local no entiende.

En Homebrew se buscan automáticamente instalaciones `postgresql@<major>`. En servidores o imágenes con una ruta distinta, defina `NEXO_PG_BIN=/ruta/postgresql/bin`; el script valida su versión y falla cerrado si no coincide. `DATABASE_URL` puede conservar `schema=public` para Prisma: los scripts eliminan únicamente ese parámetro antes de invocar libpq y preservan opciones válidas como `sslmode`.

`BACKUP_ENCRYPTION_KEY` debe guardarse en el gestor de secretos y en custodia separada; no junto al archivo.

Programe la ejecución diaria a las 02:15 con `systemd` o el planificador de su plataforma. Inyecte `DATABASE_URL`, `BACKUP_ENCRYPTION_KEY` y `BACKUP_DIR` desde el gestor de secretos del servidor; no los copie en la línea de `cron`, el historial de la terminal ni archivos legibles por otros usuarios. El trabajo programado solo debe ejecutar:

```bash
cd /opt/nexo
npm run backup
```

La carpeta de destino debe sincronizarse a almacenamiento cifrado fuera del servidor con retención: 14 diarios, 8 semanales y 12 mensuales. Configure una alerta si no aparece un respaldo nuevo en 26 horas.

## Verificación y restauración

Validación rápida semanal:

```bash
BACKUP_ENCRYPTION_KEY='...' npm run backup:verify -- /respaldos/nexo-AAA.dump.enc
```

Prueba trimestral real sobre una base vacía y desechable cuyo nombre termine exactamente en `_restore_test`. El script consulta `current_database()` antes de ejecutar `pg_restore --clean`; no confía en coincidencias dentro de la URL:

```bash
BACKUP_ENCRYPTION_KEY='...' \
RESTORE_TEST_DATABASE_URL='postgresql://.../nexo_restore_test?sslmode=require' \
ALLOW_RESTORE_TEST=SI \
npm run backup:restore-test -- /respaldos/nexo-AAA.dump.enc
```

El segundo comando limpia y reemplaza únicamente la base indicada; por eso exige un nombre de prueba y confirmación explícita. Documente fecha, archivo, duración y resultado. Un respaldo nunca restaurado no se considera comprobado.

## Monitoreo y alertas

- Sondee `/salud` cada minuto desde fuera de la infraestructura.
- Sondee `/salud/listo` desde la red privada; valida la conexión real a PostgreSQL.
- Alerte por cinco respuestas 5xx en cinco minutos, latencia p95 superior a 800 ms, disco mayor a 80%, conexiones PostgreSQL mayores a 80% y ausencia de backup.
- Centralice logs JSON de la API sin cuerpos, cookies, tokens ni PII.
- Ejecute `npm audit --omit=dev`, análisis SAST y escaneo del contenedor en cada liberación.
- Verifique que la imagen final de la API no contenga `expo`, `metro` ni `next`; el Dockerfile instala exclusivamente producción de `@nexo/back`.
- Mantenga Caddy y las imágenes base con actualización mensual y parche urgente para vulnerabilidades críticas.

## Antes de abrir a usuarios reales

- Prueba de restauración satisfactoria.
- MFA activo en todos los administradores.
- Dominio HTTPS sin acceso directo a los puertos 3000, 4000 o 5432.
- PostgreSQL con usuario de aplicación sin privilegios de superusuario.
- Prueba en dos teléfonos reales: sin señal, reinicio, reintento y sincronización simultánea.
- Para migrar instalaciones con la bitácora SHA-512 anterior: sincronice primero toda la cola antigua, verifique recibos en servidor y vuelva a enrolar/limpiar controladamente cada app. La API nueva falla cerrada ante una cadena que no empiece en su ancla HMAC.
- Aviso de privacidad, retención de evidencia fotográfica y política de baja de usuarios aprobados.
