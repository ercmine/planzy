# Deployment

## Program deployment

1. Build the workspace.
2. Build deployable program artifacts using your preferred Solana build workflow.
3. Deploy rewards and tipping programs separately.
4. Record each program ID in environment-specific config and `.env`.

## Mint creation

Use the CLI or the helper scripts:

1. `scripts/devnet_create_mint.sh`
2. `scripts/devnet_create_token_accounts.sh`
3. `scripts/devnet_mint_initial_supply.sh`

These scripts intentionally require explicit environment variables so secret keys and mint addresses are never hardcoded.

## Treasury configuration

- Choose the treasury owner authority.
- Create the treasury associated token account.
- Record the treasury pubkey and mint address for backend/app configuration.
- Initialize program configs with admin authorities and pause defaults before exposing write paths to users.
