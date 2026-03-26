# Dryad Moderation System (Reviews + Media)

## Overview
Dryad now uses a centralized moderation domain that combines automated safety signals with user reports and admin decisions across:
- text reviews
- review media (photo/video)
- media metadata (captions/titles)
- business review responses
- place media/other target types via extensible target references

Core modules:
- `ModerationService` for reports, signals, queueing, decisions, and audits
- `ReviewsModerationEnforcementAdapter` to enforce moderation state changes in review/media/business-response records
- Admin and user-facing moderation APIs under `/v1/moderation` and `/v1/admin/moderation`

## State model
Canonical moderation states:
- `active`
- `pending_review`
- `auto_limited`
- `hidden`
- `removed`
- `rejected`
- `restored`
- `escalated`

### Transition highlights
- unique user report threshold can move `active -> pending_review`
- high-confidence automatic signals can move content to `auto_limited` or `hidden`
- admin actions can move content between visible and non-visible states
- `restore` transitions content back to `restored` with full decision audit trail

## Report taxonomy
Supported report reasons include:
- spam
- harassment/bullying
- hate/abusive language
- sexual/explicit
- graphic/violent
- dangerous/illegal activity
- misleading/fake review
- off-topic/irrelevant
- impersonation/stolen content
- privacy violation
- self-harm concern
- scam/fraud
- other

## Automated signal categories
- spam (`spam.links_promotions`)
- toxicity (`toxicity.abusive_language`)
- low quality (`quality.low_entropy`)
- duplicate (`duplicate.near_exact`)
- suspicious activity (`activity.burst_submission`)

Signals carry explainability metadata: rule id, reason code, confidence, severity, and explanation.

## Admin queue & decision flow
Admin queue endpoint supports unresolved/risk-based triage:
- `/v1/admin/moderation/queue`
- filter by `targetType`, `state`, `severity`, unresolved-only, and limit

Admin decision endpoint supports reversible moderation:
- `/v1/admin/moderation/decision`
- decisions: keep, warn, limit_visibility, hide, remove, reject, restore, escalate_user_review, lock_edits

Inspection endpoint:
- `/v1/admin/moderation/targets/:targetType/:targetId`

## Auditability and reversibility
Every significant moderation event is recorded:
- report created
- signal generated
- state transition
- decision recorded
- content restored

Decision history and audits are retained and queryable through moderation target inspection.

## Enforcement
Moderation enforcement is backend-first:
- review states are applied through `reviewsStore.setModerationState`
- review media states are applied through `reviewsStore.setReviewMediaModerationState`
- business review response moderation status is applied through `reviewsStore.moderateBusinessReviewResponse`

This ensures hidden/removed content is filtered out by existing public review/media retrieval logic.

## Extensibility
The moderation target abstraction and signal schema are vendor-agnostic and can support:
- external ML moderation providers
- third-party media safety classifiers
- additional content types (guides, profile bios, comments)
- dynamic threshold/rule configuration and feature flags

## Trust + ranking integration foundation
The moderation subsystem now feeds a dedicated trust computation layer (`backend/src/trustSafety`) that derives:
- content trust score/tier + ranking adjustment
- creator trust summary (published vs hidden/removed history)
- place trust summary (trusted-content ratio + moderation issue counts)

New moderation targets include `place_review_video`, `guide`, and `creator_profile` to support non-review surfaces.

### Public trust endpoint
- `GET /v1/trust/content?targetType=...&targetId=...`
- returns normalized trust summary with `trustScore`, `trustTier`, badges, moderation state, and ranking adjustment.

### Operator trust endpoints
- `GET /v1/admin/trust/actors`
- `GET /v1/admin/trust/places`

These endpoints provide repeat-offender and place-level abuse visibility for moderation operations.

### Video ranking + visibility behavior
`VideoPlatformService` now:
- excludes content from feed/creator/place public lists when moderation has hidden/removed/rejected the video target
- enriches feed items with trust metadata (`trustScore`, `trustTier`, badges)
- injects place/creator trust summaries into ranking signals for quality/trust weighting
- surfaces moderation state hints in studio payloads to improve creator-facing status clarity.
