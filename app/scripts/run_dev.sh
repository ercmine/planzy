#!/usr/bin/env bash
set -euo pipefail

flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
flutter run -t lib/main_dev.dart

# Make executable: chmod +x scripts/run_dev.sh
