#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
trap 'echo "[clean_all][ERROR] Failed at line ${LINENO}." >&2' ERR

log() {
  echo "[clean_all] $*"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "[clean_all][ERROR] Missing required command: $1" >&2
    exit 1
  }
}

cd "$ROOT_DIR"

require_cmd flutter
require_cmd java

log "Running flutter clean"
flutter clean

if [[ -d "android" ]]; then
  if [[ -x "android/gradlew" ]]; then
    log "Running Gradle clean"
    (cd android && ./gradlew clean)
  else
    log "Android project found but android/gradlew is missing; skipping Gradle clean"
  fi
else
  log "No android/ directory found; skipping Gradle clean"
fi

log "Refreshing Dart/Flutter dependencies"
flutter pub get

log "Clean complete"
