#!/usr/bin/env bash
set -Eeuo pipefail

# rename_and_process_random_pngs.sh
# Safe workflow for UUID-style PNG assets.

TARGET_DIR="${TARGET_DIR:-/root/perbug}"
APPLY="${APPLY:-0}"
DRY_RUN="${DRY_RUN:-1}"
RUN_SPLITS="${RUN_SPLITS:-0}"
REPLACE_ORIGINALS="${REPLACE_ORIGINALS:-0}"

if [[ "$APPLY" == "1" ]]; then
  DRY_RUN=0
fi
if [[ "$DRY_RUN" == "1" ]]; then
  RUN_SPLITS=0
fi

UUID_RE='^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.png$'

# Known explicit exclusions.
EXCLUDED_NAMES=(
  perbug.png
  perbug.svg
  perbug1.png
  doge.png
  dryad.svg
  dryad1.svg
)

log() { echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] $*"; }
warn() { echo "[WARN] $*" >&2; }
err() { echo "[ERROR] $*" >&2; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { err "Missing required command: $1"; exit 1; }
}

require_cmd python3

if [[ ! -d "$TARGET_DIR" ]]; then
  err "Target directory does not exist: $TARGET_DIR"
  exit 1
fi

SCRIPT_HOME="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "$SCRIPT_HOME/.." && pwd)"

# Build mapping from canonical asset file name -> split script.
declare -A SPLIT_BY_TYPE=(
  [tank_sheet]="split_perbug_tank_nfts.sh"
  [scout_sheet]="split_perbug_scout_nfts.sh"
  [caster_sheet]="split_perbug_caster_nfts.sh"
  [support_sheet]="split_perbug_support_nfts.sh"
  [cleric_sheet]="split_perbug_cleric_nfts.sh"
  [assassin_sheet]="split_perbug_assassin_nfts.sh"
  [engineer_sheet]="split_perbug_engineer_nfts.sh"
  [warrior_sheet]="split_perbug_warrior_nfts.sh"
  [relic_sheet]="split_perbug_relics.sh"
  [resource_sheet]="split_perbug_resources.sh"
  [material_sheet]="split_perbug_material_nfts.sh"
  [token_family]="split_perbug_token_family.sh"
  [node_tiles_sheet]="split_perbug_node_tiles.sh"
  [node_icon_sheet]="split_perbug_icons.sh"
  [portrait_sheet]="split_perbug_portraits.sh"
  [encounter_cards_sheet]="split_perbug_encounter_cards.sh"
)

# Type to preferred canonical output names.
declare -A TYPE_PRIMARY_NAME=(
  [tank_sheet]="perbug_tank_sheet.png"
  [scout_sheet]="perbug_scout_sheet.png"
  [caster_sheet]="perbug_caster_sheet.png"
  [support_sheet]="perbug_support_sheet.png"
  [cleric_sheet]="perbug_cleric_sheet.png"
  [assassin_sheet]="perbug_assassin_sheet.png"
  [engineer_sheet]="perbug_engineer_sheet.png"
  [warrior_sheet]="perbug_warrior_sheet.png"
  [relic_sheet]="perbug_relic_sheet_01.png"
  [resource_sheet]="perbug_resource_sheet.png"
  [material_sheet]="perbug_material_sheet.png"
  [token_family]="perbug_token_family.png"
  [node_tiles_sheet]="perbug_node_tiles_sheet.png"
  [node_icon_sheet]="perbug_node_icon_sheet.png"
  [portrait_sheet]="perbug_portrait_sheet.png"
  [encounter_cards_sheet]="perbug_encounter_cards_sheet.png"
)

choose_unknown_name() {
  local idx="$1"
  local style="$2"
  if [[ "$style" == "sheet" ]]; then
    printf 'unknown_sheet_%02d.png' "$idx"
  else
    printf 'unknown_ui_asset_%02d.png' "$idx"
  fi
}

is_excluded_name() {
  local n="$1"
  for x in "${EXCLUDED_NAMES[@]}"; do
    [[ "$x" == "$n" ]] && return 0
  done
  return 1
}

