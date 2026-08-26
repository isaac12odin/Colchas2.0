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
if [ -z "${IMAGE_STORAGE_DIR:-}" ] || [ ! -d "$IMAGE_STORAGE_DIR" ]; then
  echo "Falta IMAGE_STORAGE_DIR o no es una carpeta legible." >&2
  exit 1
fi

directorio="${BACKUP_DIR:-./respaldos}"
marca=$(date -u +%Y%m%dT%H%M%SZ)
archivo="$directorio/nexo-$marca.dump.enc"
archivo_imagenes="$directorio/nexo-$marca.imagenes.tar.enc"
temporal=$(mktemp "${TMPDIR:-/tmp}/nexo-respaldo.XXXXXX")
temporal_imagenes=$(mktemp "${TMPDIR:-/tmp}/nexo-imagenes.XXXXXX")
trap 'rm -f "$temporal" "$temporal_imagenes"' EXIT HUP INT TERM
mkdir -p "$directorio"
chmod 700 "$directorio"

major_servidor=$(detectar_major_servidor_postgres "$DATABASE_URL")
resolver_binarios_postgres "$major_servidor" pg_dump psql
url_postgres=$(normalizar_url_postgres_cli "$DATABASE_URL")
"$POSTGRES_BIN/pg_dump" "$url_postgres" \
  --format=custom --no-owner --no-acl --file="$temporal"
tar -C "$IMAGE_STORAGE_DIR" -cf "$temporal_imagenes" .
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 250000 \
  -pass env:BACKUP_ENCRYPTION_KEY -in "$temporal" -out "$archivo"
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 250000 \
  -pass env:BACKUP_ENCRYPTION_KEY -in "$temporal_imagenes" -out "$archivo_imagenes"
chmod 600 "$archivo"
chmod 600 "$archivo_imagenes"
printf '%s\n' "$major_servidor" > "$archivo.pg-major"
chmod 600 "$archivo.pg-major"
huella=$(calcular_sha256_archivo "$archivo")
printf '%s  %s\n' "$huella" "$(basename "$archivo")" > "$archivo.sha256"
chmod 600 "$archivo.sha256"
huella_imagenes=$(calcular_sha256_archivo "$archivo_imagenes")
printf '%s  %s\n' "$huella_imagenes" "$(basename "$archivo_imagenes")" > "$archivo_imagenes.sha256"
chmod 600 "$archivo_imagenes.sha256"
echo "Respaldo cifrado creado con PostgreSQL $major_servidor: $archivo"
echo "Respaldo cifrado de imágenes creado: $archivo_imagenes"
