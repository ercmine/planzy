# Architecture

## Workspace layout

- `crates/dryad-common`: shared types and helpers used by the CLI and on-chain programs.
- `crates/dryad-token-cli`: operational developer tooling for mint and treasury management.
- `crates/dryad-rewards-program`: stateful reward-claim tracking program.
- `crates/dryad-tipping-program`: stateful tip receipt and fee accounting program.
- `scripts/`: local automation for build/test/devnet setup.
- `docs/`: design and operational notes.

## Design goals

1. Keep token definitions and arithmetic consistent through `dryad-common`.
2. Make the on-chain programs useful immediately for deterministic receipt/state storage.
3. Avoid coupling the first version to a single payout design; settlement can evolve without changing the core receipt model.
4. Keep CLI and scripts practical for devnet and local validator workflows.

## Crate responsibilities

### dryad-common

Provides canonical constants, decimal-aware amount wrappers, safe arithmetic, PDA seed labels, and event payload structs shared across the rest of the workspace.

### dryad-token-cli

Provides account validation, ATA derivation, mint/account inspection, mint creation, and minting helpers. The CLI is safe-by-default: it requires explicit payer/keypair input, validates pubkeys, and prints transaction signatures and derived accounts clearly.

### dryad-rewards-program

Stores:

- a single config PDA per program,
- a per-place state PDA,
- a per-reward receipt PDA derived from place + receipt identifier.

The current flow supports initialization, place registration, reward receipt creation, claim state updates, pause controls, and admin rotation.

### dryad-tipping-program

Stores:

- a single config PDA per program,
- deterministic tip receipt PDAs derived from tip IDs.

The current flow supports config initialization, direct tip recording, fee-bearing tip recording, admin rotation, fee updates, and pause controls.
