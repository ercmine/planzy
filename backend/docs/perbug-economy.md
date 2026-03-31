# Perbug Economy vNext

This module powers a unified in-app economy loop for:

- Business quests funded in PERBUG.
- Exploration check-in rewards with streak logic.
- Collection milestones and completion payouts.
- Creator and curator performance rewards with moderation/risk checks.
- Premium membership purchases in PERBUG.
- Local offer redemption with inventory + trust checks.
- Configurable token split percentages (reward pool, creator pool, treasury, burn, partner).

## Core API surfaces

- `POST /v1/business/quests`
- `POST /v1/quests/:questId/complete`
- `POST /v1/exploration/check-in`
- `POST /v1/admin/perbug-economy/collections`
- `POST /v1/collections/:collectionId/progress`
- `POST /v1/creator/economy/rewards`
- `POST /v1/creator/economy/rewards/:rewardId/claim`
- `POST /v1/curator/guides`
- `POST /v1/curator/guides/:guideId/analytics`
- `POST /v1/premium/membership/purchase`
- `POST /v1/business/offers`
- `POST /v1/offers/:offerId/redeem`
- `POST /v1/admin/perbug-economy/splits`
- `GET /v1/perbug-economy/me`
- `GET /v1/creator/economy/dashboard`
- `GET /v1/business/economy/dashboard`
- `GET /v1/admin/perbug-economy/dashboard`

## Accounting model

The service writes deterministic ledger entries for every transfer and split allocation and updates token accounts by owner type:

- `user:<id>`
- `business:<id>`
- `platform:treasury`
- `platform:burn`
- `pool:global_rewards`
- `pool:creator`

All major spend flows run through split logic to enforce treasury + burn sustainability.
