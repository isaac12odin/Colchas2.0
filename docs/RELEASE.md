# Liberación y rollback

Fuente de verdad para Hostinger: repositorio en `/var/www/Colchas2.0`, secretos `/etc/nexo/nexo.env`, Compose `/etc/nexo/compose.yml`, Nginx en `/etc/nginx/sites-available/nexo.deadcode.cloud` y PostgreSQL 16 local.

## Compatibilidad

- API conserva `/api/v1`; la web pública usa `/api/*` y Nginx reescribe el prefijo.
- Una versión móvil debe tolerar respuestas con campos adicionales. Cambios que eliminan/renombran campos exigen ventana de compatibilidad y versión mínima publicada.
- Migraciones son `prisma migrate deploy`, nunca `migrate dev` en producción.
- Migraciones destructivas usan expandir/migrar/contraer en liberaciones distintas.

## Preparación

1. Árbol Git limpio y commit/etiqueta identificable.
2. Validar typecheck, unitarias, E2E PostgreSQL, UI web y build de producción.
3. Revisar migraciones SQL, espacio, respaldo reciente/restaurable y variables nuevas.
4. Para esta versión, agregar `SEARCH_HMAC_KEY` aleatoria de 32 bytes en base64 y `IMAGE_STORAGE_DIR=/app/uploads` a `/etc/nexo/nexo.env` antes de iniciar la API nueva. El servicio API y la tarea de migración deben montar el mismo volumen persistente en `/app/uploads`.
5. Anunciar ventana y responsable. Guardar las etiquetas de imágenes actualmente sanas.
6. La migración `20260825143000_rutas_administrativas_web` permite reactivar rutas sin cobrador para operarlas desde Administración web. Asigne responsable sólo cuando también deban aparecer en móvil.

## Despliegue

```bash
cd /var/www/Colchas2.0
git fetch --prune
git pull --ff-only
docker build -f back/Dockerfile --target ejecucion -t nexo-api:<VERSION> .
docker build -f front/Dockerfile -t nexo-front:<VERSION> .
docker compose -f /etc/nexo/compose.yml run --rm migracion node back/dist/prisma/migrar-imagenes-a-archivos.js
docker compose -f /etc/nexo/compose.yml run --rm migracion npm run db:deploy -w back
```

La extracción de imágenes se ejecuta antes de `migrate deploy`, con las escrituras detenidas. Es reanudable: omite las filas que ya tienen ruta. Compruebe después que el volumen contenga archivos `.webp`; la migración SQL elimina BYTEA sólo si cada binario legado tiene ruta, hash, tamaño y dimensiones.

Si la migración HMAC acaba de aplicarse, ejecute en una tarea que monte `/etc/nexo/nexo.env` y la base:

```bash
docker compose -f /etc/nexo/compose.yml run --rm migracion npm run db:reindexar-telefonos -w back
```

Actualice las etiquetas `image:` en `/etc/nexo/compose.yml`, valide con `docker compose ... config --quiet` y reemplace servicios:

```bash
docker compose -f /etc/nexo/compose.yml up -d --force-recreate --wait api front
```

No copie comandos con secretos al historial. No ejecute el seed salvo instalación inicial explícita.

## Nginx y TLS

Copie `deploy/nginx/nexo-seguridad.conf` a `/etc/nginx/snippets/nexo-seguridad.conf` y el sitio a `/etc/nginx/sites-available/nexo.deadcode.cloud`. Después:

```bash
nginx -t
systemctl reload nginx
certbot renew --dry-run
```

El HTML debe responder `Cache-Control: no-store`; sólo `/_next/static/*` usa caché inmutable anual. Verifique HSTS, CSP, anti-frame, nosniff, referencia y permisos.

## Smoke tests obligatorios

```bash
curl -fsS -H 'X-Forwarded-Proto: https' http://127.0.0.1:4100/salud/listo
curl -fsSI http://127.0.0.1:3100/
curl -fsS https://nexo.deadcode.cloud/salud/listo
curl -fsSI https://nexo.deadcode.cloud/
curl -fsSI https://nexo.deadcode.cloud/capacitacion
```

Además: iniciar sesión, abrir Clientes/Inventario/Pedidos, crear y anular una operación controlada si la ventana lo permite, probar una sincronización móvil sin pendientes y comprobar logs 5xx. No declarar éxito sólo porque los contenedores estén `healthy`.

Active/verifique los timers versionados y conserve su siguiente ejecución:

```bash
install -m 0644 deploy/systemd/nexo-{respaldo,reconciliacion}.{service,timer} /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now nexo-respaldo.timer nexo-reconciliacion.timer
systemctl list-timers 'nexo-*'
```

La unidad de respaldo usa las herramientas PostgreSQL de la misma versión
mayor instaladas en el host y lee el volumen persistente de imágenes en modo
solo lectura. Antes de habilitar el temporizador, ejecute manualmente la unidad,
revise su journal y confirme en `/respaldos` la pareja PostgreSQL + imágenes
con sus huellas y versión mayor:

```bash
systemctl start nexo-respaldo.service
systemctl status nexo-respaldo.service --no-pager
journalctl -u nexo-respaldo.service -n 100 --no-pager
```

`BACKUP_REMOTE` y rclone deben apuntar a una cuenta externa al VPS. El timer
mantiene la copia local aun cuando falte ese destino y deja una advertencia
explícita en el journal, pero una configuración sin copia externa y alerta
comprobadas no cierra el P1 operativo.

## Rollback

1. Si no hubo migración incompatible, restaure etiquetas anteriores en Compose y ejecute `up -d --force-recreate --wait`.
2. No revierta una migración con SQL improvisado. Si el binario anterior no entiende columnas nuevas pero éstas son aditivas, puede volver; si es incompatible, avance con corrección o restaure bajo el runbook de DB.
3. Si ya hubo escrituras con la versión nueva, evalúe su forma antes de restaurar un respaldo; restaurar puede perder ventas/abonos móviles confirmados.
4. Repita smoke tests y documente causa/decisión.

## Registro de liberación

Guardar: versión/commit, imágenes, migraciones, respaldo, hora, responsable, resultados, incidencias, rollback disponible y versión mínima móvil. Las cantidades exactas de pruebas provienen del reporte CI, no se fijan manualmente en documentación.
