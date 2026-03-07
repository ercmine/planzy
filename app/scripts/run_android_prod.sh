#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_android_common.sh"
setup_error_trap
cd_repo_root

log "Starting Android prod run"
check_prereqs
ensure_android_project
print_versions
run_pub_get
run_codegen_if_configured
run_android "prod" "lib/main_prod.dart"
