#!/usr/bin/env bash
set -euo pipefail

echo "[dryad] formatting workspace"
cargo fmt --all
