#!/usr/bin/env bash
set -euo pipefail

: "${MANIFEST_FILE:?MANIFEST_FILE is required}"

if [[ ! -f "$MANIFEST_FILE" ]]; then
  echo "manifest not found: $MANIFEST_FILE" >&2
  exit 1
fi

REQUIRED_KEYS=("backupSystem" "createdAt" "storageUri" "checksumSha256" "status")
for key in "${REQUIRED_KEYS[@]}"; do
  if ! jq -e --arg k "$key" '.[$k] != null and .[$k] != ""' "$MANIFEST_FILE" >/dev/null; then
    echo "manifest missing required key: $key" >&2
    exit 1
  fi
done

STATUS="$(jq -r '.status' "$MANIFEST_FILE")"
if [[ "$STATUS" != "succeeded" ]]; then
  echo "manifest status is not succeeded: $STATUS" >&2
  exit 1
fi

echo "manifest_valid $MANIFEST_FILE"