safe_target_path() {
  local dir="$1"; shift
  local desired="$1"
  local base="${desired%.png}"
  local ext=".png"
  local candidate="$dir/$desired"
  local i=1
  while [[ -e "$candidate" ]]; do
    candidate="$dir/${base}_dup$(printf '%02d' "$i")${ext}"
    ((i++))
  done
  printf '%s' "$candidate"
}

create_svg_wrapper() {
  local png_path="$1"
  local svg_path="$2"
  local b64
  b64="$(base64 -w 0 "$png_path")"
  cat > "$svg_path" <<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <image width="1024" height="1024" href="data:image/png;base64,${b64}"/>
</svg>
SVG
}

try_true_vector_icon() {
  local normalized_png="$1"
  local svg_out="$2"
  # Best-effort only: suitable for simple icon-like assets.
  if command -v convert >/dev/null 2>&1 && command -v potrace >/dev/null 2>&1; then
    local tmp_pbm
    tmp_pbm="$(mktemp --suffix=.pbm)"
    if convert "$normalized_png" -alpha set -background none -colorspace Gray -threshold 60% "$tmp_pbm" >/dev/null 2>&1 && potrace "$tmp_pbm" -s -o "$svg_out" >/dev/null 2>&1; then
      rm -f "$tmp_pbm"
      return 0
    fi
    rm -f "$tmp_pbm"
  fi
  return 1
}

TMP_PLAN="$(mktemp)"
trap 'rm -f "$TMP_PLAN"' EXIT

python3 - "$TARGET_DIR" "$UUID_RE" <<'PY' > "$TMP_PLAN"
import json
import os
import re
import sys
from pathlib import Path

from PIL import Image

root = Path(sys.argv[1])
uuid_re = re.compile(sys.argv[2], re.IGNORECASE)

canon = {
    "perbug_tank_sheet.png": "tank_sheet",
    "perbug_scout_sheet.png": "scout_sheet",
    "perbug_caster_sheet.png": "caster_sheet",
    "perbug_support_sheet.png": "support_sheet",
    "perbug_cleric_sheet.png": "cleric_sheet",
    "perbug_assassin_sheet.png": "assassin_sheet",
    "perbug_engineer_sheet.png": "engineer_sheet",
    "perbug_warrior_sheet.png": "warrior_sheet",
    "perbug_relic_sheet_01.png": "relic_sheet",
    "perbug_relic_sheet_02.png": "relic_sheet",
    "perbug_resource_sheet.png": "resource_sheet",
    "perbug_material_sheet.png": "material_sheet",
    "perbug_token_family.png": "token_family",
    "perbug_node_tiles_sheet.png": "node_tiles_sheet",
    "perbug_node_icon_sheet.png": "node_icon_sheet",
    "perbug_portrait_sheet.png": "portrait_sheet",
    "perbug_encounter_cards_sheet.png": "encounter_cards_sheet",
}


def ahash(path):
    with Image.open(path) as im:
        rgba = im.convert("RGBA")
        small = rgba.resize((16, 16), Image.Resampling.BILINEAR).convert("L")
        px = list(small.tobytes())
        avg = sum(px) / len(px)
        bits = ''.join('1' if value >= avg else '0' for value in px)
        return bits, rgba.size


def hamming(a, b):
    return sum(ch1 != ch2 for ch1, ch2 in zip(a, b))

references = []
for p in root.iterdir():
    if not p.is_file() or p.suffix.lower() != ".png":
        continue
    if p.name not in canon:
        continue
    try:
        h, size = ahash(p)
    except Exception:
        continue
    references.append({"name": p.name, "type": canon[p.name], "hash": h, "size": size})

