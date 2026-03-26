#!/usr/bin/env bash
set -euo pipefail

: "${SOLANA_RPC_URL:?set SOLANA_RPC_URL}"
: "${SOLANA_KEYPAIR:?set SOLANA_KEYPAIR}"
: "${DRYAD_MINT:?set DRYAD_MINT}"
: "${DRYAD_TREASURY_OWNER:?set DRYAD_TREASURY_OWNER}"
: "${INITIAL_SUPPLY:?set INITIAL_SUPPLY, e.g. 1000000}"

solana config set --url "$SOLANA_RPC_URL" --keypair "$SOLANA_KEYPAIR" >/dev/null

echo "[dryad] minting $INITIAL_SUPPLY tokens to treasury owner $DRYAD_TREASURY_OWNER"
spl-token mint "$DRYAD_MINT" "$INITIAL_SUPPLY" "$DRYAD_TREASURY_OWNER"
echo "[dryad] inspect balances with: spl-token accounts"
