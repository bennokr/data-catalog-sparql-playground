#!/usr/bin/env bash
set -euo pipefail
sudo npx http-server . -S -C cert.pem -K cert-key.pem -p 443