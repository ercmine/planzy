# Perbug Mobile-First Refactor (iPhone/Android as source of truth)

## Mobile-first audit summary

### Web-first assumptions found
- Route model still exposed many direct URL endpoints for game internals (`/node`, `/encounter`, `/wallet`) that read more like web pages than a mobile game shell.
- Primary home shell previously prioritized a web-style tab grouping (`Frontier/Vault/Command`) and pushed core RPG surfaces into separate routes.
- Platform status labeling still reported `web-first`/`native` rather than encoding explicit iPhone/Android priority.
- Wallet entry flow already had demo fallback, but the overall navigation assumed route hopping instead of in-app shell navigation.
- Map/game loop lived inside a long-scroll composition; functional on mobile, but mobile command surfaces were not the top-level information architecture.

## Refactor decisions

### Product/platform direction
- Mobile app shell is now route-stable and tab-centered around core RPG gameplay loops:
  1. Map
  2. Squad
  3. Inventory
  4. Objectives
  5. Profile
- Marketplace remains first-class but moved to fast action from the shell app bar.
- Legacy web/deep-link routes are retained for compatibility, but mobile shell is now the primary route target.

### Map/location strategy
- Keep the tactical map as the first tab and preserve existing location-first + demo fallback onboarding in the map loop.
- Continue supporting denied location flows without blocking map access.
- Keep one-tap “switch to real world” pathway from demo mode.

### Wallet strategy
- Do not block gameplay behind wallet connection.
- Continue demo-first compatibility and wallet-optional mode.
- Mobile route shell avoids extension-wallet assumptions by keeping wallet off the critical path.

### Architecture changes made
- Route mapping for `squad`, `inventory`, `progression`, and `profile` now resolves into the mobile shell tabs instead of separate detached pages.
- Platform snapshot now exposes:
  - `isPrimaryMobileTarget`
  - `platformPriority` (`iOS=1`, `Android=2`, `web=3`)
  - `modeLabel` updated to `mobile-first`, `web-secondary`, or `native-secondary`

## Performance/UX implications
- Fewer full-route transitions for common map/squad/inventory/objective loops.
- Safer thumb-zone interaction through persistent bottom navigation.
- Reduced navigation churn and improved continuity for mobile session play.

## Manual verification checklist

### iPhone simulator/device
- First launch: entry flow is stable and demo mode remains available.
- Map opens in primary tab.
- Bottom nav transitions quickly across Map/Squad/Inventory/Objectives/Profile.
- Location denied: demo mode stays playable.
- Location allow: real-world map anchor and recentering still work.

### Android emulator/device
- Repeat iPhone checklist.
- Verify safe-area behavior with gesture nav and software nav bar.
- Verify marketplace action from top bar remains reachable one-handed.

### Cross-platform
- Web still opens and routes remain functional, but treated as secondary target.
