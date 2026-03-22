#!/usr/bin/env bash
set -euo pipefail

: "${SOLANA_RPC_URL:?set SOLANA_RPC_URL}"
: "${SOLANA_KEYPAIR:?set SOLANA_KEYPAIR}"
: "${PERBUG_TREASURY_OWNER:?set PERBUG_TREASURY_OWNER}"
: "${LAMPORTS:=1000000000}"

solana config set --url "$SOLANA_RPC_URL" --keypair "$SOLANA_KEYPAIR" >/dev/null

echo "[perbug] transferring ${LAMPORTS} lamports to ${PERBUG_TREASURY_OWNER}"
solana transfer "$PERBUG_TREASURY_OWNER" "$LAMPORTS" --allow-unfunded-recipient
