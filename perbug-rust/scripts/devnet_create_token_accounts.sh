#!/usr/bin/env bash
set -euo pipefail

: "${SOLANA_RPC_URL:?set SOLANA_RPC_URL}"
: "${SOLANA_KEYPAIR:?set SOLANA_KEYPAIR}"
: "${DRYAD_MINT:?set DRYAD_MINT}"
: "${DRYAD_TREASURY_OWNER:?set DRYAD_TREASURY_OWNER}"

echo "[dryad] configuring solana CLI"
solana config set --url "$SOLANA_RPC_URL" --keypair "$SOLANA_KEYPAIR" >/dev/null

echo "[dryad] creating treasury ATA for $DRYAD_TREASURY_OWNER"
spl-token create-account "$DRYAD_MINT" --owner "$DRYAD_TREASURY_OWNER"
