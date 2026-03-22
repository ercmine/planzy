# PERBUG Creator Rewards Architecture

## Overview

Perbug now includes a typed creator-rewards domain in `backend/src/perbugRewards/` that models:

- Per-place decreasing reward ladders.
- Reward eligibility separated from review approval and claimability.
- Solana wallet auth using signed messages and single-use nonces.
- Idempotent PERBUG SPL-token claims paid to the creator ATA.
- Audit logging for admin-sensitive changes.

## Reward model

Default seeded tiers:

1. Position 1 => 200 PERBUG
2. Positions 2-5 => 100 PERBUG
3. Positions 6-10 => 50 PERBUG
4. Positions 11-20 => 20 PERBUG
5. Positions 21+ => 5 PERBUG

Quality multipliers:

- `low` => `0.50x`
- `standard` => `1.00x`
- `high` => `1.25x`
- `featured` => `1.50x`

Final reward formula:

`final_reward = place_tier_amount * quality_multiplier`

The backend computes rewards deterministically and stores both base and final values on the review record.

## Wallet auth flow

1. Frontend requests `POST /v1/wallet-auth/nonce`.
2. Backend issues a nonce, stores expiration, and returns the exact sign-in message.
3. Phantom signs the message.
4. Frontend submits `POST /v1/wallet-auth/verify`.
5. Backend verifies the signature, marks the nonce consumed, links the wallet, and issues a session token.

Replay attacks are prevented because each nonce is single-use and expires after 10 minutes.

## Claim flow

1. Creator opens the dashboard and sees claimable reviews.
2. Frontend submits `POST /v1/rewards/reviews/:reviewId/claim` with the connected wallet public key.
3. Backend verifies ownership, wallet linkage, claimability, and idempotency.
4. Solana adapter derives or creates the ATA, submits the PERBUG transfer, and returns the explorer link.
5. Claim record becomes `confirmed`; review reward state becomes `claimed`.

Repeated clicks with the same idempotency key return the existing claim record and do not double-pay.

## Admin workflow

Admin endpoints support:

- Approve or reject a reward review.
- Inspect reward tiers and audit logs.
- Override distinct reward slots for approved creator reviews.
- Block reward assignment through moderation or rejection.

## Environment variables

Backend:

- `SOLANA_CLUSTER`
- `SOLANA_RPC_URL`
- `PERBUG_MINT_ADDRESS`
- `PERBUG_TREASURY_PUBLIC_KEY`
- `PERBUG_TREASURY_SECRET`
- `SOLANA_COMMITMENT`
- `CLAIMS_ENABLED`
- `REWARD_TIERS_JSON`
- `ADMIN_WALLET_ALLOWLIST`
- `EXPLORER_BASE_URL`
- `PERBUG_TOKEN_DECIMALS`

Website:

- `PUBLIC_PERBUG_API_BASE_URL`
- `PUBLIC_SOLANA_CLUSTER`

## Devnet setup

1. Create or reuse a PERBUG mint on devnet.
2. Fund the treasury keypair with devnet SOL.
3. Mint PERBUG into the treasury ATA.
4. Set the environment variables above.
5. Run backend tests and the Astro creator rewards page.

## Sequence diagram

```text
Phantom -> Web UI: connect wallet
Web UI -> Backend: POST /v1/wallet-auth/nonce
Backend -> Web UI: nonce + message
Web UI -> Phantom: sign message
Phantom -> Web UI: signature
Web UI -> Backend: POST /v1/wallet-auth/verify
Backend -> Backend: consume nonce + link wallet
Web UI -> Backend: POST /v1/rewards/reviews/:id/claim
Backend -> Solana: ATA lookup/create + token transfer
Solana -> Backend: signature
Backend -> Web UI: confirmed claim + explorer URL
```

## Rollback / failure behavior

- Failed claims remain stored with `failed` status and a failure reason.
- Double-claim attempts return the original claim record.
- Moderation rejection blocks future payout for that review.

## Future path

The current v1 implementation is backend-signed. The interfaces are separated so a future Anchor/PDA claim-receipt implementation can replace the transfer adapter without rewriting reward policy logic.
