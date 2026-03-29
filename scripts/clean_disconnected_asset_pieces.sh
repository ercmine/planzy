#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_SCRIPT="${SCRIPT_DIR}/clean_disconnected_asset_pieces.py"

INPUT_DIR="${INPUT_DIR:-/root/perbug/generated_assets}"
OUTPUT_DIR="${OUTPUT_DIR:-/root/perbug/generated_assets_cleaned}"
DRY_RUN="${DRY_RUN:-0}"
IN_PLACE="${IN_PLACE:-0}"
INCLUDE_SKIPPED="${INCLUDE_SKIPPED:-0}"
ALPHA_THRESHOLD="${ALPHA_THRESHOLD:-16}"

# Conservative keep thresholds
KEEP_AREA_MIN="${KEEP_AREA_MIN:-180}"
KEEP_AREA_RATIO="${KEEP_AREA_RATIO:-0.012}"
KEEP_MARGIN="${KEEP_MARGIN:-48}"
KEEP_NEAR_DISTANCE="${KEEP_NEAR_DISTANCE:-40}"
KEEP_CENTER_DISTANCE="${KEEP_CENTER_DISTANCE:-170}"

REPORT_BASE="${REPORT_BASE:-}"
PREVIEW_SHEET="${PREVIEW_SHEET:-}"

if [[ ! -f "${PYTHON_SCRIPT}" ]]; then
  echo "Missing Python helper: ${PYTHON_SCRIPT}" >&2
  exit 1
fi

if [[ "${IN_PLACE}" == "1" && "${DRY_RUN}" != "1" ]]; then
  echo "WARNING: IN_PLACE=1 will overwrite source PNGs."
fi

if [[ "${IN_PLACE}" != "1" ]]; then
  mkdir -p "${OUTPUT_DIR}"
fi

cmd=(python3 "${PYTHON_SCRIPT}"
  --input-dir "${INPUT_DIR}"
  --output-dir "${OUTPUT_DIR}"
  --alpha-threshold "${ALPHA_THRESHOLD}"
  --keep-area-min "${KEEP_AREA_MIN}"
  --keep-area-ratio "${KEEP_AREA_RATIO}"
  --keep-margin "${KEEP_MARGIN}"
  --keep-near-distance "${KEEP_NEAR_DISTANCE}"
  --keep-center-distance "${KEEP_CENTER_DISTANCE}")

if [[ "${DRY_RUN}" == "1" ]]; then
  cmd+=(--dry-run)
fi

if [[ "${IN_PLACE}" == "1" ]]; then
  cmd+=(--in-place)
fi

if [[ "${INCLUDE_SKIPPED}" == "1" ]]; then
  cmd+=(--include-skipped)
fi

if [[ -n "${REPORT_BASE}" ]]; then
  cmd+=(--report-base "${REPORT_BASE}")
fi

if [[ -n "${PREVIEW_SHEET}" ]]; then
  cmd+=(--preview-sheet "${PREVIEW_SHEET}")
fi

printf 'Running cleanup with settings:\n'
printf '  INPUT_DIR=%s\n' "${INPUT_DIR}"
printf '  OUTPUT_DIR=%s\n' "${OUTPUT_DIR}"
printf '  DRY_RUN=%s\n' "${DRY_RUN}"
printf '  IN_PLACE=%s\n' "${IN_PLACE}"
printf '  INCLUDE_SKIPPED=%s\n' "${INCLUDE_SKIPPED}"
printf '  KEEP_AREA_MIN=%s\n' "${KEEP_AREA_MIN}"
printf '  KEEP_AREA_RATIO=%s\n' "${KEEP_AREA_RATIO}"
printf '  KEEP_MARGIN=%s\n' "${KEEP_MARGIN}"
printf '  KEEP_NEAR_DISTANCE=%s\n' "${KEEP_NEAR_DISTANCE}"
printf '  KEEP_CENTER_DISTANCE=%s\n' "${KEEP_CENTER_DISTANCE}"

"${cmd[@]}"
