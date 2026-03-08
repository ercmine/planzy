# Perbug Flutter App

## Setup

```bash
flutter pub get
dart run build_runner build --delete-conflicting-outputs
```

## iOS local setup order

Always install Flutter packages before CocoaPods so `ios/Flutter/Generated.xcconfig` exists:

```bash
flutter clean
flutter pub get
cd ios && pod install && cd ..
```

## Android scripts (flavors)

These scripts live under `scripts/` and are designed for copy/paste usage on macOS with Flutter installed.

### Prerequisites

- `flutter`, `dart`, and `java` must be available in your shell `PATH`.
- Android platform files must exist (`android/gradlew` and `android/app/build.gradle` or `.kts`).
  - If missing, generate them from the app root:

```bash
flutter create --platforms=android .
```

- Android flavors should map as follows:
  - `dev`   -> `lib/main_dev.dart`
  - `stage` -> `lib/main_stage.dart`
  - `prod`  -> `lib/main_prod.dart`

### Run on emulator/device

```bash
flutter run -t lib/main_prod.dart --dart-define=API_BASE_URL=https://api.perbug.com
./scripts/run_android_dev.sh
./scripts/run_android_stage.sh
./scripts/run_android_prod.sh
```

### Build release APKs

```bash
./scripts/build_android_apk_dev.sh
./scripts/build_android_apk_stage.sh
./scripts/build_android_apk_prod.sh
```

### Build release AABs

```bash
./scripts/build_android_aab_stage.sh
./scripts/build_android_aab_prod.sh
```

### Clean Flutter + Gradle artifacts

```bash
./scripts/clean_all.sh
```

### Artifact locations

Typical output locations:

- APK:
  - `build/app/outputs/flutter-apk/app-<flavor>-release.apk`
- AAB:
  - `build/app/outputs/bundle/<flavor>Release/app-<flavor>-release.aab`

All Android build scripts also print discovered artifact paths after a successful build.

### Play Store keystore setup (basic)

1. Create a keystore file (for example `app/keystore/upload-keystore.jks`).
2. Copy template and fill in values:

```bash
cp android/key.properties.example android/key.properties
```

3. Update `android/key.properties` with real credentials and keystore path.
4. Configure Android release signing in `android/app/build.gradle` (or `.kts`) to read `key.properties`.
5. Keep `android/key.properties` and keystore files out of version control.

> If `android/key.properties` is missing, the scripts print a warning before release builds.

## Existing iOS scripts

```bash
./scripts/build_ios.sh
./scripts/build_ios_stage.sh
```

## Tests

```bash
flutter test
```

## Release checklist

- [ ] Update app version in `pubspec.yaml`.
- [ ] Verify iOS permission usage strings (see `ios/README_PERMISSIONS.md`).
- [ ] Run `flutter test` and ensure all tests pass.
- [ ] Build iOS archive (`./scripts/build_ios.sh` or stage variant).
- [ ] Build Android APK/AAB with the scripts above.
- [ ] Capture updated store screenshots.
