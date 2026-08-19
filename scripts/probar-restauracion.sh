#!/bin/sh

set -eu

directorio_scripts=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$directorio_scripts/postgres-herramientas.sh"

archivo="${1:-}"
if [ -z "$archivo" ] || [ ! -f "$archivo" ]; then
  echo "Uso: npm run backup:restore-test -- /ruta/respaldo.dump.enc" >&2
  exit 2
fi
if [ "${ALLOW_RESTORE_TEST:-}" != "SI" ]; then
  echo "Defina ALLOW_RESTORE_TEST=SI para confirmar la restauracion destructiva sobre la base de prueba." >&2
  exit 2
fi
if [ -z "${RESTORE_TEST_DATABASE_URL:-}" ]; then
  echo "Falta RESTORE_TEST_DATABASE_URL." >&2
  exit 2
fi
if [ -z "${BACKUP_ENCRYPTION_KEY:-}" ]; then
  echo "Falta BACKUP_ENCRYPTION_KEY." >&2
  exit 1
fi

# La URL no es evidencia del destino real: el texto permitido podría estar en
# el usuario, host o query string. Se consulta el servidor y se valida el nombre
# efectivo antes de descifrar el respaldo y, sobre todo, antes de --clean.
url_destino=$(normalizar_url_postgres_cli "$RESTORE_TEST_DATABASE_URL")
major_destino=$(detectar_major_servidor_postgres "$url_destino")
resolver_binarios_postgres "$major_destino" pg_restore psql
nombre_base_destino=$(
  "$POSTGRES_BIN/psql" "$url_destino" -AtX -v ON_ERROR_STOP=1 \
    -c 'SELECT current_database();'
)
case "$nombre_base_destino" in
  *_restore_test) ;;
  *)
    echo "Restauración rechazada: la base conectada '$nombre_base_destino' no termina exactamente en _restore_test." >&2
    exit 2
    ;;
esac

verificar_sha256_si_existe "$archivo"

temporal=$(mktemp "${TMPDIR:-/tmp}/nexo-restauracion.XXXXXX")
trap 'rm -f "$temporal"' EXIT HUP INT TERM
openssl enc -d -aes-256-cbc -pbkdf2 -iter 250000 \
  -pass env:BACKUP_ENCRYPTION_KEY -in "$archivo" -out "$temporal"
if [ -f "$archivo.pg-major" ]; then
  major_respaldo=$(tr -d '[:space:]' < "$archivo.pg-major")
else
  major_respaldo=$(detectar_major_archivo_postgres "$temporal")
fi
if [ "$major_respaldo" != "$major_destino" ]; then
  echo "El respaldo fue creado con PostgreSQL $major_respaldo y el destino usa $major_destino." >&2
  echo "Restaure primero sobre un servidor de la misma versión mayor." >&2
  exit 1
fi
"$POSTGRES_BIN/pg_restore" --clean --if-exists --no-owner --no-acl \
  --dbname="$url_destino" "$temporal"
"$POSTGRES_BIN/psql" "$url_destino" -v ON_ERROR_STOP=1 \
  -c 'SELECT COUNT(*) AS migraciones FROM "_prisma_migrations";'
echo "Restauracion PostgreSQL $major_destino comprobada en la base desechable $nombre_base_destino."
