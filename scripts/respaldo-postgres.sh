#!/bin/sh

set -eu

directorio_scripts=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$directorio_scripts/postgres-herramientas.sh"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Falta DATABASE_URL." >&2
  exit 1
fi
if [ -z "${BACKUP_ENCRYPTION_KEY:-}" ]; then
  echo "Falta BACKUP_ENCRYPTION_KEY; use una frase larga guardada fuera del servidor." >&2
  exit 1
fi

directorio="${BACKUP_DIR:-./respaldos}"
marca=$(date -u +%Y%m%dT%H%M%SZ)
archivo="$directorio/nexo-$marca.dump.enc"
temporal=$(mktemp "${TMPDIR:-/tmp}/nexo-respaldo.XXXXXX")
trap 'rm -f "$temporal"' EXIT HUP INT TERM
mkdir -p "$directorio"
chmod 700 "$directorio"

major_servidor=$(detectar_major_servidor_postgres "$DATABASE_URL")
resolver_binarios_postgres "$major_servidor" pg_dump psql
url_postgres=$(normalizar_url_postgres_cli "$DATABASE_URL")
"$POSTGRES_BIN/pg_dump" "$url_postgres" \
  --format=custom --no-owner --no-acl --file="$temporal"
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 250000 \
  -pass env:BACKUP_ENCRYPTION_KEY -in "$temporal" -out "$archivo"
chmod 600 "$archivo"
printf '%s\n' "$major_servidor" > "$archivo.pg-major"
chmod 600 "$archivo.pg-major"
huella=$(calcular_sha256_archivo "$archivo")
printf '%s  %s\n' "$huella" "$(basename "$archivo")" > "$archivo.sha256"
chmod 600 "$archivo.sha256"
echo "Respaldo cifrado creado con PostgreSQL $major_servidor: $archivo"
