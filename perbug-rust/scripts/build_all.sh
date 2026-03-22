#!/usr/bin/env bash
set -euo pipefail

echo "[perbug] building workspace"
cargo build --workspace
