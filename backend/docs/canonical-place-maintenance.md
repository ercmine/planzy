# Canonical Place Maintenance (Merge + Correction)

This module provides an operationally safe maintenance workflow for canonical places:

- Conservative duplicate candidate detection (`pending/approved/rejected/merged`) with evidence and confidence.
- Explicit admin-reviewed merges with guardrails (self-merge checks, far-distance refusal unless override, merged-source refusal).
- First-party and source-link relinking during merge (source records + attachment links), with dedupe normalization for conflict-prone attachments (`save`, `guide`).
- Field-level correction workflow with manual overrides persisted on canonical places.
- Manual correction provenance and full maintenance audit entries for candidate review, merge, correction, and attachment relink actions.
- Downstream recompute hook support via `onRecompute(placeIds, reason)` callback.

## Admin/Ops endpoints

- `POST /v1/admin/places/duplicates:detect`
- `GET /v1/admin/places/duplicates`
- `PATCH /v1/admin/places/duplicates/{candidateId}`
- `POST /v1/admin/places:merge`
- `PATCH /v1/admin/places/{placeId}/corrections`
- `POST /v1/admin/places/attachments:reassign`
- `GET /v1/admin/places/maintenance/audit`

## Safety model

- Duplicate detection never auto-merges.
- Merge requires explicit target + sources.
- Merge writes status tombstone metadata to sources (`mergedIntoPlaceId`, `status=merged`).
- Audit entries are emitted for every maintenance mutation.
- Manual overrides are retained for corrected fields and intended to survive future refreshes.
