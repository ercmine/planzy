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
