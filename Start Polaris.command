#!/usr/bin/env bash
# Finder bridge for the canonical shell launcher.
set -uo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
"$ROOT_DIR/Start Polaris.sh" "$@"
EXIT_CODE=$?

if [ "$EXIT_CODE" -ne 0 ]; then
  echo
  read -r -p "Polaris could not start. Press Return to close. "
fi

exit "$EXIT_CODE"
