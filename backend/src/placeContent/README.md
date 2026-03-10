# Perbug first-party content layer

This module implements Perbug-owned content anchored to canonical place IDs.

## Domain model
- `ReviewRecord`: user/creator review content with moderation, trust, and quality placeholders.
- `CreatorVideoRecord`: place-linked creator videos with moderation and engagement counters.
- `PlaceSaveRecord`: unique user+canonical place saves (ranking + personalization primitive).
- `GuideRecord` + `GuideItemRecord`: creator/user public or private guides with ordered canonical place memberships.
- `ContentEngagementRecord`: durable place/content engagement events.
- `FirstPartyPlaceMetrics`: persisted derived metrics used by ranking.

## Canonical place linkage
All content records use `canonicalPlaceId` as the primary place foreign key.
This avoids lock-in to any source-specific provider ID and keeps first-party graph continuity through source refreshes.

## Derived metrics and ranking
`PlaceContentService.refreshPlaceMetrics` computes:
- review / video / save / guide counts
- trusted review and helpful vote counts
- 30d engagement velocity
- content richness and trust score
- quality boost signal

`computeFirstPartyRankingSignals` converts metrics to bounded ranking boosts with explicit caps to prevent swamping relevance/distance.

## Moderation/trust foundations
All first-party content supports `status` + `visibility`.
Only `published` + `public` content contributes to public retrieval and aggregates.
Trust hooks include `trustedReview`, `verifiedVisitScore`, and per-content `qualityScore`.

## Extensibility
This domain can be extended for:
- feed ranking and personalization
- creator monetization quality tiers
- trust-and-safety workflows
- recommendation/ML features backed by first-party engagement data
