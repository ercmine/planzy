#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_BIN="${PYTHON_BIN:-python3}"

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

if importlib.util.find_spec('cairosvg') is None:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'cairosvg'])

import cairosvg

root = Path.cwd()
svg_files = sorted(root.rglob('perbug*.svg'))
if not svg_files:
    print('No perbug SVG files found.')
    raise SystemExit(0)

for svg_path in svg_files:
    png_path = svg_path.with_suffix('.png')
    cairosvg.svg2png(url=str(svg_path), write_to=str(png_path))
    print(f'Converted {svg_path.relative_to(root)} -> {png_path.relative_to(root)}')
PY
