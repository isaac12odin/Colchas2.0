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

case "$archivo" in
  *.dump.enc) archivo_imagenes="${archivo%.dump.enc}.imagenes.tar.enc" ;;
  *)
    echo "El respaldo PostgreSQL debe terminar en .dump.enc." >&2
    exit 2
    ;;
esac
if [ ! -f "$archivo_imagenes" ]; then
  echo "Falta el respaldo de imágenes asociado: $archivo_imagenes" >&2
  exit 1
fi
verificar_sha256_si_existe "$archivo_imagenes"

temporal=$(mktemp "${TMPDIR:-/tmp}/nexo-verificacion.XXXXXX")
temporal_imagenes=$(mktemp "${TMPDIR:-/tmp}/nexo-verificacion-imagenes.XXXXXX")
trap 'rm -f "$temporal" "$temporal_imagenes"' EXIT HUP INT TERM
openssl enc -d -aes-256-cbc -pbkdf2 -iter 250000 \
  -pass env:BACKUP_ENCRYPTION_KEY -in "$archivo" -out "$temporal"
if [ -f "$archivo.pg-major" ]; then
  major_respaldo=$(tr -d '[:space:]' < "$archivo.pg-major")
else
  major_respaldo=$(detectar_major_archivo_postgres "$temporal")
fi
resolver_binarios_postgres "$major_respaldo" pg_restore
"$POSTGRES_BIN/pg_restore" --list "$temporal" >/dev/null
openssl enc -d -aes-256-cbc -pbkdf2 -iter 250000 \
  -pass env:BACKUP_ENCRYPTION_KEY -in "$archivo_imagenes" -out "$temporal_imagenes"
tar -tf "$temporal_imagenes" >/dev/null
echo "Respaldo descifrable y catálogo PostgreSQL $major_respaldo legible: $archivo"
echo "Respaldo descifrable de imágenes legible: $archivo_imagenes"
