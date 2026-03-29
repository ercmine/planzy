#!/usr/bin/env bash
set -Eeuo pipefail

trap 'echo "[ERROR] Failed at line $LINENO" >&2; exit 1' ERR

# Usage:
#   IMAGE_NAME="/full/path/to/material_sheet.png" ~/split_perbug_material_nfts.sh
#   IMAGE_NAME="/full/path/to/material_sheet.png" OUTPUT_DIR="$HOME/perbug-material-nfts" UPSCALE_SIZE=512 ~/split_perbug_material_nfts.sh
#
# Required:
#   IMAGE_NAME -> full path to the 2048x2048 material sheet
#
# Optional:
#   OUTPUT_DIR    -> output folder (default: $HOME/perbug-material-nfts)
#   UPSCALE_SIZE  -> output size for each split PNG (default: 512)

: "${IMAGE_NAME:?Set IMAGE_NAME to the full input image path before running this script}"
OUTPUT_DIR="${OUTPUT_DIR:-$HOME/perbug-material-nfts}"
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

log "Splitting Perbug material NFT sheet from: $IMAGE_NAME"
python3 - "$IMAGE_NAME" "$OUTPUT_DIR" "$UPSCALE_SIZE" <<'PY'
import colorsys
import csv
import os
import re
import sys
from collections import Counter, deque
from PIL import Image

input_path = sys.argv[1]
output_dir = sys.argv[2]
upscale_size = int(sys.argv[3])

GRID = 32
CELL = 64

img = Image.open(input_path).convert("RGBA")
w, h = img.size

if w != 2048 or h != 2048:
    raise SystemExit(f"[ERROR] Expected 2048x2048 sheet, got {w}x{h}")

# Material-style word banks
COLOR_WORDS = {
    "red":    ["ember", "crimson", "pyre", "scarlet", "lava"],
    "orange": ["amber", "cinder", "sunfire", "molten", "auric"],
    "yellow": ["solar", "gilded", "aurum", "spark", "golden"],
    "green":  ["verdant", "toxic", "moss", "viridian", "thorn"],
    "cyan":   ["aqua", "glacier", "tidal", "mist", "frost"],
    "blue":   ["azure", "cobalt", "storm", "sapphire", "deepsea"],
    "purple": ["violet", "arcane", "amethyst", "void", "dusk"],
    "pink":   ["rose", "blush", "prism", "aurora", "glimmer"],
    "white":  ["ivory", "pale", "moon", "pearl", "ashen"],
    "dark":   ["obsidian", "shadow", "night", "basalt", "onyx"],
}

MATERIAL_WORDS = {
    "chunky": ["ore", "geode", "lump", "core", "cluster", "nodule"],
    "crystal": ["crystal", "shard", "spire", "prism", "facet", "cluster"],
    "organic": ["biomass", "sporemass", "seedcore", "slimeheart", "mireblob", "vineknot"],
    "dense": ["fragment", "relic", "slab", "plate", "chunk", "vein"],
    "glow": ["essence", "core", "spark", "charge", "flux", "sigil"],
}

RARITIES = [
    (0.20, "common"),
    (0.38, "uncommon"),
    (0.58, "rare"),
    (0.75, "epic"),
    (0.90, "legendary"),
    (1.01, "mythic"),
]

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "_", text)
    text = re.sub(r"_+", "_", text).strip("_")
    return text

def flood_key_background(rgba_img):
    """Remove dark cell background by flood-filling from the borders only."""
    im = rgba_img.copy()
    px = im.load()
    w, h = im.size

    visited = [[False] * w for _ in range(h)]
    q = deque()

    def near_bg(r, g, b):
        # tuned for dark sprite sheet background
        return (r < 70 and g < 70 and b < 70) or ((r + g + b) < 150)

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

