#!/usr/bin/env bash
set -euo pipefail

echo "[perbug] linting workspace"
cargo clippy --workspace --all-targets -- -D warnings
