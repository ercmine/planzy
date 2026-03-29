#!/usr/bin/env bash
set -Eeuo pipefail

# rename_and_process_random_pngs.sh
# Deterministic rename + optional split workflow for known UUID-style PNG assets.

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

log() { echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] $*"; }
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

# UUID -> canonical asset filename mapping (grounded from ZIP).
declare -A UUID_TO_NAME=(
  [228C5CE8-D3B0-453A-8E46-64F01FAB93E9.png]="perbug_encounter_cards_sheet.png"
  [3BB6CC35-BFDC-4C18-BA87-C1CD0A668DF6.png]="perbug_warrior_sheet.png"
  [3C5A7529-A0F5-4A1C-9039-4A96BC0F673C.png]="perbug_resource_sheet.png"
  [526CE866-1F9E-40B1-9B7F-509BB540C38C.png]="perbug_assassin_sheet.png"
  [54C6227D-EE5B-48CB-AE6A-1E82C0D5A013.png]="perbug_material_sheet.png"
  [5D739433-EC5F-49C2-B306-41A13C0F91F5.png]="perbug_tank_sheet.png"
  [60461184-BB64-40A7-9FB6-48D295DEAC2E.png]="perbug_portrait_sheet.png"
  [6BD97D60-8C42-451B-AAEC-69A15E785C1C.png]="perbug_token_hud.png"
  [795171AC-B951-424C-AF25-F5D6A843DFED.png]="perbug_relic_sheet_01.png"
  [7CB2E2A9-9052-4655-99AA-020DF4C3A53A.png]="perbug_token_family.png"
  [8B4C5729-C6A4-4EE5-8D66-187C90C6FC6C.png]="perbug_node_tiles_sheet.png"
  [90C8F1DA-7F1F-4F2B-8B54-B39F86440FB4.png]="perbug_scout_sheet.png"
  [937EBBF0-AB03-41C3-90D9-65C4234ADE7B.png]="perbug_encounter_transition.png"
  [9535BADF-DAC6-4AFB-AB59-9950A43A09E2.png]="perbug_node_icon_sheet.png"
  [96E4EBAB-01F6-417F-9592-4AD7CD0E47B8.png]="perbug_caster_sheet.png"
  [A65E65B4-E6C2-4F7B-97A0-5D1C3214992C.png]="perbug_engineer_sheet.png"
  [B1E34202-F8A9-4CA9-A2E0-F54773A08D2C.png]="perbug_support_sheet.png"
  [C165F0F5-CCEE-46CE-8FA3-4C2C61035D3C.png]="perbug_crafting_screen.png"
  [CB9375F7-152D-4D4D-8F86-CC94B49679B9.png]="perbug_cleric_sheet.png"
  [DA733532-603A-4638-96C8-F592294046B2.png]="perbug_relic_sheet_02.png"
)

# Canonical asset filename -> split script mapping.
declare -A SPLIT_BY_NAME=(
  [perbug_encounter_cards_sheet.png]="split_perbug_encounter_cards.sh"
  [perbug_warrior_sheet.png]="split_perbug_warrior_nfts.sh"
  [perbug_resource_sheet.png]="split_perbug_resources.sh"
  [perbug_assassin_sheet.png]="split_perbug_assassin_nfts.sh"
  [perbug_material_sheet.png]="split_perbug_material_nfts.sh"
  [perbug_tank_sheet.png]="split_perbug_tank_nfts.sh"
  [perbug_portrait_sheet.png]="split_perbug_portraits.sh"
  [perbug_relic_sheet_01.png]="split_perbug_relics.sh"
  [perbug_relic_sheet_02.png]="split_perbug_relics.sh"
  [perbug_token_family.png]="split_perbug_token_family.sh"
  [perbug_node_tiles_sheet.png]="split_perbug_node_tiles.sh"
  [perbug_scout_sheet.png]="split_perbug_scout_nfts.sh"
  [perbug_node_icon_sheet.png]="split_perbug_icons.sh"
  [perbug_caster_sheet.png]="split_perbug_caster_nfts.sh"
  [perbug_engineer_sheet.png]="split_perbug_engineer_nfts.sh"
  [perbug_support_sheet.png]="split_perbug_support_nfts.sh"
  [perbug_cleric_sheet.png]="split_perbug_cleric_nfts.sh"
)

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

mapfile -t UUID_FILES < <(find "$TARGET_DIR" -maxdepth 1 -type f -name '*.png' -printf '%f\n' | grep -E "$UUID_RE" | sort)

if [[ ${#UUID_FILES[@]} -eq 0 ]]; then
  log "No UUID-style PNG files found in $TARGET_DIR. Nothing to do."
  exit 0
fi

declare -a SUMMARY_RENAMED=()
declare -a SUMMARY_1024=()
declare -a SUMMARY_SVG=()
declare -a SUMMARY_SPLITS=()
declare -a SUMMARY_SKIPPED=()

echo
printf '%-40s | %-34s | %-34s | %-35s | %-35s\n' "SOURCE" "RENAMED_PNG" "PNG_1024" "SVG" "SPLIT_SCRIPT"
printf '%s\n' "$(printf -- '-%.0s' {1..190})"

for src in "${UUID_FILES[@]}"; do
  mapped_name="${UUID_TO_NAME[$src]:-}"
  if [[ -z "$mapped_name" ]]; then
    SUMMARY_SKIPPED+=("$src (not in explicit UUID mapping)")
    continue
  fi

  target_png="$(safe_target_path "$TARGET_DIR" "$mapped_name")"
  target_png_name="$(basename "$target_png")"
  target_1024="${target_png%.png}_1024.png"
  target_svg="${target_png%.png}.svg"

  split_script="${SPLIT_BY_NAME[$mapped_name]:-none}"

  printf '%-40s | %-34s | %-34s | %-35s | %-35s\n' "$src" "$target_png_name" "$(basename "$target_1024")" "$(basename "$target_svg")" "$split_script"

  if [[ "$DRY_RUN" == "1" ]]; then
    if [[ "$split_script" != "none" ]]; then
      SUMMARY_SPLITS+=("DRY-RUN would run: $split_script IMAGE_NAME=$target_png")
    else
      SUMMARY_SPLITS+=("DRY-RUN no split: $target_png_name")
    fi
    continue
  fi

  src_path="$TARGET_DIR/$src"

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

  create_svg_wrapper "$target_1024" "$target_svg"
  SUMMARY_SVG+=("$target_svg")

  if [[ "$RUN_SPLITS" == "1" && "$split_script" != "none" ]]; then
    split_path="$ROOT_DIR/$split_script"
    if [[ ! -x "$split_path" ]]; then
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
    SUMMARY_SPLITS+=("SKIP split for $target_png_name (RUN_SPLITS=$RUN_SPLITS)")
  fi

done

echo
if [[ "$DRY_RUN" == "1" ]]; then
  log "Dry-run complete. No files were changed."
fi

if [[ ${#SUMMARY_SKIPPED[@]} -gt 0 ]]; then
  log "UUID PNGs skipped (no explicit mapping):"
  printf '  %s\n' "${SUMMARY_SKIPPED[@]}"
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
