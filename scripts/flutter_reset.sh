#!/usr/bin/env bash
set -euo pipefail

# Reset generated Flutter artifacts that commonly cause stale package import errors.
# Example symptom: "Couldn't resolve the package 'perbug' in 'package:perbug/main.dart'"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${SCRIPT_DIR%/scripts}/app"

if [[ ! -f "$APP_DIR/pubspec.yaml" ]]; then
  echo "Could not find app/pubspec.yaml from $SCRIPT_DIR" >&2
  exit 1
fi

cd "$APP_DIR"

if command -v flutter >/dev/null 2>&1; then
  flutter clean
  rm -rf .dart_tool build
  flutter pub get
  echo "Flutter project artifacts were reset in $APP_DIR"
else
  echo "flutter CLI not found in PATH. Please install Flutter and run:" >&2
  echo "  cd $APP_DIR && flutter clean && rm -rf .dart_tool build && flutter pub get" >&2
  exit 127
fi
