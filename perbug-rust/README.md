# Dryad Rust Workspace

`dryad-rust/` is the dedicated Solana/Rust workspace for the Dryad token ecosystem. It contains the shared Rust code needed to manage an SPL mint, prepare for Token-2022 support, and scaffold two on-chain programs for creator rewards and tipping.

## What is implemented now

- `dryad-common`: shared constants, typed token amounts, PDA seeds, checked math, events, and error helpers.
- `dryad-token-cli`: a developer-oriented CLI for mint creation, ATA derivation, minting, treasury inspection, and account inspection.
- `dryad-rewards-program`: a real Solana program state machine for reward config, place registration, reward receipts, duplicate-prevention, admin changes, and pause controls.
- `dryad-tipping-program`: a real Solana program state machine for tipping config, fee validation, tip receipts, duplicate-prevention, admin changes, and pause controls.
- Docs and shell scripts for local development, linting, testing, and devnet token setup.

## What is scaffolded for next

- CPI-based token settlement from program-owned treasuries.
- Token-2022 mint extensions where they are useful.
- Backend/app integration for reward claim IDs, place metadata, and treasury operations.
- Program deployment automation and ID management per environment.

## Build and test

```bash
cargo build --workspace
cargo test --workspace
./scripts/fmt.sh
./scripts/lint.sh
```

## CLI overview

The CLI reads RPC/keypair settings from flags or environment variables and supports:

- `create-mint`
- `create-ata`
- `mint-to`
- `treasury-info`
- `inspect-mint`
- `inspect-account`

Example:

```bash
cargo run -p dryad-token-cli -- \
  --rpc-url https://api.devnet.solana.com \
  --keypair ~/.config/solana/id.json \
  inspect-mint --mint <MINT_PUBKEY>
```

## Program roles

- The rewards program stores deterministic receipts keyed by place and external reward/review IDs so duplicate claims can be rejected on-chain.
- The tipping program stores deterministic tip receipts keyed by tip IDs, while validating optional platform fees and supporting pause/admin controls.
- Both programs intentionally separate receipt/state tracking from token settlement so treasury payout logic can be added cleanly in a later milestone.

See `docs/` for architecture, deployment, security, and local development details.
