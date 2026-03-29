#!/usr/bin/env bash
set -Eeuo pipefail

trap 'echo "[ERROR] Failed at line $LINENO" >&2; exit 1' ERR

# Usage:
#   IMAGE_NAME="/full/path/to/resource_sheet.png" ~/split_perbug_resources.sh
#   IMAGE_NAME="/full/path/to/resource_sheet.png" OUTPUT_DIR="$HOME/perbug-resources" ~/split_perbug_resources.sh
#
# Required:
#   IMAGE_NAME  -> full input image path
#
# Optional:
#   OUTPUT_DIR  -> output folder (default: $HOME/perbug-resources)

: "${IMAGE_NAME:?Set IMAGE_NAME to the full input image path before running this script}"
OUTPUT_DIR="${OUTPUT_DIR:-$HOME/perbug-resources}"

log() {
  echo
  echo "============================================================"
  echo "$*"
  echo "============================================================"
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "[ERROR] Missing required command: $1" >&2
    exit 1
  }
}

ensure_pillow() {
  if python3 - <<'PY' >/dev/null 2>&1
from PIL import Image
PY
  then
    return 0
  fi

  log "Pillow not found. Attempting installation."
  if command -v apt-get >/dev/null 2>&1 && [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    apt-get update
    apt-get install -y python3-pil
  elif command -v pip3 >/dev/null 2>&1; then
    pip3 install --user pillow
  else
    echo "[ERROR] Could not install Pillow automatically." >&2
    echo "Install one of: python3-pil or pillow, then rerun." >&2
    exit 1
  fi
}

log "Checking requirements"
need_cmd python3
ensure_pillow

if [[ ! -f "$IMAGE_NAME" ]]; then
  echo "[ERROR] IMAGE_NAME does not exist: $IMAGE_NAME" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

log "Splitting and naming resource sheet from: $IMAGE_NAME"
python3 - "$IMAGE_NAME" "$OUTPUT_DIR" <<'PY'
import os
import sys
from PIL import Image

input_path = sys.argv[1]
output_dir = sys.argv[2]

# Reading order: left-to-right, top row then bottom row
names = [
    "resource_ore.png",
    "resource_crystal.png",
    "resource_bio_matter.png",
    "resource_perbug_token.png",
    "resource_relic_fragments.png",
    "resource_signal_shards.png",
    "resource_fuel.png",
    "resource_perbug_energy.png",
]

img = Image.open(input_path).convert("RGBA")
w, h = img.size
cols = 4
rows = 2
cell_w = w // cols
cell_h = h // rows

# Sample the light background from top-left
bg = img.getpixel((5, 5))[:3]

def color_close(rgb, bg_rgb, threshold=20):
    return all(abs(int(rgb[i]) - int(bg_rgb[i])) <= threshold for i in range(3))

def key_background_to_alpha(cell, bg_rgb, threshold=20):
    out = cell.copy()
    px = out.load()
    cw, ch = out.size
    for y in range(ch):
        for x in range(cw):
            r, g, b, a = px[x, y]
            if color_close((r, g, b), bg_rgb, threshold):
                px[x, y] = (r, g, b, 0)
            else:
                px[x, y] = (r, g, b, 255)
    return out

def trim_alpha(im):
    bbox = im.getbbox()
    if bbox is None:
        return im.crop((0, 0, 1, 1))
    return im.crop(bbox)

for idx, out_name in enumerate(names):
    row = idx // cols
    col = idx % cols

    left = col * cell_w
    top = row * cell_h
    right = left + cell_w
    bottom = top + cell_h

    cell = img.crop((left, top, right, bottom))
    cell = key_background_to_alpha(cell, bg, threshold=20)
    cell = trim_alpha(cell)

    cw, ch = cell.size
    side = max(cw, ch)
    side = int(side * 1.15)
    if side < 192:
        side = 192

    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    x = (side - cw) // 2
    y = (side - ch) // 2
    canvas.alpha_composite(cell, (x, y))

    out_path = os.path.join(output_dir, out_name)
    canvas.save(out_path)

    print(f"[OK] Wrote {out_path}")
PY

log "Done"
echo "Output folder: $OUTPUT_DIR"
echo "Files created:"
ls -1 "$OUTPUT_DIR"