items = []
for p in sorted(root.iterdir()):
    if not p.is_file() or p.suffix.lower() != ".png":
        continue
    if not uuid_re.match(p.name):
        continue
    try:
        h, (w, hgt) = ahash(p)
    except Exception as exc:
        items.append({
            "source": p.name,
            "error": str(exc),
            "classification": "unknown",
            "confidence": 0.0,
            "reason": "image-read-failed",
            "style": "ui",
        })
        continue

    best = None
    for ref in references:
        d = hamming(h, ref["hash"])
        if best is None or d < best["d"]:
            best = {"d": d, "ref": ref}

    classification = "unknown"
    confidence = 0.20
    reason = []
    style = "sheet" if (w % 8 == 0 and hgt % 8 == 0 and min(w, hgt) >= 256) else "ui"

    if best is not None:
        d = best["d"]
        ref = best["ref"]
        if d <= 8:
            classification = ref["type"]
            confidence = 0.98
            reason.append(f"hash-distance={d} to {ref['name']}")
        elif d <= 16:
            classification = ref["type"]
            confidence = 0.80
            reason.append(f"hash-distance={d} to {ref['name']}")
        elif d <= 24:
            confidence = 0.55
            reason.append(f"weak-hash-distance={d} to {ref['name']}")

    if classification == "unknown":
        if w == hgt and w in (2048, 4096):
            reason.append("square-sheet-like-dimensions")
            confidence = max(confidence, 0.35)
        if w > hgt * 1.3 or hgt > w * 1.3:
            reason.append("non-square-ui-or-card-like")
            style = "ui"

    items.append({
        "source": p.name,
        "width": w,
        "height": hgt,
        "classification": classification,
        "confidence": round(confidence, 2),
        "reason": "; ".join(reason) if reason else "dimension-heuristic-only",
        "style": style,
    })

print(json.dumps({"items": items}, indent=2))
PY

PLAN_JSON="$(cat "$TMP_PLAN")"

mapfile -t PLAN_ROWS < <(python3 - <<'PY' "$TMP_PLAN"
import json,sys
obj=json.load(open(sys.argv[1]))
for it in obj["items"]:
    print("\t".join([
        it.get("source",""),
        it.get("classification","unknown"),
        str(it.get("confidence",0.0)),
        it.get("reason",""),
        it.get("style","ui")
    ]))
PY
)

