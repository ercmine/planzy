#!/usr/bin/env bash
set -euo pipefail

: "${SOLANA_RPC_URL:?set SOLANA_RPC_URL}"
: "${SOLANA_KEYPAIR:?set SOLANA_KEYPAIR}"
: "${PERBUG_MINT:?set PERBUG_MINT}"
: "${PERBUG_TREASURY_OWNER:?set PERBUG_TREASURY_OWNER}"
: "${INITIAL_SUPPLY:?set INITIAL_SUPPLY, e.g. 1000000}"

solana config set --url "$SOLANA_RPC_URL" --keypair "$SOLANA_KEYPAIR" >/dev/null

echo "[perbug] minting $INITIAL_SUPPLY tokens to treasury owner $PERBUG_TREASURY_OWNER"
spl-token mint "$PERBUG_MINT" "$INITIAL_SUPPLY" "$PERBUG_TREASURY_OWNER"
echo "[perbug] inspect balances with: spl-token accounts"
