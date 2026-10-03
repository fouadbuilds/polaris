#!/bin/bash
# Double-click in Finder to start Polaris.
set -e
cd "$(dirname "$0")"

export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"

if [ ! -x backend/.venv/bin/python ]; then
  echo "Polaris needs its initial setup. Run scripts/dev.sh once, then try again."
  read -r -p "Press Return to close. "
  exit 1
fi

if ! backend/.venv/bin/python scripts/launch.py "$@"; then
  echo
  read -r -p "Polaris could not start. Press Return to close. "
  exit 1
fi
