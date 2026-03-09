# iOS location permission validation

## Repro / validation steps
1. Remove the app from Simulator to ensure a fresh install.
2. Reset Simulator privacy permissions:
   - `xcrun simctl privacy booted reset all`
3. (Optional) Set a custom Simulator location: **Features → Location**.
4. Launch the app, open a session deck, and tap **Enable location**.
5. Confirm iOS shows the system prompt (`Allow While Using App` / `Don't Allow`).
6. Deny once and tap **Enable location** again:
   - App should show guidance and offer **Open Settings** or **Open Location Settings**.
7. Grant permission from Settings and return to app.
8. Tap **Enable location** again and confirm deck loads with nearby content.

## Notes
- Permission requests are now user-action driven (from the button press), not triggered during startup.
- Debug builds print permission transition logs under `[LocationPermissionService]`.

## Backend integration verification (Perbug API)
1. Clean install on simulator/emulator:
   - remove app from device
   - rebuild and launch with:
     - `flutter run --dart-define=API_BASE_URL=https://api.perbug.com`
2. At startup, confirm debug logs include:
   - `App startup baseUrl=https://api.perbug.com`
   - `EnvConfig resolved: ... baseUrl=https://api.perbug.com`
3. Open a session deck and verify real API traffic appears in logs (request URL + status), and live plans are rendered (not static placeholder/demo cards).
4. Disable network and refresh deck:
   - if cached deck exists, UI must show `Offline / Using cached data`
   - if no cache exists, UI must show an error with retry.
5. Re-enable network and retry:
   - deck should recover to live backend results.

## Premium UX architecture
- Pricing and subscription UI is in `lib/features/premium/`.
- Plan and entitlement data is backend-driven from `/v1/subscription/plans`, `/v1/subscription`, and `/v1/entitlements/summary` via `PremiumRepository`.
- Locked prompts use entitlement feature keys + suggested plan ids (`LockedFeaturePrompt`) to generate contextual CTAs.
- Add new premium feature copy in `premium_copy.dart`, and ensure the backend entitlement key is present in plan entitlements for comparison tables.
