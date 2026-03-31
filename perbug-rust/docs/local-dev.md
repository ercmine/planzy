# Local Development

## Prerequisites

1. Install Rust via `rustup`.
2. Install the Solana CLI for your target version.
3. Create or choose a local/devnet keypair.
4. Copy `.env.example` to `.env` and fill in environment-specific values.

## Common commands

```bash
cargo build --workspace
cargo test --workspace
./scripts/build_all.sh
./scripts/test_all.sh
./scripts/fmt.sh
./scripts/lint.sh
```

## CLI usage

The CLI accepts configuration from flags and environment variables. Global flags:

- `--rpc-url`
- `--keypair`
- `--commitment`
- `--config`

Example ATA derivation:

```bash
cargo run -p perbug-token-cli -- create-ata --mint <MINT> --owner <OWNER>
```

Example minting:

```bash
cargo run -p perbug-token-cli -- mint-to --mint <MINT> --recipient <OWNER> --amount 100.5
```

## Local validator note

The current tests focus on state logic and instruction processing. If you later add CPI settlement or Anchor/BPF integration, add a local validator or `solana-program-test` harness for end-to-end token flows.
