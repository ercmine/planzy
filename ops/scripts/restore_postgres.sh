#!/usr/bin/env bash
set -euo pipefail

: "${RESTORE_FILE:?RESTORE_FILE is required (local path to .sql.gz)}"
: "${PGHOST:?PGHOST is required}"
: "${PGPORT:=5432}"
: "${PGUSER:?PGUSER is required}"
: "${PGDATABASE:?PGDATABASE is required}"

if [[ ! -f "$RESTORE_FILE" ]]; then
  echo "restore file not found: $RESTORE_FILE" >&2
  exit 1
fi

gzip -dc "$RESTORE_FILE" | psql --host "$PGHOST" --port "$PGPORT" --username "$PGUSER" --dbname "$PGDATABASE"
echo "restore_complete db=${PGDATABASE} file=${RESTORE_FILE}"
