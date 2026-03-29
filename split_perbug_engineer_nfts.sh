#!/usr/bin/env bash
set -Eeuo pipefail

trap 'echo "[ERROR] Failed at line $LINENO" >&2; exit 1' ERR

# Usage:
#   IMAGE_NAME="/full/path/to/engineer_sheet.png" ~/split_perbug_engineer_nfts.sh
#   IMAGE_NAME="/full/path/to/engineer_sheet.png" OUTPUT_DIR="$HOME/perbug-engineer-nfts" UPSCALE_SIZE=512 ~/split_perbug_engineer_nfts.sh
#
# Required:
#   IMAGE_NAME -> full path to the engineer class sheet
#
# Optional:
#   OUTPUT_DIR   -> output folder (default: $HOME/perbug-engineer-nfts)
#   UPSCALE_SIZE -> output size for each split PNG (default: 512)

: "${IMAGE_NAME:?Set IMAGE_NAME to the full input image path before running this script}"
OUTPUT_DIR="${OUTPUT_DIR:-$HOME/perbug-engineer-nfts}"
UPSCALE_SIZE="${UPSCALE_SIZE:-512}"

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

log "Splitting Perbug engineer NFT sheet from: $IMAGE_NAME"
python3 - "$IMAGE_NAME" "$OUTPUT_DIR" "$UPSCALE_SIZE" <<'PY'
import colorsys
import csv
import os
import re
import sys
from collections import deque
from PIL import Image

input_path = sys.argv[1]
output_dir = sys.argv[2]
upscale_size = int(sys.argv[3])

GRID = 8  # 8x8 engineer sheet

img = Image.open(input_path).convert("RGBA")
w, h = img.size
cell_w = w // GRID
cell_h = h // GRID

if cell_w <= 0 or cell_h <= 0:
    raise SystemExit("[ERROR] Invalid image size for 8x8 grid.")

COLOR_WORDS = {
    "red":    ["ember", "scarlet", "forge", "crimson", "pyre"],
    "orange": ["cinder", "amber", "molten", "auric", "sunfire"],
    "yellow": ["golden", "spark", "gilded", "solar", "dawn"],
    "green":  ["verdant", "moss", "tox", "viridian", "thorn"],
    "cyan":   ["mist", "tidal", "frost", "aqua", "glacier"],
    "blue":   ["azure", "storm", "cobalt", "sapphire", "deep"],
    "purple": ["arcane", "violet", "void", "amethyst", "dusk"],
    "pink":   ["rose", "prism", "glimmer", "aurora", "blush"],
    "white":  ["ivory", "pearl", "moon", "ashen", "pale"],
    "dark":   ["shadow", "onyx", "obsidian", "night", "smoke"],
}

ENGINEER_WORDS = [
    "tinkerer",
    "gearwright",
    "machinist",
    "forgehand",
    "boltkeeper",
    "wrenchsage",
    "circuiteer",
    "ironmaker",
    "cogsmith",
    "sparkwright",
    "toolmaster",
    "voltmechanic",
]

RARITIES = [
    (0.16, "common"),
    (0.32, "uncommon"),
    (0.54, "rare"),
    (0.74, "epic"),
    (0.90, "legendary"),
    (1.01, "mythic"),
]

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "_", text)
    text = re.sub(r"_+", "_", text).strip("_")
    return text

def flood_remove_background(rgba_img):
    im = rgba_img.copy()
    px = im.load()
    w, h = im.size

    visited = [[False] * w for _ in range(h)]
    q = deque()

    def near_bg(r, g, b):
        return (r > 225 and g > 225 and b > 225) or ((r + g + b) > 715)

    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))

    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or visited[y][x]:
            continue
        visited[y][x] = True

        r, g, b, a = px[x, y]
        if a == 0:
            continue

        if near_bg(r, g, b):
            px[x, y] = (r, g, b, 0)
            q.append((x + 1, y))
            q.append((x - 1, y))
            q.append((x, y + 1))
            q.append((x, y - 1))

    return im

def trim_alpha(im):
    bbox = im.getbbox()
    if bbox is None:
        return im.crop((0, 0, 1, 1))
    return im.crop(bbox)

