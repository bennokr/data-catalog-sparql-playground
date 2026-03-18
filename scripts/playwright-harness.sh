#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

run_unit() {
  python -m unittest tests/test_make_catalog.py
}

run_ui() {
  npx playwright test tests/ui.spec.ts "$@"
}

run_red() {
  echo "[RED] Running the failing-first unit test target"
  run_unit
}

run_green() {
  echo "[GREEN] Running unit + browser tests"
  run_unit
  run_ui "$@"
}

run_debug() {
  echo "[DEBUG] Launching Playwright UI mode"
  npx playwright test --ui "$@"
}

case "${1:-green}" in
  red)
    shift
    run_red "$@"
    ;;
  green)
    shift
    run_green "$@"
    ;;
  ui|debug)
    shift
    run_debug "$@"
    ;;
  *)
    echo "Usage: $0 [red|green|ui] [playwright args...]" >&2
    exit 2
    ;;
esac
