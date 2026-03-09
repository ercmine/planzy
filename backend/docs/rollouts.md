# Phased rollout framework

## Evaluation order

Perbug rollout checks are evaluated centrally in `RolloutService` with deterministic precedence:

1. Unknown feature keys are denied (`unknown_feature`).
2. Internal override (role/cohort) can force-enable for trusted internal audiences.
3. Global status (`off` blocks immediately).
4. Environment gate.
5. Explicit deny lists (user, cohort, market).
6. Explicit allow filters (allowlist, cohorts, market, account type, plan family, roles).
7. Sticky percentage sampling (hash of `featureKey:salt:principalId`).
8. Enabled.

Deny rules win over allow rules.

## Context signals used

Rollout context is resolved from backend-request context and identity services:

- Environment: normalized from `NODE_ENV`.
- User identity: `x-user-id` + `AccountsService` roles/profile.
- Market: `x-market` fallback `x-region`.
- Cohorts: `x-cohorts` plus inferred `internal` cohort for admin/mod roles.
- Account type: `x-account-type` or active profile fallback.
- Plan family: derived from current subscription target when available.

## API surface

- `GET /v1/rollouts/summary` – effective state map for current principal.
- `GET /v1/rollouts/features/:featureKey` – single feature evaluation.
- `GET /v1/admin/rollouts` – rollout definitions.
- `POST /v1/admin/rollouts` – upsert rollout definition.
- `GET /v1/admin/rollouts/audit` – recent rollout change audit trail.

## Backend enforcement

Outing planner (AI itinerary) is rollout-gated server-side before request execution.
When blocked, API returns HTTP 423 with structured payload:

```json
{
  "error": "FEATURE_NOT_ROLLED_OUT",
  "featureKey": "ai.itinerary",
  "denialReason": "cohort_not_allowed",
  "rolloutCategory": "rollout"
}
```

## Frontend consumption

Flutter app uses:

- `ApiClient.fetchRolloutSummary()`
- `rolloutSummaryProvider`
- `featureRolloutProvider(featureKey)`

Frontend defaults unknown/missing data to disabled decisions.
