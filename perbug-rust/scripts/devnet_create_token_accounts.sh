#!/usr/bin/env bash
set -euo pipefail

: "${SOLANA_RPC_URL:?set SOLANA_RPC_URL}"
: "${SOLANA_KEYPAIR:?set SOLANA_KEYPAIR}"
: "${PERBUG_MINT:?set PERBUG_MINT}"
: "${PERBUG_TREASURY_OWNER:?set PERBUG_TREASURY_OWNER}"

echo "[perbug] configuring solana CLI"
solana config set --url "$SOLANA_RPC_URL" --keypair "$SOLANA_KEYPAIR" >/dev/null

echo "[perbug] creating treasury ATA for $PERBUG_TREASURY_OWNER"
spl-token create-account "$PERBUG_MINT" --owner "$PERBUG_TREASURY_OWNER"
