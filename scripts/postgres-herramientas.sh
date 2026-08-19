#!/bin/sh

# Funciones compartidas para garantizar que servidor, pg_dump y pg_restore
# usan la misma versión mayor. Este archivo se incluye desde otros scripts.

version_mayor_binario_postgres() {
  LC_ALL=C "$1" --version 2>/dev/null |
    sed -E -n 's/^[^0-9]*([0-9]+).*/\1/p' |
    head -n 1
}

# Prisma acepta `schema=`, pero libpq (psql/pg_dump/pg_restore) no. Se elimina
# sólo ese parámetro y se conservan opciones válidas como sslmode.
normalizar_url_postgres_cli() {
  printf '%s\n' "$1" |
    sed -E \
      -e 's/([?&])schema=[^&]*&/\1/' \
      -e 's/[?&]schema=[^&]*$//' \
      -e 's/\?&/?/'
}

buscar_herramienta_postgres() {
  nexo_herramienta="$1"
  if [ -n "${NEXO_PG_BIN:-}" ] && [ -x "$NEXO_PG_BIN/$nexo_herramienta" ]; then
    printf '%s\n' "$NEXO_PG_BIN/$nexo_herramienta"
    return
  fi
  nexo_en_path=$(command -v "$nexo_herramienta" 2>/dev/null || true)
  if [ -n "$nexo_en_path" ]; then
    printf '%s\n' "$nexo_en_path"
    return
  fi
  for nexo_major in 18 17 16 15; do
    for nexo_raiz in /opt/homebrew/opt /usr/local/opt; do
      nexo_candidato="$nexo_raiz/postgresql@$nexo_major/bin/$nexo_herramienta"
      if [ -x "$nexo_candidato" ]; then
        printf '%s\n' "$nexo_candidato"
        return
      fi
    done
  done
  echo "No se encontró $nexo_herramienta de PostgreSQL." >&2
  return 1
}

resolver_binarios_postgres() {
  nexo_major_objetivo="$1"
  shift
  nexo_herramientas="$*"
  nexo_primera="$1"

  if [ -n "${NEXO_PG_BIN:-}" ]; then
    nexo_candidatos="$NEXO_PG_BIN"
  else
    nexo_en_path=$(command -v "$nexo_primera" 2>/dev/null || true)
    nexo_directorio_path=""
    if [ -n "$nexo_en_path" ]; then
      nexo_directorio_path=$(dirname -- "$nexo_en_path")
    fi
    nexo_candidatos="/opt/homebrew/opt/postgresql@$nexo_major_objetivo/bin
/usr/local/opt/postgresql@$nexo_major_objetivo/bin
/opt/homebrew/opt/postgresql/bin
/usr/local/opt/postgresql/bin
$nexo_directorio_path"
  fi

  for nexo_directorio in $nexo_candidatos; do
    [ -n "$nexo_directorio" ] || continue
    nexo_valido=SI
    for nexo_herramienta in $nexo_herramientas; do
      if [ ! -x "$nexo_directorio/$nexo_herramienta" ]; then
        nexo_valido=NO
        break
      fi
    done
    [ "$nexo_valido" = SI ] || continue
    nexo_major_binario=$(version_mayor_binario_postgres "$nexo_directorio/$nexo_primera")
    if [ "$nexo_major_binario" = "$nexo_major_objetivo" ]; then
      POSTGRES_BIN="$nexo_directorio"
      POSTGRES_MAJOR="$nexo_major_objetivo"
      export POSTGRES_BIN POSTGRES_MAJOR
      return
    fi
  done

  echo "No se encontraron herramientas PostgreSQL $nexo_major_objetivo compatibles ($nexo_herramientas)." >&2
  echo "Instálelas o defina NEXO_PG_BIN con el directorio bin de esa misma versión mayor." >&2
  return 1
}

detectar_major_servidor_postgres() {
  nexo_url_servidor=$(normalizar_url_postgres_cli "$1")
  nexo_psql_sondeo=$(buscar_herramienta_postgres psql)
  nexo_version_num=$("$nexo_psql_sondeo" "$nexo_url_servidor" -AtX -v ON_ERROR_STOP=1 \
    -c 'SHOW server_version_num;')
  case "$nexo_version_num" in
    ''|*[!0-9]*)
      echo "El servidor devolvió una versión PostgreSQL inválida." >&2
      return 1
      ;;
  esac
  printf '%s\n' "$((nexo_version_num / 10000))"
}

detectar_major_archivo_postgres() {
  nexo_archivo_dump="$1"
  nexo_pg_restore_sondeo=$(buscar_herramienta_postgres pg_restore)
  nexo_listado=$(LC_ALL=C "$nexo_pg_restore_sondeo" --list "$nexo_archivo_dump")
  nexo_major_archivo=$(printf '%s\n' "$nexo_listado" |
    sed -E -n 's/^;[[:space:]]*Dumped by pg_dump version: ([0-9]+).*/\1/p' |
    head -n 1)
  case "$nexo_major_archivo" in
    ''|*[!0-9]*)
      echo "No fue posible determinar la versión mayor del respaldo PostgreSQL." >&2
      return 1
      ;;
  esac
  printf '%s\n' "$nexo_major_archivo"
}

calcular_sha256_archivo() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

verificar_sha256_si_existe() {
  nexo_archivo_cifrado="$1"
  nexo_archivo_huella="$nexo_archivo_cifrado.sha256"
  [ -f "$nexo_archivo_huella" ] || return 0
  nexo_esperada=$(awk 'NR == 1 { print $1 }' "$nexo_archivo_huella")
  nexo_actual=$(calcular_sha256_archivo "$nexo_archivo_cifrado")
  if [ "$nexo_esperada" != "$nexo_actual" ]; then
    echo "La huella SHA-256 del respaldo no coincide." >&2
    return 1
  fi
}
