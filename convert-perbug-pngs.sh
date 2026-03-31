#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_BIN="${PYTHON_BIN:-python3}"
PNG_GLOB="${PNG_GLOB:-*.png}"

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "error: python3 is required" >&2
  exit 1
fi

cd "$ROOT_DIR"

"$PYTHON_BIN" - <<'PY'
import importlib.util
import subprocess
import sys
from pathlib import Path
import os

if importlib.util.find_spec('vtracer') is None:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'vtracer'])

import vtracer

root = Path.cwd()
png_glob = os.environ.get('PNG_GLOB', '*.png')
png_files = sorted(root.glob(png_glob))
if not png_files:
    print(f'No PNG files found for glob: {png_glob}')
    raise SystemExit(0)

for png_path in png_files:
    svg_path = png_path.with_suffix('.svg')
    vtracer.convert_image_to_svg_py(
        str(png_path),
        str(svg_path),
        colormode='color',
        hierarchical='stacked',
        mode='spline',
    )
    print(f'Converted {png_path.relative_to(root)} -> {svg_path.relative_to(root)}')
PY