def analyze_material(im):
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
            "family": "dense",
            "color_family": "dark",
            "rarity": "common",
            "score": 0.0,
        }

    brightness = sum((r + g + b) / 3 for r, g, b in pixels) / len(pixels)
    sats = []
    hues = []
    for r, g, b in pixels:
        h_, s_, v_ = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
        sats.append(s_)
        hues.append(h_)

    sat_avg = sum(sats) / len(sats)
    hue_avg = sum(hues) / len(hues)

    # rough color family
    if brightness > 215 and sat_avg < 0.25:
        color_family = "white"
    elif brightness < 80 and sat_avg < 0.35:
        color_family = "dark"
    else:
        deg = hue_avg * 360
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
        elif deg < 315:
            color_family = "purple"
        else:
            color_family = "pink"

    # shape/family heuristic
    fill_ratio = len(pixels) / (w * h)
    uniqueish = len(set((r // 24, g // 24, b // 24) for r, g, b in pixels))

    # detect glow-ish pixels
    glowish = sum(1 for (r, g, b) in pixels if max(r, g, b) > 210 and (max(r, g, b) - min(r, g, b)) > 40)
    glow_ratio = glowish / max(1, len(pixels))

    if fill_ratio > 0.42 and color_family in ("green",) and sat_avg > 0.55:
        family = "organic"
    elif sat_avg > 0.50 and uniqueish > 18:
        family = "crystal"
    elif glow_ratio > 0.22:
        family = "glow"
    elif fill_ratio > 0.50:
        family = "dense"
    else:
        family = "chunky"

    # rarity score
    score = 0.0
    score += min(1.0, sat_avg) * 0.25
    score += min(1.0, glow_ratio * 2.2) * 0.25
    score += min(1.0, uniqueish / 28.0) * 0.20
    score += min(1.0, fill_ratio * 1.4) * 0.15
    if color_family in ("purple", "pink", "cyan"):
        score += 0.08
    if family in ("glow", "crystal"):
        score += 0.07

    for threshold, rarity in RARITIES:
        if score <= threshold:
            return {
                "family": family,
                "color_family": color_family,
                "rarity": rarity,
                "score": score,
            }

def build_name(index, color_family, family):
    color_words = COLOR_WORDS[color_family]
    material_words = MATERIAL_WORDS[family]
    left = color_words[index % len(color_words)]
    right = material_words[(index // len(color_words)) % len(material_words)]
    return f"{left}_{right}"

sheet_out = os.path.join(output_dir, "perbug_material_sheet_original.png")
img.save(sheet_out)

metadata_path = os.path.join(output_dir, "perbug_material_metadata.csv")
rows = []

count = 0
for gy in range(GRID):
    for gx in range(GRID):
        count += 1
        left = gx * CELL
        top = gy * CELL
        right = left + CELL
        bottom = top + CELL

        cell = img.crop((left, top, right, bottom))
        cell = flood_key_background(cell)
        cell = trim_alpha(cell)

        info = analyze_material(cell)
        material_name = build_name(count - 1, info["color_family"], info["family"])
        filename = f"{count:04d}_{info['rarity']}_{slugify(material_name)}.png"

        cw, ch = cell.size
        side = max(cw, ch)
        side = max(side, CELL)
        side = int(side * 1.10)

        canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        paste_x = (side - cw) // 2
        paste_y = (side - ch) // 2
        canvas.alpha_composite(cell, (paste_x, paste_y))

        # upscale with crisp edges
        upscaled = canvas.resize((upscale_size, upscale_size), Image.NEAREST)
        out_path = os.path.join(output_dir, filename)
        upscaled.save(out_path)

        rows.append({
            "index": count,
            "grid_x": gx,
            "grid_y": gy,
            "filename": filename,
            "rarity": info["rarity"],
            "name": material_name,
            "family": info["family"],
            "color_family": info["color_family"],
            "score": f"{info['score']:.4f}",
        })

with open(metadata_path, "w", newline="") as f:
    writer = csv.DictWriter(
        f,
        fieldnames=["index", "grid_x", "grid_y", "filename", "rarity", "name", "family", "color_family", "score"],
    )
    writer.writeheader()
    writer.writerows(rows)

print(f"[OK] Wrote sheet copy: {sheet_out}")
print(f"[OK] Wrote metadata:   {metadata_path}")
print(f"[OK] Wrote {len(rows)} split NFT PNGs into {output_dir}")
PY

log "Done"
echo "Output folder: $OUTPUT_DIR"
echo "First few files:"
ls -1 "$OUTPUT_DIR" | head
