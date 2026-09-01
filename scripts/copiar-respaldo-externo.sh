#!/bin/sh

set -eu

directorio_scripts=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
directorio="${BACKUP_DIR:-/respaldos}"
destino="${BACKUP_REMOTE:-}"

archivo=$(find "$directorio" -maxdepth 1 -type f -name 'nexo-*.dump.enc' -print | sort | tail -n 1)
if [ -z "$archivo" ] || [ ! -f "$archivo.sha256" ] || [ ! -f "$archivo.pg-major" ]; then
  echo "No existe un respaldo completo con SHA y versión PostgreSQL." >&2
  exit 1
fi
archivo_imagenes="${archivo%.dump.enc}.imagenes.tar.enc"
if [ ! -f "$archivo_imagenes" ] || [ ! -f "$archivo_imagenes.sha256" ]; then
  echo "Falta la copia cifrada de imágenes asociada al respaldo PostgreSQL." >&2
  exit 1
fi

"$directorio_scripts/verificar-respaldo.sh" "$archivo"

if [ -z "$destino" ]; then
  if [ "${ALLOW_LOCAL_BACKUP_ONLY:-NO}" = "SI" ]; then
    echo "ADVERTENCIA: respaldo local verificado; falta BACKUP_REMOTE para la copia externa." >&2
    exit 0
  fi
  echo "Falta BACKUP_REMOTE (por ejemplo, nexo-offsite:produccion)." >&2
  exit 1
fi
if ! command -v rclone >/dev/null 2>&1; then
  echo "rclone no está instalado en el host." >&2
  exit 1
fi

for origen in \
  "$archivo" \
  "$archivo.sha256" \
  "$archivo.pg-major" \
  "$archivo_imagenes" \
  "$archivo_imagenes.sha256"; do
  rclone copyto "$origen" "$destino/$(basename "$origen")" --checksum
done
rclone check "$directorio" "$destino" \
  --include "$(basename "$archivo")" \
  --include "$(basename "$archivo").sha256" \
  --include "$(basename "$archivo").pg-major" \
  --include "$(basename "$archivo_imagenes")" \
  --include "$(basename "$archivo_imagenes").sha256" \
  --one-way
echo "Respaldo PostgreSQL e imágenes verificado y copiado fuera del servidor: $(basename "$archivo")"
