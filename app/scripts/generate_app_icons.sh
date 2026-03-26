#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_DIR="$ROOT_DIR/app"
SOURCE_SVG="${1:-$ROOT_DIR/dryad1.svg}"
TARGET_SVG="$APP_DIR/assets/branding/dryad1.svg"
PYTHON_BIN="${PYTHON_BIN:-python3}"

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "error: python3 is required" >&2
  exit 1
fi

if [[ ! -f "$SOURCE_SVG" ]]; then
  echo "error: source SVG not found: $SOURCE_SVG" >&2
  exit 1
fi

mkdir -p "$(dirname "$TARGET_SVG")"
cp "$SOURCE_SVG" "$TARGET_SVG"

export ROOT_DIR APP_DIR TARGET_SVG

"$PYTHON_BIN" - <<'PY'
import importlib.util
import json
import os
import subprocess
import sys
from pathlib import Path

if importlib.util.find_spec('cairosvg') is None:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'cairosvg'])

import cairosvg

root = Path(os.environ['ROOT_DIR'])
app_dir = Path(os.environ['APP_DIR'])
target_svg = Path(os.environ['TARGET_SVG'])

android_icons = {
    'mipmap-mdpi/ic_launcher.png': 48,
    'mipmap-hdpi/ic_launcher.png': 72,
    'mipmap-xhdpi/ic_launcher.png': 96,
    'mipmap-xxhdpi/ic_launcher.png': 144,
    'mipmap-xxxhdpi/ic_launcher.png': 192,
    'mipmap-mdpi/ic_launcher_round.png': 48,
    'mipmap-hdpi/ic_launcher_round.png': 72,
    'mipmap-xhdpi/ic_launcher_round.png': 96,
    'mipmap-xxhdpi/ic_launcher_round.png': 144,
    'mipmap-xxxhdpi/ic_launcher_round.png': 192,
}

ios_icons = {
    'Icon-App-20x20@1x.png': 20,
    'Icon-App-20x20@2x.png': 40,
    'Icon-App-20x20@3x.png': 60,
    'Icon-App-29x29@1x.png': 29,
    'Icon-App-29x29@2x.png': 58,
    'Icon-App-29x29@3x.png': 87,
    'Icon-App-40x40@1x.png': 40,
    'Icon-App-40x40@2x.png': 80,
    'Icon-App-40x40@3x.png': 120,
    'Icon-App-60x60@2x.png': 120,
    'Icon-App-60x60@3x.png': 180,
    'Icon-App-76x76@1x.png': 76,
    'Icon-App-76x76@2x.png': 152,
    'Icon-App-83.5x83.5@2x.png': 167,
    'Icon-App-1024x1024@1x.png': 1024,
}

def render(svg_path: Path, png_path: Path, size: int) -> None:
    png_path.parent.mkdir(parents=True, exist_ok=True)
    cairosvg.svg2png(
        url=str(svg_path),
        write_to=str(png_path),
        output_width=size,
        output_height=size,
    )
    print(f'Generated {png_path.relative_to(root)} ({size}x{size})')

android_res_dir = app_dir / 'android/app/src/main/res'
for relative_path, size in android_icons.items():
    render(target_svg, android_res_dir / relative_path, size)

render(target_svg, app_dir / 'android/app/src/main/playstore-icon.png', 512)

ios_icon_dir = app_dir / 'ios/Runner/Assets.xcassets/AppIcon.appiconset'
for filename, size in ios_icons.items():
    render(target_svg, ios_icon_dir / filename, size)

contents = {
    'images': [
        {'size': '20x20', 'idiom': 'iphone', 'filename': 'Icon-App-20x20@2x.png', 'scale': '2x'},
        {'size': '20x20', 'idiom': 'iphone', 'filename': 'Icon-App-20x20@3x.png', 'scale': '3x'},
        {'size': '29x29', 'idiom': 'iphone', 'filename': 'Icon-App-29x29@2x.png', 'scale': '2x'},
        {'size': '29x29', 'idiom': 'iphone', 'filename': 'Icon-App-29x29@3x.png', 'scale': '3x'},
        {'size': '40x40', 'idiom': 'iphone', 'filename': 'Icon-App-40x40@2x.png', 'scale': '2x'},
        {'size': '40x40', 'idiom': 'iphone', 'filename': 'Icon-App-40x40@3x.png', 'scale': '3x'},
        {'size': '60x60', 'idiom': 'iphone', 'filename': 'Icon-App-60x60@2x.png', 'scale': '2x'},
        {'size': '60x60', 'idiom': 'iphone', 'filename': 'Icon-App-60x60@3x.png', 'scale': '3x'},
        {'size': '20x20', 'idiom': 'ipad', 'filename': 'Icon-App-20x20@1x.png', 'scale': '1x'},
        {'size': '20x20', 'idiom': 'ipad', 'filename': 'Icon-App-20x20@2x.png', 'scale': '2x'},
        {'size': '29x29', 'idiom': 'ipad', 'filename': 'Icon-App-29x29@1x.png', 'scale': '1x'},
        {'size': '29x29', 'idiom': 'ipad', 'filename': 'Icon-App-29x29@2x.png', 'scale': '2x'},
        {'size': '40x40', 'idiom': 'ipad', 'filename': 'Icon-App-40x40@1x.png', 'scale': '1x'},
        {'size': '40x40', 'idiom': 'ipad', 'filename': 'Icon-App-40x40@2x.png', 'scale': '2x'},
        {'size': '76x76', 'idiom': 'ipad', 'filename': 'Icon-App-76x76@1x.png', 'scale': '1x'},
        {'size': '76x76', 'idiom': 'ipad', 'filename': 'Icon-App-76x76@2x.png', 'scale': '2x'},
        {'size': '83.5x83.5', 'idiom': 'ipad', 'filename': 'Icon-App-83.5x83.5@2x.png', 'scale': '2x'},
        {'size': '1024x1024', 'idiom': 'ios-marketing', 'filename': 'Icon-App-1024x1024@1x.png', 'scale': '1x'},
    ],
    'info': {'version': 1, 'author': 'xcode'},
}
contents_path = ios_icon_dir / 'Contents.json'
contents_path.write_text(json.dumps(contents, indent=2) + '\n', encoding='utf-8')
print(f'Wrote {contents_path.relative_to(root)}')
PY

echo "App icons generated from $SOURCE_SVG"
