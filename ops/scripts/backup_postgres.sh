#!/usr/bin/env bash
set -euo pipefail

: "${BACKUP_SYSTEM:?BACKUP_SYSTEM is required (main_db|geo_db)}"
: "${PGHOST:?PGHOST is required}"
: "${PGPORT:=5432}"
: "${PGUSER:?PGUSER is required}"
: "${PGDATABASE:?PGDATABASE is required}"
: "${BACKUP_S3_URI:?BACKUP_S3_URI is required (s3://bucket/path)}"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DATE_PATH="$(date -u +%Y/%m/%d)"
OUT_DIR="${TMPDIR:-/tmp}/perbug-backups"
mkdir -p "$OUT_DIR"
FILE="${BACKUP_SYSTEM}_${TIMESTAMP}_full.sql.gz"
LOCAL_PATH="$OUT_DIR/$FILE"
MANIFEST_PATH="$OUT_DIR/${BACKUP_SYSTEM}_${TIMESTAMP}_manifest.json"

pg_dump --format=plain --no-owner --no-privileges --host "$PGHOST" --port "$PGPORT" --username "$PGUSER" "$PGDATABASE" | gzip -c > "$LOCAL_PATH"
SHA256="$(sha256sum "$LOCAL_PATH" | awk '{print $1}')"
SIZE_BYTES="$(wc -c < "$LOCAL_PATH" | tr -d ' ')"
REMOTE_URI="${BACKUP_S3_URI%/}/perbug/${BACKUP_SYSTEM}/${DATE_PATH}/${FILE}"

aws s3 cp "$LOCAL_PATH" "$REMOTE_URI"

cat > "$MANIFEST_PATH" <<JSON
{
  "version": 1,
  "backupSystem": "${BACKUP_SYSTEM}",
  "createdAt": "${TIMESTAMP}",
  "backupType": "full",
  "storageUri": "${REMOTE_URI}",
  "checksumSha256": "${SHA256}",
  "sizeBytes": ${SIZE_BYTES},
  "status": "succeeded"
}
JSON

aws s3 cp "$MANIFEST_PATH" "${BACKUP_S3_URI%/}/perbug/${BACKUP_SYSTEM}/${DATE_PATH}/${BACKUP_SYSTEM}_${TIMESTAMP}_manifest.json"
echo "backup_complete ${REMOTE_URI}"
