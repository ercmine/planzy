#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log() {
  echo "[android-scripts] $*"
}

fail() {
  echo "[android-scripts][ERROR] $*" >&2
  exit 1
}

on_error() {
  local line_no="$1"
  local exit_code="$2"
  echo "[android-scripts][ERROR] Command failed at line ${line_no} (exit ${exit_code})." >&2
}

setup_error_trap() {
  trap 'on_error "${LINENO}" "$?"' ERR
}

cd_repo_root() {
  cd "$ROOT_DIR"
}

require_cmd() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || fail "Required command '$cmd' is not installed or not in PATH."
}

check_prereqs() {
  require_cmd flutter
  require_cmd dart
  require_cmd java
}

print_versions() {
  log "Flutter version"
  flutter --version
  log "Dart version"
  dart --version
  log "Java version"
  java -version
}

ensure_android_project() {
  if [[ ! -d "$ROOT_DIR/android" ]]; then
    fail "android/ directory not found. Generate Android platform files first (example: flutter create --platforms=android .)."
  fi

  if [[ ! -x "$ROOT_DIR/android/gradlew" ]]; then
    fail "android/gradlew is missing. Recreate Android platform files (example: flutter create --platforms=android .)."
  fi

  if [[ ! -f "$ROOT_DIR/android/app/build.gradle" && ! -f "$ROOT_DIR/android/app/build.gradle.kts" ]]; then
    fail "android/app/build.gradle(.kts) is missing. Recreate Android platform files and configure flavors."
  fi
}

run_pub_get() {
  log "Running flutter pub get"
  flutter pub get
}

run_codegen_if_configured() {
  if grep -Eq "^\s*build_runner:\s*" pubspec.yaml; then
    log "build_runner detected; running code generation"
    dart run build_runner build --delete-conflicting-outputs
  else
    log "build_runner not configured; skipping code generation"
  fi
}

warn_missing_keystore() {
  if [[ ! -f "$ROOT_DIR/android/key.properties" ]]; then
    log "WARNING: android/key.properties is missing. Release artifacts may be unsigned."
    if [[ -f "$ROOT_DIR/android/key.properties.example" ]]; then
      log "See android/key.properties.example for setup guidance."
    fi
  fi
}

print_apk_artifacts() {
  local flavor="$1"
  local dir="$ROOT_DIR/build/app/outputs/flutter-apk"
  local preferred="$dir/app-${flavor}-release.apk"

  log "APK artifact lookup"
  if [[ -f "$preferred" ]]; then
    echo "$preferred"
    return
  fi

  if [[ -d "$dir" ]]; then
    find "$dir" -maxdepth 1 -type f -name "*${flavor}*release*.apk" -print | sort
  else
    log "No APK output directory found at $dir"
  fi
}

print_aab_artifacts() {
  local flavor="$1"
  local dir="$ROOT_DIR/build/app/outputs/bundle"
  local preferred="$dir/${flavor}Release/app-${flavor}-release.aab"

  log "AAB artifact lookup"
  if [[ -f "$preferred" ]]; then
    echo "$preferred"
    return
  fi

  if [[ -d "$dir" ]]; then
    find "$dir" -type f -name "*${flavor}*release*.aab" -print | sort
  else
    log "No AAB output directory found at $dir"
  fi
}

run_android() {
  local flavor="$1"
  local target="$2"

  flutter run --flavor "$flavor" -t "$target"
}

build_apk_release() {
  local flavor="$1"
  local target="$2"

  warn_missing_keystore
  flutter build apk --release --flavor "$flavor" -t "$target"
  print_apk_artifacts "$flavor"
}

build_aab_release() {
  local flavor="$1"
  local target="$2"

  warn_missing_keystore
  flutter build appbundle --release --flavor "$flavor" -t "$target"
  print_aab_artifacts "$flavor"
}
