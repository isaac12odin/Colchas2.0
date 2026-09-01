# Puesta en producción y recuperación

## Arquitectura de despliegue

El despliegue vigente de Hostinger usa **Nginx + Certbot** en el host. Los contenedores sólo publican API en `127.0.0.1:4100` y web en `127.0.0.1:3100`; PostgreSQL 16 escucha únicamente de forma local. La fuente de verdad del proxy es `deploy/nginx/nexo.deadcode.cloud.conf` y sus encabezados están en `deploy/nginx/nexo-seguridad.conf`. `docker-compose.production.yml` con Caddy queda como alternativa para una instalación nueva, no describe el servidor vigente.

1. Conserve secretos en `/etc/nexo/nexo.env` con modo `0600`; no use un `.env` dentro del repositorio.
2. Genere secretos JWT independientes, `FIELD_ENCRYPTION_KEY` y una clave distinta `SEARCH_HMAC_KEY` con `openssl rand -base64 32`.
3. Defina `SEED_ADMIN_EMAIL` y un `SEED_ADMIN_PASSWORD` aleatorio de al menos 16 caracteres en el gestor de secretos. No hay credenciales fallback.
4. Defina `IMAGE_STORAGE_DIR=/app/uploads` y monte un volumen persistente, privado y escribible por el usuario de la API en esa ruta.
5. Antes de aplicar `20260826170000_imagenes_en_archivos`, detenga escrituras y ejecute `node back/dist/prisma/migrar-imagenes-a-archivos.js` desde la imagen nueva con el mismo volumen. Sólo después ejecute `prisma migrate deploy`; la migración falla si algún BYTEA no tiene archivo y metadatos.
6. Ejecute las demás migraciones desde la imagen nueva. Cuando se aplique `20260820021000_hmac_busqueda_telefono`, ejecute también `npm run db:reindexar-telefonos -w back` con las claves de producción antes de abrir tráfico.
7. Construya imágenes con etiqueta de versión, reemplace `api` y `front`, y conserve la etiqueta anterior hasta terminar los smoke tests. El procedimiento exacto vive en `docs/RELEASE.md`.
8. Instale ambos archivos Nginx, ejecute `nginx -t` y recargue. Certbot renueva el certificado de `nexo.deadcode.cloud` mediante su temporizador.
9. Compruebe `https://DOMINIO/salud`, `/salud/listo`, `/`, `/capacitacion` e inicio de sesión. Ambas rutas de salud son públicas deliberadamente y sólo revelan estado, nombre del servicio y disponibilidad general de PostgreSQL; nunca versión, host ni credenciales.
10. Inicie sesión, complete el cambio obligatorio de la contraseña inicial y habilite MFA desde **Mi perfil** antes de crear otros usuarios.

Nunca cambie `FIELD_ENCRYPTION_KEY` directamente: dejaría ilegibles teléfono, dirección y secretos MFA existentes. Nunca cambie `SEARCH_HMAC_KEY` sin ejecutar una reindexación de teléfonos coordinada; las búsquedas exactas dejarían de coincidir. Rotar los secretos JWT cierra efectivamente todas las sesiones; hágalo en una ventana anunciada.

## Respaldos automáticos

El comando `npm run backup` crea dos archivos cifrados con la misma marca: `nexo-<marca>.dump.enc` para PostgreSQL y `nexo-<marca>.imagenes.tar.enc` para `IMAGE_STORAGE_DIR`. Ambos reciben SHA-256. La verificación exige la pareja, descifra el dump con un `pg_restore` compatible y comprueba que el archivo de imágenes sea un TAR legible.

En Homebrew se buscan automáticamente instalaciones `postgresql@<major>`. En servidores o imágenes con una ruta distinta, defina `NEXO_PG_BIN=/ruta/postgresql/bin`; el script valida su versión y falla cerrado si no coincide. `DATABASE_URL` puede conservar `schema=public` para Prisma: los scripts eliminan únicamente ese parámetro antes de invocar libpq y preservan opciones válidas como `sslmode`.

`BACKUP_ENCRYPTION_KEY` debe guardarse en el gestor de secretos y en custodia separada; no junto al archivo.

Programe la ejecución diaria a las 02:15 con `systemd` o el planificador de su plataforma. Inyecte `DATABASE_URL`, `IMAGE_STORAGE_DIR`, `BACKUP_ENCRYPTION_KEY` y `BACKUP_DIR` desde el gestor de secretos del servidor. Durante la copia bloquee escrituras de imágenes o detenga brevemente la API para que el dump y la carpeta representen el mismo punto operativo. El trabajo programado sólo debe ejecutar:

```bash
cd /opt/nexo
npm run backup
```

La carpeta de destino debe sincronizar ambas piezas y sus `.sha256` a almacenamiento cifrado fuera del servidor con retención: 14 diarios, 8 semanales y 12 mensuales. Configure una alerta si falta cualquiera de las dos piezas durante más de 26 horas.

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
- Sondee `/salud/listo` externamente sin registrar su cuerpo; valida la conexión general a PostgreSQL y su respuesta está diseñada para ser pública y mínima.
- Alerte por cinco respuestas 5xx en cinco minutos, latencia p95 superior a 800 ms, disco mayor a 80%, conexiones PostgreSQL mayores a 80% y ausencia de backup.
- Centralice logs JSON de la API sin cuerpos, cookies, tokens ni PII.
- Ejecute `npm audit --omit=dev`, análisis SAST y escaneo del contenedor en cada liberación.
- Verifique que la imagen final de la API no contenga `expo`, `metro` ni `next`; el Dockerfile instala exclusivamente producción de `@nexo/back`.
- Mantenga Nginx, Certbot y las imágenes base con actualización mensual y parche urgente para vulnerabilidades críticas.

## Antes de abrir a usuarios reales

- Prueba de restauración satisfactoria.
- MFA activo en todos los administradores.
- Dominio HTTPS sin acceso directo a los puertos 3000, 4000 o 5432.
- PostgreSQL con usuario de aplicación sin privilegios de superusuario.
- Prueba en dos teléfonos reales: sin señal, reinicio, reintento y sincronización simultánea.
- Para migrar instalaciones con la bitácora SHA-512 anterior: sincronice primero toda la cola antigua, verifique recibos en servidor y vuelva a enrolar/limpiar controladamente cada app. La API nueva falla cerrada ante una cadena que no empiece en su ancla HMAC.
- Aviso de privacidad, retención de evidencia fotográfica y política de baja de usuarios aprobados.
