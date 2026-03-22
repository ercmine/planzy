# Security

## Main assumptions

- Program configs are controlled by explicit admin authorities.
- Receipt IDs originate from trusted backend/application logic and must be deterministic and unique.
- Token settlement is separated from receipt creation in v1 to keep authorization scope narrower.

## Duplicate prevention

- Rewards receipts are PDA-derived from `(place, reward_id)`.
- Tip receipts are PDA-derived from `(tip_id)`.
- The programs reject attempts to initialize an already-owned receipt account.

## Authority management

- Only the configured admin can rotate admin authority, update fee settings, or toggle pause state.
- A paused program rejects mutable receipt creation/claim instructions.

## Key handling warnings

- Never commit `.env` or real keypairs.
- Use dedicated deployer/admin keys per environment.
- Review signer expectations before enabling token settlement CPI.
