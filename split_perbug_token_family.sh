#!/usr/bin/env bash
set -Eeuo pipefail

trap 'echo "[ERROR] Failed at line $LINENO" >&2; exit 1' ERR

# Usage:
#   IMAGE_NAME="/full/path/to/perbug_token_family.png" ~/split_perbug_token_family.sh
#   IMAGE_NAME="/full/path/to/perbug_token_family.png" OUTPUT_DIR="$HOME/perbug-token-family" ~/split_perbug_token_family.sh
#
# This script auto-detects separate token/icon groups from a shared sheet by:
#   1. estimating the background color from the corners
#   2. keying that background to transparent
#   3. finding connected visible components
#   4. saving each component as its own padded transparent PNG
#
# Required:
#   IMAGE_NAME -> full input image path
#
# Optional:
#   OUTPUT_DIR -> output folder (default: $HOME/perbug-token-family)

: "${IMAGE_NAME:?Set IMAGE_NAME to the full input image path before running this script}"
OUTPUT_DIR="${OUTPUT_DIR:-$HOME/perbug-token-family}"

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

log "Splitting token family sheet from: $IMAGE_NAME"
python3 - "$IMAGE_NAME" "$OUTPUT_DIR" <<'PY'
import os
import sys
from collections import deque
from PIL import Image

input_path = sys.argv[1]
output_dir = sys.argv[2]

img = Image.open(input_path).convert("RGBA")
w, h = img.size
px = img.load()

def avg_color(samples):
    n = len(samples)
    return tuple(sum(c[i] for c in samples) // n for i in range(3))

# Sample corners to estimate the background.
corner_samples = []
for sx, sy in [
    (5, 5),
    (w - 6, 5),
    (5, h - 6),
    (w - 6, h - 6),
    (15, 15),
    (w - 16, 15),
    (15, h - 16),
    (w - 16, h - 16),
]:
    r, g, b, a = px[sx, sy]
    corner_samples.append((r, g, b))

bg = avg_color(corner_samples)

def color_close(rgb, bg_rgb, threshold=42):
    return all(abs(int(rgb[i]) - int(bg_rgb[i])) <= threshold for i in range(3))

# Key out near-background pixels to alpha 0.
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if color_close((r, g, b), bg, threshold=42):
            px[x, y] = (r, g, b, 0)
        else:
            px[x, y] = (r, g, b, 255)

# Build a binary occupancy map from alpha.
solid = [[0] * w for _ in range(h)]
for y in range(h):
    for x in range(w):
        if px[x, y][3] > 0:
            solid[y][x] = 1

# Connected-component detection (4-neighbor).
visited = [[False] * w for _ in range(h)]
components = []

for y in range(h):
    for x in range(w):
        if solid[y][x] and not visited[y][x]:
            q = deque([(x, y)])
            visited[y][x] = True
            min_x = max_x = x
            min_y = max_y = y
            count = 0

            while q:
                cx, cy = q.popleft()
                count += 1
                if cx < min_x: min_x = cx
                if cx > max_x: max_x = cx
                if cy < min_y: min_y = cy
                if cy > max_y: max_y = cy

                for nx, ny in ((cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1)):
                    if 0 <= nx < w and 0 <= ny < h and solid[ny][nx] and not visited[ny][nx]:
                        visited[ny][nx] = True
                        q.append((nx, ny))

            # Filter tiny noise.
            if count >= 500:
                components.append({
                    "bbox": (min_x, min_y, max_x + 1, max_y + 1),
                    "count": count,
                })

# Sort top-to-bottom, then left-to-right.
components.sort(key=lambda c: (c["bbox"][1], c["bbox"][0]))

if not components:
    raise SystemExit("[ERROR] No components found after background keying.")

# Save each component to its own transparent PNG.
for idx, comp in enumerate(components, start=1):
    left, top, right, bottom = comp["bbox"]
    crop = img.crop((left, top, right, bottom))

    # Add padding and square the canvas.
    cw, ch = crop.size
    side = max(cw, ch)
    side = int(side * 1.18)
    if side < 128:
        side = 128

    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    paste_x = (side - cw) // 2
    paste_y = (side - ch) // 2
    canvas.alpha_composite(crop, (paste_x, paste_y))

    out_path = os.path.join(output_dir, f"perbug_token_icon_{idx:02d}.png")
    canvas.save(out_path)
    print(f"[OK] Wrote {out_path}")

print(f"[OK] Extracted {len(components)} component(s)")
PY

log "Done"
echo "Output folder: $OUTPUT_DIR"
echo "Files:"
ls -1 "$OUTPUT_DIR"
