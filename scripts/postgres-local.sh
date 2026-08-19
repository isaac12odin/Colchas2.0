#!/bin/sh

set -eu

raiz_proyecto=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
. "$raiz_proyecto/scripts/postgres-herramientas.sh"
directorio_datos="$raiz_proyecto/.postgres-data"
directorio_socket="$raiz_proyecto/.postgres-socket"
archivo_log="$raiz_proyecto/.postgres.log"
puerto="${NEXO_PG_PORT:-55433}"
usuario="nexo"
contrasena="nexo_local_seguro"
base="nexo_cobranza"

if [ -s "$directorio_datos/PG_VERSION" ]; then
  major_postgres=$(tr -d '[:space:]' < "$directorio_datos/PG_VERSION")
else
  major_postgres="${NEXO_PG_MAJOR:-16}"
fi
resolver_binarios_postgres "$major_postgres" pg_ctl initdb psql createdb
binarios="$POSTGRES_BIN"

inicializar() {
  if [ -s "$directorio_datos/PG_VERSION" ]; then
    return
  fi
  archivo_clave=$(mktemp "${TMPDIR:-/tmp}/nexo-postgres.XXXXXX")
  trap 'rm -f "$archivo_clave"' EXIT HUP INT TERM
  chmod 600 "$archivo_clave"
  printf '%s\n' "$contrasena" >"$archivo_clave"
  "$binarios/initdb" \
    -D "$directorio_datos" \
    -U "$usuario" \
    --encoding=UTF8 \
    --locale=C \
    --auth=scram-sha-256 \
    --pwfile="$archivo_clave"
  rm -f "$archivo_clave"
  trap - EXIT HUP INT TERM
}

iniciar() {
  inicializar
  mkdir -p "$directorio_socket"
  if "$binarios/pg_ctl" -D "$directorio_datos" status >/dev/null 2>&1; then
    echo "PostgreSQL de Nexo ya está activo en 127.0.0.1:$puerto."
  else
    "$binarios/pg_ctl" \
      -D "$directorio_datos" \
      -l "$archivo_log" \
      -o "-h 127.0.0.1 -p $puerto -k $directorio_socket" \
      start
    echo "PostgreSQL $major_postgres iniciado con binarios de $binarios."
  fi

  if ! PGPASSWORD="$contrasena" "$binarios/psql" \
    -h 127.0.0.1 -p "$puerto" -U "$usuario" -d postgres \
    -tAc "SELECT 1 FROM pg_database WHERE datname = '$base'" | grep -q 1; then
    PGPASSWORD="$contrasena" "$binarios/createdb" \
      -h 127.0.0.1 -p "$puerto" -U "$usuario" "$base"
    echo "Base $base creada."
  fi
}

case "${1:-start}" in
  start)
    iniciar
    ;;
  stop)
    if "$binarios/pg_ctl" -D "$directorio_datos" status >/dev/null 2>&1; then
      "$binarios/pg_ctl" -D "$directorio_datos" stop -m fast
    else
      echo "PostgreSQL de Nexo ya está detenido."
    fi
    ;;
  status)
    "$binarios/pg_ctl" -D "$directorio_datos" status
    ;;
  *)
    echo "Uso: $0 start|stop|status" >&2
    exit 2
    ;;
esac
