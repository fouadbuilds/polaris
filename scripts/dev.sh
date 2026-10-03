#!/usr/bin/env bash

# Starts the Polaris API and frontend together.
# Works in macOS Terminal, Linux shells, Windows Git Bash, and WSL.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
VENV_DIR="$BACKEND_DIR/.venv"

if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python3)"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python)"
else
  echo "Python 3.11 or newer is required. Install it, then run this script again." >&2
  exit 1
fi

if command -v corepack >/dev/null 2>&1; then
  # Corepack reads packageManager from frontend/package.json, keeping pnpm
  # consistent across macOS, Git Bash, and WSL.
  PNPM=(corepack pnpm)
elif command -v pnpm >/dev/null 2>&1; then
  PNPM=(pnpm)
elif command -v where.exe >/dev/null 2>&1 && PNPM_PATH="$(where.exe pnpm 2>/dev/null | head -n 1)" && [[ -n "$PNPM_PATH" ]]; then
  # Git Bash may not inherit the Windows pnpm command on PATH.
  PNPM=("$PNPM_PATH")
else
  echo "pnpm 10.32.1 is required. Install Node.js with Corepack enabled, then run: corepack enable" >&2
  exit 1
fi

if [[ ! -d "$VENV_DIR" ]]; then
  echo "Creating the backend virtual environment..."
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

if [[ -x "$VENV_DIR/bin/python" ]]; then
  VENV_PYTHON="$VENV_DIR/bin/python"
elif [[ -x "$VENV_DIR/Scripts/python.exe" ]]; then
  VENV_PYTHON="$VENV_DIR/Scripts/python.exe"
else
  echo "Could not find Python in $VENV_DIR." >&2
  exit 1
fi

echo "Installing backend dependencies..."
"$VENV_PYTHON" -m pip install -e "$BACKEND_DIR" --quiet

echo "Installing frontend dependencies..."
(
  cd "$FRONTEND_DIR"
  "${PNPM[@]}" install --frozen-lockfile
)

cleanup() {
  echo
  echo "Stopping Polaris..."
  kill "$API_PID" "$FRONTEND_PID" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

echo "Starting Polaris API at http://127.0.0.1:8000 ..."
(
  cd "$BACKEND_DIR"
  "$VENV_PYTHON" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
) &
API_PID=$!

echo "Starting Polaris frontend at http://127.0.0.1:5173 ..."
(
  cd "$FRONTEND_DIR"
  "${PNPM[@]}" dev -- --host 127.0.0.1
) &
FRONTEND_PID=$!

echo
echo "Polaris is starting. Open http://127.0.0.1:5173"
echo "Press Ctrl+C to stop both services."

wait "$API_PID" "$FRONTEND_PID"
