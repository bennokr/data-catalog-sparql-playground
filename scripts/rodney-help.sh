#!/usr/bin/env bash
set -euo pipefail

if ! command -v uvx >/dev/null 2>&1; then
  echo "uvx is not installed. Install uv first: https://docs.astral.sh/uv/" >&2
  exit 127
fi

exec uvx rodney --help
