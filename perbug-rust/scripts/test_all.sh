#!/usr/bin/env bash
set -euo pipefail

echo "[perbug] running workspace tests"
cargo test --workspace
