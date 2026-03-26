#!/usr/bin/env bash
set -euo pipefail

echo "[dryad] linting workspace"
cargo clippy --workspace --all-targets -- -D warnings
