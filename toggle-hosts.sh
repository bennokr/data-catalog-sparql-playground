#!/usr/bin/env bash
# Toggle /etc/hosts override for a given hostname on macOS
# Usage: ./toggle-hosts.sh username.github.io

set -euo pipefail

HOSTS_FILE="/etc/hosts"

HOSTNAME="${1:-}"
if [ -z "$HOSTNAME" ]; then
  echo "Usage: $0 HOSTNAME" >&2
  exit 1
fi

LINE_V4="127.0.0.1 ${HOSTNAME}"
LINE_V6="::1 ${HOSTNAME}"

# Re-exec with sudo if not root
if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  exec sudo "$0" "$@"
fi

if grep -q "$HOSTNAME" "$HOSTS_FILE"; then
  # Remove existing lines
  sed -i '' "/${HOSTNAME}/d" "$HOSTS_FILE"
  echo "Disabled ${HOSTNAME} override in ${HOSTS_FILE}"
else
  {
    echo "$LINE_V4"
    echo "$LINE_V6"
  } >> "$HOSTS_FILE"
  echo "Enabled ${HOSTNAME} override in ${HOSTS_FILE}"
fi
