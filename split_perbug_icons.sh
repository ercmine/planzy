#!/usr/bin/env bash
set -Eeuo pipefail

trap 'echo "[ERROR] Failed at line $LINENO" >&2; exit 1' ERR

# Usage:
#   IMAGE_NAME="/full/path/to/icon_sheet.jpeg" ~/split_perbug_icons.sh
#   IMAGE_NAME="/full/path/to/icon_sheet.jpeg" OUTPUT_DIR="/desired/output/dir" ~/split_perbug_icons.sh
#
# Required:
#   IMAGE_NAME  -> full input image path
#
# Optional:
#   OUTPUT_DIR  -> output folder (default: $HOME/perbug-node-icons)

: "${IMAGE_NAME:?Set IMAGE_NAME to the full input image path before running this script}"
OUTPUT_DIR="${OUTPUT_DIR:-$HOME/perbug-node-icons}"

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

log "Preparing output directory"
mkdir -p "$OUTPUT_DIR"

log "Splitting icon sheet into 8 square transparent PNGs from: $IMAGE_NAME"
python3 - "$IMAGE_NAME" "$OUTPUT_DIR" <<'PY'
import os
import sys
from PIL import Image

input_path = sys.argv[1]
output_dir = sys.argv[2]

names = [
    "encounter",
    "resource",
    "mission",
    "shop",
    "rare",
    "boss",
    "rest",
    "event",
]

img = Image.open(input_path).convert("RGBA")
w, h = img.size
cols, rows = 4, 2
cell_w = w // cols
cell_h = h // rows

# Sample background from top-left.
bg = img.getpixel((5, 5))[:3]

def color_close(rgb, bg_rgb, threshold=30):
    return all(abs(int(rgb[i]) - int(bg_rgb[i])) <= threshold for i in range(3))

def trim_background(cell, bg_rgb, threshold=30):
    pix = cell.load()
    cw, ch = cell.size

    for y in range(ch):
        for x in range(cw):
            r, g, b, a = pix[x, y]
            if color_close((r, g, b), bg_rgb, threshold):
                pix[x, y] = (r, g, b, 0)
            else:
                pix[x, y] = (r, g, b, 255)

    bbox = cell.getbbox()
    if bbox is None:
        return cell.crop((0, 0, 1, 1))
    return cell.crop(bbox)

for idx, name in enumerate(names):
    row = idx // cols
    col = idx % cols

    left = col * cell_w
    upper = row * cell_h
    right = left + cell_w
    lower = upper + cell_h

    cell = img.crop((left, upper, right, lower))
    trimmed = trim_background(cell, bg, threshold=30)

    tw, th = trimmed.size
    side = max(tw, th)

    # Add padding so the icon isn't tight to the edge.
    side = int(side * 1.20)
    if side < 64:
        side = 64

    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    x = (side - tw) // 2
    y = (side - th) // 2
    canvas.alpha_composite(trimmed, (x, y))

    out_path = os.path.join(output_dir, f"{name}.png")
    canvas.save(out_path)

    print(f"[OK] Wrote {out_path}")
PY

log "Done"
echo "Output folder: $OUTPUT_DIR"
echo "Files:"
ls -1 "$OUTPUT_DIR"
