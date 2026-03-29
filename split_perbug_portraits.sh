#!/usr/bin/env bash
set -Eeuo pipefail
trap 'echo "[ERROR] Failed at line $LINENO" >&2; exit 1' ERR

: "${IMAGE_NAME:?Set IMAGE_NAME to the full input image path before running this script}"
OUTPUT_DIR="${OUTPUT_DIR:-$HOME/perbug-portraits}"
UPSCALE_SIZE="${UPSCALE_SIZE:-0}"

if [[ ! -f "$IMAGE_NAME" ]]; then
  echo "[ERROR] IMAGE_NAME does not exist: $IMAGE_NAME" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY_SCRIPT="$SCRIPT_DIR/scripts/perbug_splitter.py"
if [[ ! -f "$PY_SCRIPT" ]]; then
  echo "[ERROR] Missing helper script: $PY_SCRIPT" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"
python3 "$PY_SCRIPT" "portraits" "$IMAGE_NAME" "$OUTPUT_DIR" "$UPSCALE_SIZE"

echo "Output folder: $OUTPUT_DIR"
ls -1 "$OUTPUT_DIR" | head -n 20
