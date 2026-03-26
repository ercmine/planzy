#!/usr/bin/env bash
set -euo pipefail

echo "[dryad] building workspace"
cargo build --workspace
