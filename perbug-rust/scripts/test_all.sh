#!/usr/bin/env bash
set -euo pipefail

echo "[dryad] running workspace tests"
cargo test --workspace
