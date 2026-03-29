#!/usr/bin/env bash
set -Eeuo pipefail

trap 'echo "[ERROR] Failed at line $LINENO" >&2; exit 1' ERR

BASE_DIR="/root/perbug"
OUT_ROOT="${OUT_ROOT:-$BASE_DIR/generated_assets}"
UPSCALE="${UPSCALE:-512}"
PY_SPLITTER="$BASE_DIR/scripts/perbug_splitter.py"

log() {
  echo
  echo "============================================================"
  echo "$*"
  echo "============================================================"
}

need_file() {
  [[ -f "$1" ]] || {
    echo "[ERROR] Missing required file: $1" >&2
    exit 1
  }
}

run_shell_split() {
  local script_name="$1"
  local image_name="$2"
  local out_dir="$3"

  need_file "$BASE_DIR/$script_name"
  need_file "$BASE_DIR/$image_name"

  mkdir -p "$out_dir"

  log "Running $script_name on $image_name -> $out_dir"
  (
    cd "$BASE_DIR"
    IMAGE_NAME="$BASE_DIR/$image_name" \
    OUTPUT_DIR="$out_dir" \
    UPSCALE_SIZE="$UPSCALE" \
    "./$script_name"
  )
}

run_python_split() {
  local mode="$1"
  local image_name="$2"
  local out_dir="$3"

  need_file "$PY_SPLITTER"
  need_file "$BASE_DIR/$image_name"

  mkdir -p "$out_dir"

  log "Running perbug_splitter.py $mode on $image_name -> $out_dir"
  python3 "$PY_SPLITTER" "$mode" "$BASE_DIR/$image_name" "$out_dir" "$UPSCALE"
}

log "Preparing output root"
mkdir -p "$OUT_ROOT"

# Character / unit sheets
run_shell_split "split_perbug_tank_nfts.sh"      "perbug_tank_sheet.png"      "$OUT_ROOT/characters/tank"
run_shell_split "split_perbug_scout_nfts.sh"     "perbug_scout_sheet.png"     "$OUT_ROOT/characters/scout"
run_shell_split "split_perbug_caster_nfts.sh"    "perbug_caster_sheet.png"    "$OUT_ROOT/characters/caster"
run_shell_split "split_perbug_support_nfts.sh"   "perbug_support_sheet.png"   "$OUT_ROOT/characters/support"
run_shell_split "split_perbug_cleric_nfts.sh"    "perbug_cleric_sheet.png"    "$OUT_ROOT/characters/cleric"
run_shell_split "split_perbug_assassin_nfts.sh"  "perbug_assassin_sheet.png"  "$OUT_ROOT/characters/assassin"
run_shell_split "split_perbug_engineer_nfts.sh"  "perbug_engineer_sheet.png"  "$OUT_ROOT/characters/engineer"
run_shell_split "split_perbug_warrior_nfts.sh"   "perbug_warrior_sheet.png"   "$OUT_ROOT/characters/warrior"

# Portraits
run_shell_split "split_perbug_portraits.sh"      "perbug_portrait_sheet.png"  "$OUT_ROOT/portraits"

# Node systems
run_shell_split "split_perbug_icons.sh"          "perbug_node_icon_sheet.png" "$OUT_ROOT/nodes/icons"
run_shell_split "split_perbug_node_tiles.sh"     "perbug_node_tiles_sheet.png" "$OUT_ROOT/nodes/tiles"

# Encounters
run_shell_split "split_perbug_encounter_cards.sh" "perbug_encounter_cards_sheet.png" "$OUT_ROOT/encounters/cards"

# Resources / materials / relics / token family
run_shell_split "split_perbug_resources.sh"      "perbug_resource_sheet.png"  "$OUT_ROOT/economy/resources"
run_shell_split "split_perbug_material_nfts.sh"  "perbug_material_sheet.png"  "$OUT_ROOT/economy/materials"
run_shell_split "split_perbug_relics.sh"         "perbug_relic_sheet_01.png"  "$OUT_ROOT/relics/set_01"
run_shell_split "split_perbug_relics.sh"         "perbug_relic_sheet_02.png"  "$OUT_ROOT/relics/set_02"
run_shell_split "split_perbug_token_family.sh"   "perbug_token_family.png"    "$OUT_ROOT/economy/token_family"

# Unsplit UI/source assets copied into a clean assets tree
log "Copying unsplit UI/source assets"
mkdir -p "$OUT_ROOT/ui"
cp -f "$BASE_DIR/perbug_token_hud.png" "$OUT_ROOT/ui/"
cp -f "$BASE_DIR/perbug_crafting_screen.png" "$OUT_ROOT/ui/"
cp -f "$BASE_DIR/perbug_encounter_transition.png" "$OUT_ROOT/ui/"

log "Writing manifest"
python3 - <<'PY'
import json
import os
from pathlib import Path

out_root = Path("/root/perbug/generated_assets")
manifest = {}

for path in sorted(out_root.rglob("*")):
    if path.is_file():
        rel = path.relative_to(out_root).as_posix()
        top = rel.split("/")[0]
        manifest.setdefault(top, []).append(rel)

manifest_path = out_root / "manifest.json"
manifest_path.write_text(json.dumps(manifest, indent=2))
print(f"[OK] Wrote {manifest_path}")
PY

log "Done"
echo "Assets written to: $OUT_ROOT"
echo
echo "Top-level directories:"
find "$OUT_ROOT" -maxdepth 2 -type d | sort
