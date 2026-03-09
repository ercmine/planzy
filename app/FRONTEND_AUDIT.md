# Frontend parity audit (backend-aligned)

This pass focused on exposing backend-backed capabilities already wired in Flutter providers/endpoints and making them discoverable via a launch dashboard.

## Coverage and implementation summary

- **Subscription + entitlements + billing state**: surfaced directly on the new home command center and linked role hubs using `entitlementSummaryProvider`, `entitlementSummaryFamilyProvider`, and `subscriptionOverviewProvider`.
- **Feature flags / rollout visibility**: added rollout snapshot card using `rolloutSummaryProvider`.
- **User/Creator/Business role surfaces**: added route-level hubs (`/hub/creator`, `/hub/business`, `/hub/admin`) with feature matrix and quota sections.
- **Premium and upgrade discoverability**: premium/subscription routes are now promoted from home surface cards.
- **Planner + activity UX**: added dedicated `PlannerPage` and `ActivityPage` to expose itinerary and notifications/activity surfaces.
- **Moderation/trust/ops state representation**: role hubs include explicit moderation/ads behavior panels with policy messaging.
- **Design/motion polish**: refreshed app theme tokens and added animated hero/progress/step transitions.

## Remaining backend areas not fully implemented in this patch

The repository currently exposes a subset of backend domains in the Flutter app (sessions/deck/results/premium/ads/rollout/etc.). Large domains like complete creator monetization dashboards, full business claim management CRUD, provider health ops dashboards, and full moderation queue tooling still require additional API contracts and dedicated feature modules.
