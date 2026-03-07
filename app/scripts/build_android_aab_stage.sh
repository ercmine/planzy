#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_android_common.sh"
setup_error_trap
cd_repo_root

log "Building Android stage AAB (release)"
check_prereqs
ensure_android_project
print_versions
run_pub_get
run_codegen_if_configured
build_aab_release "stage" "lib/main_stage.dart"
