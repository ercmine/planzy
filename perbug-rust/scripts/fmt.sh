#!/usr/bin/env bash
set -euo pipefail

echo "[perbug] formatting workspace"
cargo fmt --all
