# Perbug Web Platform Audit (March 30, 2026)

## Scope
Audit focused on Flutter web runtime behavior across entry, routing, map, wallet, and location flows.

## What was breaking or degrading web

1. **Routing guard sent unauthenticated users to `/live-map` instead of `/`**.
   - This hid the intended web-first entry and produced confusing route state on direct URL access.
2. **No explicit web boot strategy for browser URL handling**.
   - Missing URL strategy setup increased risk of refresh/direct-route mismatch in browser deployments.
3. **No centralized web-aware boot error surface**.
   - Top-level framework/platform exceptions were not consistently logged during startup.
4. **Map fallback could still look blank when map tile network requests fail**.
   - Web fallback map used live tiles only; if blocked, the map could appear empty.
5. **Debug visibility was fragmented**.
   - Platform state (wallet availability/location API status/current route) lacked a single always-visible dev overlay.

## Existing web-safe strengths found

- Entry screen already has **asset error fallback UI** and **demo mode CTA**.
- Wallet connector already uses web-native injected provider checks and has graceful unavailable handling.
- Tactical map (`PerbugWorldMapView`) already paints with `CustomPaint` and avoids zero-size crashes.
- Location flow already has explicit CTA path (`Use My Location` vs demo fallback).

## Refactor actions applied

1. Added centralized app bootstrap (`lib/app/bootstrap.dart`) with:
   - web URL strategy initialization,
   - framework/platform error logging hooks,
   - unified flavor boot path.
2. Refactored all main entrypoints to use shared bootstrap.
3. Refined auth routing logic:
   - protected routes now redirect unauthenticated users to `/` (entry),
   - authenticated users entering `/` are redirected to `/live-map`.
4. Strengthened web map fallback:
   - added static-map preview layer behind interactive tile map,
   - explicit fallback text when static image fails,
   - preserves tactical marker interactivity.
5. Added dev-mode web diagnostics overlay in app shell showing:
   - current route,
   - platform mode,
   - wallet availability,
   - location API readiness,
   - startup health errors.
6. Added route redirect tests for web-friendly auth flow.

## Follow-up items (not fully solved in this patch)

- Move root-level image assets into `app/assets/...` for cleaner web asset fingerprinting/caching.
- Add integration test pass on real Chromium CI (`flutter test --platform chrome`).
- Add a dedicated map health state provider to surface tile/source readiness outside debug mode.
- Validate deployment rewrite rules for non-hash path strategy.