def analyze_sprite(im):
    px = im.load()
    w, h = im.size
    pixels = []
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 0:
                pixels.append((r, g, b))

    if not pixels:
        return {
            "rarity": "common",
            "color_family": "dark",
            "score": 0.0,
        }

    sats = []
    vals = []
    hues = []

    for r, g, b in pixels:
        h_, s_, v_ = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
        sats.append(s_)
        vals.append(v_)
        hues.append(h_)

    sat_avg = sum(sats) / len(sats)
    val_avg = sum(vals) / len(vals)
    hue_avg = sum(hues) / len(hues)

    deg = hue_avg * 360

    if val_avg > 0.88 and sat_avg < 0.18:
        color_family = "white"
    elif val_avg < 0.28 and sat_avg < 0.30:
        color_family = "dark"
    else:
        if deg < 15 or deg >= 345:
            color_family = "red"
        elif deg < 45:
            color_family = "orange"
        elif deg < 75:
            color_family = "yellow"
        elif deg < 150:
            color_family = "green"
        elif deg < 195:
            color_family = "cyan"
        elif deg < 255:
            color_family = "blue"
        elif deg < 330:
            color_family = "purple"
        else:
            color_family = "pink"

    fill_ratio = len(pixels) / max(1, (w * h))
    uniqueish = len(set((r // 20, g // 20, b // 20) for r, g, b in pixels))
    bright_glow = sum(1 for (r, g, b) in pixels if max(r, g, b) > 210 and (max(r, g, b) - min(r, g, b)) > 35)
    glow_ratio = bright_glow / max(1, len(pixels))

    score = 0.0
    score += min(1.0, sat_avg) * 0.18
    score += min(1.0, uniqueish / 18.0) * 0.22
    score += min(1.0, glow_ratio * 2.3) * 0.18
    score += min(1.0, fill_ratio * 1.10) * 0.08

    if color_family in ("orange", "yellow", "blue", "green", "dark"):
        score += 0.12
    if glow_ratio > 0.15:
        score += 0.09
    if sat_avg > 0.48:
        score += 0.05

    for threshold, rarity in RARITIES:
        if score <= threshold:
            return {
                "rarity": rarity,
                "color_family": color_family,
                "score": score,
            }

def build_name(index, color_family):
    left = COLOR_WORDS[color_family][index % len(COLOR_WORDS[color_family])]
    right = ENGINEER_WORDS[(index // len(COLOR_WORDS[color_family])) % len(ENGINEER_WORDS)]
    return f"{left}_{right}"

metadata_path = os.path.join(output_dir, "perbug_engineer_metadata.csv")
rows = []

count = 0
for gy in range(GRID):
    for gx in range(GRID):
        count += 1
        left = gx * cell_w
        top = gy * cell_h
        right = left + cell_w
        bottom = top + cell_h

        cell = img.crop((left, top, right, bottom))
        cell = flood_remove_background(cell)
        cell = trim_alpha(cell)

        info = analyze_sprite(cell)
        unit_name = build_name(count - 1, info["color_family"])
        filename = f"{count:03d}_{info['rarity']}_{slugify(unit_name)}.png"

        cw, ch = cell.size
        side = max(cw, ch, 16)
        side = int(side * 1.14)

        canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        paste_x = (side - cw) // 2
        paste_y = (side - ch) // 2
        canvas.alpha_composite(cell, (paste_x, paste_y))

        upscaled = canvas.resize((upscale_size, upscale_size), Image.NEAREST)
        out_path = os.path.join(output_dir, filename)
        upscaled.save(out_path)

        rows.append({
            "index": count,
            "grid_x": gx,
            "grid_y": gy,
            "filename": filename,
            "rarity": info["rarity"],
            "name": unit_name,
            "role": "engineer",
            "color_family": info["color_family"],
            "score": f"{info['score']:.4f}",
        })

with open(metadata_path, "w", newline="") as f:
    writer = csv.DictWriter(
        f,
        fieldnames=["index", "grid_x", "grid_y", "filename", "rarity", "name", "role", "color_family", "score"],
    )
    writer.writeheader()
    writer.writerows(rows)

print(f"[OK] Wrote {len(rows)} engineer NFTs into {output_dir}")
print(f"[OK] Metadata CSV: {metadata_path}")
PY

log "Done"
echo "Output folder: $OUTPUT_DIR"
echo "Example files:"
ls -1 "$OUTPUT_DIR" | head
