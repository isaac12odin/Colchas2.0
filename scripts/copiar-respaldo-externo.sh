#!/bin/sh

set -eu

directorio="${BACKUP_DIR:-/respaldos}"
destino="${BACKUP_REMOTE:-}"
if [ -z "$destino" ]; then
  echo "Falta BACKUP_REMOTE (por ejemplo, nexo-offsite:produccion)." >&2
  exit 1
fi
if ! command -v rclone >/dev/null 2>&1; then
  echo "rclone no está instalado en el host." >&2
  exit 1
fi

archivo=$(find "$directorio" -maxdepth 1 -type f -name 'nexo-*.dump.enc' -print | sort | tail -n 1)
if [ -z "$archivo" ] || [ ! -f "$archivo.sha256" ] || [ ! -f "$archivo.pg-major" ]; then
  echo "No existe un respaldo completo con SHA y versión PostgreSQL." >&2
  exit 1
fi

(cd "$directorio" && sha256sum -c "$(basename "$archivo").sha256")
for origen in "$archivo" "$archivo.sha256" "$archivo.pg-major"; do
  rclone copyto "$origen" "$destino/$(basename "$origen")" --checksum
done
rclone check "$directorio" "$destino" \
  --include "$(basename "$archivo")" \
  --include "$(basename "$archivo").sha256" \
  --include "$(basename "$archivo").pg-major" \
  --one-way
echo "Respaldo verificado y copiado fuera del servidor: $(basename "$archivo")"
