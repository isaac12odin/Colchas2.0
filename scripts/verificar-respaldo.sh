#!/bin/sh

set -eu

directorio_scripts=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$directorio_scripts/postgres-herramientas.sh"

archivo="${1:-}"
if [ -z "$archivo" ] || [ ! -f "$archivo" ]; then
  echo "Uso: BACKUP_ENCRYPTION_KEY=... npm run backup:verify -- /ruta/respaldo.dump.enc" >&2
  exit 2
fi
if [ -z "${BACKUP_ENCRYPTION_KEY:-}" ]; then
  echo "Falta BACKUP_ENCRYPTION_KEY." >&2
  exit 1
fi

verificar_sha256_si_existe "$archivo"

temporal=$(mktemp "${TMPDIR:-/tmp}/nexo-verificacion.XXXXXX")
trap 'rm -f "$temporal"' EXIT HUP INT TERM
openssl enc -d -aes-256-cbc -pbkdf2 -iter 250000 \
  -pass env:BACKUP_ENCRYPTION_KEY -in "$archivo" -out "$temporal"
if [ -f "$archivo.pg-major" ]; then
  major_respaldo=$(tr -d '[:space:]' < "$archivo.pg-major")
else
  major_respaldo=$(detectar_major_archivo_postgres "$temporal")
fi
resolver_binarios_postgres "$major_respaldo" pg_restore
"$POSTGRES_BIN/pg_restore" --list "$temporal" >/dev/null
echo "Respaldo descifrable y catálogo PostgreSQL $major_respaldo legible: $archivo"
