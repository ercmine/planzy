# Perbug Moderation System (Reviews + Media)

## Overview
Perbug now uses a centralized moderation domain that combines automated safety signals with user reports and admin decisions across:
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
