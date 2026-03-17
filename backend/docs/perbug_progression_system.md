# Perbug progression system

This module introduces a backend-driven progression engine with two coordinated tracks:

- **Explorer progression** for meaningful discovery behavior tied to canonical places.
- **Creator progression** for high-quality place-review publishing behavior.

## Core architecture

- `ProgressionService` owns XP event validation, awarding, suppression, level transitions, streak updates, milestone progression, and audit output.
- Durable **XP ledger events** include event type, track, canonical place linkage, entity refs, dedupe key, and suppression reason.
- `ProgressionConfig` centralizes tuning inputs (XP values, level thresholds, caps, cooldowns, milestones, trust multipliers).

## Anti-farming protections

The progression flow is safe-by-default:

1. Dedupe key enforcement for idempotent event writes.
2. First-action-only guardrails for repetitive entity interactions.
3. Cooldown enforcement per user/action/entity key.
4. Daily XP caps for farm-prone actions.
5. Moderation suppression for hidden/removed/rejected content.
6. Trust-aware gating for engagement-derived creator XP.
7. Suspicious action suppression with explicit analytics counters.

## Identity and retention hooks

- Dual levels (`explorerLevel`, `creatorLevel`) and lifetime XP from one profile DTO.
- Streaks include explorer daily consistency, review streak, and creator publish consistency with grace handling.
- Milestones support key moments (first video, saves, streak thresholds, upload count) with completion timestamps.

## API-ready DTO contracts

Current service API supports:

- `getProgressionProfile(userId)`
- `getRecentXpHistory(userId, limit)`
- `getAdminSnapshot()` for tuning + observability

These contracts are designed for app profile surfaces, creator studio, celebration cards, and notification pipelines.
