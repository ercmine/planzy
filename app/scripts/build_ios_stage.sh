#!/usr/bin/env bash
set -euo pipefail

flutter clean
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
flutter build ios -t lib/main_stage.dart --release

# Make executable: chmod +x scripts/build_ios_stage.sh
