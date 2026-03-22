#!/usr/bin/env bash
set -euo pipefail

: "${SOLANA_RPC_URL:?set SOLANA_RPC_URL}"
: "${SOLANA_KEYPAIR:?set SOLANA_KEYPAIR}"
: "${PERBUG_DECIMALS:=6}"

echo "[perbug] creating devnet mint with decimals=${PERBUG_DECIMALS}"
solana config set --url "$SOLANA_RPC_URL" --keypair "$SOLANA_KEYPAIR" >/dev/null
echo "[perbug] make sure the keypair has devnet SOL"
spl-token create-token --decimals "$PERBUG_DECIMALS"
echo "[perbug] export PERBUG_MINT=<printed mint address> before next steps"
