#!/usr/bin/env bash
set -euo pipefail

: "${SOLANA_RPC_URL:?set SOLANA_RPC_URL}"
: "${SOLANA_KEYPAIR:?set SOLANA_KEYPAIR}"
: "${DRYAD_TREASURY_OWNER:?set DRYAD_TREASURY_OWNER}"
: "${LAMPORTS:=1000000000}"

solana config set --url "$SOLANA_RPC_URL" --keypair "$SOLANA_KEYPAIR" >/dev/null

echo "[dryad] transferring ${LAMPORTS} lamports to ${DRYAD_TREASURY_OWNER}"
solana transfer "$DRYAD_TREASURY_OWNER" "$LAMPORTS" --allow-unfunded-recipient
