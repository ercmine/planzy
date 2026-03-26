#!/usr/bin/env bash
set -euo pipefail

: "${SOLANA_RPC_URL:?set SOLANA_RPC_URL}"
: "${SOLANA_KEYPAIR:?set SOLANA_KEYPAIR}"
: "${DRYAD_DECIMALS:=6}"

echo "[dryad] creating devnet mint with decimals=${DRYAD_DECIMALS}"
solana config set --url "$SOLANA_RPC_URL" --keypair "$SOLANA_KEYPAIR" >/dev/null
echo "[dryad] make sure the keypair has devnet SOL"
spl-token create-token --decimals "$DRYAD_DECIMALS"
echo "[dryad] export DRYAD_MINT=<printed mint address> before next steps"