if [[ ${#PLAN_ROWS[@]} -eq 0 ]]; then
  log "No UUID-style PNG files found in $TARGET_DIR. Nothing to do."
  exit 0
fi

unknown_sheet_i=1
unknown_ui_i=1

declare -a SUMMARY_RENAMED=()
declare -a SUMMARY_1024=()
declare -a SUMMARY_SVG=()
declare -a SUMMARY_SPLITS=()

echo
printf '%-40s | %-28s | %-10s | %-34s | %-34s | %-35s\n' "SOURCE" "CLASSIFICATION" "CONF" "RENAMED_PNG" "PNG_1024" "SVG"
printf '%s\n' "$(printf -- '-%.0s' {1..195})"

for row in "${PLAN_ROWS[@]}"; do
  IFS=$'\t' read -r src class conf reason style <<< "$row"

  local_name=""
  if [[ -n "${TYPE_PRIMARY_NAME[$class]:-}" ]]; then
    local_name="${TYPE_PRIMARY_NAME[$class]}"
  else
    if [[ "$style" == "sheet" ]]; then
      local_name="$(choose_unknown_name "$unknown_sheet_i" "sheet")"
      ((unknown_sheet_i++))
    else
      local_name="$(choose_unknown_name "$unknown_ui_i" "ui")"
      ((unknown_ui_i++))
    fi
  fi

  target_png="$(safe_target_path "$TARGET_DIR" "$local_name")"
  target_png_name="$(basename "$target_png")"
  target_1024="${target_png%.png}_1024.png"
  target_svg="${target_png%.png}.svg"

  split_script=""
  split_status="SKIP"
  if (( $(awk "BEGIN{print ($conf >= 0.80)}") )); then
    split_script="${SPLIT_BY_TYPE[$class]:-}"
  fi

  printf '%-40s | %-28s | %-10s | %-34s | %-34s | %-35s\n' "$src" "$class" "$conf" "$target_png_name" "$(basename "$target_1024")" "$(basename "$target_svg")"
  log "Reason for $src: $reason"

  if [[ "$DRY_RUN" == "1" ]]; then
    if [[ -n "$split_script" ]]; then
      SUMMARY_SPLITS+=("DRY-RUN would run: $split_script IMAGE_NAME=$target_png")
    else
      SUMMARY_SPLITS+=("DRY-RUN no split: $src (confidence=$conf)")
    fi
    continue
  fi

  src_path="$TARGET_DIR/$src"
  if [[ ! -f "$src_path" ]]; then
    warn "Source disappeared, skipping: $src_path"
    continue
  fi

  if [[ "$REPLACE_ORIGINALS" == "1" ]]; then
    mv -- "$src_path" "$target_png"
  else
    cp --update=none -- "$src_path" "$target_png"
  fi
  SUMMARY_RENAMED+=("$target_png")

  python3 - "$target_png" "$target_1024" <<'PY'
import sys
from PIL import Image
src = sys.argv[1]
out = sys.argv[2]
with Image.open(src).convert("RGBA") as im:
    w,h = im.size
    scale = min(1024/w, 1024/h)
    nw = max(1, int(round(w*scale)))
    nh = max(1, int(round(h*scale)))
    resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (1024,1024), (0,0,0,0))
    canvas.paste(resized, ((1024-nw)//2, (1024-nh)//2), resized)
    canvas.save(out, format="PNG")
PY
  SUMMARY_1024+=("$target_1024")

  vectorized=0
  if [[ "$class" == "node_icon_sheet" || "$class" == "resource_sheet" || "$class" == "relic_sheet" ]]; then
    if try_true_vector_icon "$target_1024" "$target_svg"; then
      vectorized=1
    fi
  fi
  if [[ "$vectorized" == "0" ]]; then
    create_svg_wrapper "$target_1024" "$target_svg"
  fi
  SUMMARY_SVG+=("$target_svg")

  if [[ "$RUN_SPLITS" == "1" && -n "$split_script" ]]; then
    split_path="$ROOT_DIR/$split_script"
    if [[ ! -x "$split_path" ]]; then
      # Some repos may not preserve executable bit in all environments.
      chmod +x "$split_path" 2>/dev/null || true
    fi
    if [[ -f "$split_path" ]]; then
      if IMAGE_NAME="$target_png" "$split_path" >/tmp/perbug_split_last.log 2>&1; then
        SUMMARY_SPLITS+=("OK $split_script IMAGE_NAME=$target_png")
      else
        SUMMARY_SPLITS+=("FAIL $split_script IMAGE_NAME=$target_png (see /tmp/perbug_split_last.log)")
      fi
    else
      SUMMARY_SPLITS+=("MISSING $split_script for $target_png")
    fi
  else
    SUMMARY_SPLITS+=("SKIP split for $target_png_name (confidence=$conf RUN_SPLITS=$RUN_SPLITS)")
  fi

done

echo
if [[ "$DRY_RUN" == "1" ]]; then
  log "Dry-run complete. No files were changed."
fi

log "Renamed/created source PNGs:"
if [[ ${#SUMMARY_RENAMED[@]} -eq 0 ]]; then
  echo "  (none)"
else
  printf '  %s\n' "${SUMMARY_RENAMED[@]}"
fi

log "Generated 1024 PNGs:"
if [[ ${#SUMMARY_1024[@]} -eq 0 ]]; then
  echo "  (none)"
else
  printf '  %s\n' "${SUMMARY_1024[@]}"
fi

log "Generated SVG companions:"
if [[ ${#SUMMARY_SVG[@]} -eq 0 ]]; then
  echo "  (none)"
else
  printf '  %s\n' "${SUMMARY_SVG[@]}"
fi

log "Split script results:"
if [[ ${#SUMMARY_SPLITS[@]} -eq 0 ]]; then
  echo "  (none)"
else
  printf '  %s\n' "${SUMMARY_SPLITS[@]}"
fi
