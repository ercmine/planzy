# OurPlanPlan Flutter App

## Setup

```bash
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
```

## Run

### Development

```bash
flutter run -t lib/main_dev.dart
```

or use:

```bash
./scripts/run_dev.sh
```

### Stage

```bash
flutter run -t lib/main_stage.dart
```

### Production

```bash
flutter run -t lib/main_prod.dart
```

## Build iOS

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
- [ ] Capture updated App Store screenshots.
