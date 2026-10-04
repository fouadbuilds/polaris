#!/usr/bin/env bash
# Canonical Polaris launcher for macOS, Linux, Git Bash, and WSL.
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"

if [[ -x "$ROOT_DIR/backend/.venv/bin/python" ]]; then
  PYTHON_BIN="$ROOT_DIR/backend/.venv/bin/python"
elif [[ -x "$ROOT_DIR/backend/.venv/Scripts/python.exe" ]]; then
  PYTHON_BIN="$ROOT_DIR/backend/.venv/Scripts/python.exe"
else
  echo "Polaris needs its initial setup. Follow the setup instructions in README.md, then try again." >&2
  exit 1
fi

exec "$PYTHON_BIN" "$ROOT_DIR/scripts/launch.py" "$@"
