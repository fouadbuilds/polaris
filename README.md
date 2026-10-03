# Polaris

Polaris is a decision-support prototype for comparing Northwest Passage port candidates by the durability of their ice-melt trend. It is not a live navigation or safety tool.

The first vertical slice provides a typed FastAPI endpoint and a TypeScript React map that renders fixture data from that endpoint. The API contract is intentionally stable so that fixture data can later be replaced with processed historical and RCM data without changing the client.

## Run locally

### Start everything with one command

The launcher starts the API and frontend together, creates the backend virtual
environment when necessary, and stops both services when you press `Ctrl+C`.

**macOS Terminal**

```bash
chmod +x scripts/dev.sh
./scripts/dev.sh
```

**Windows Git Bash or WSL**

```bash
bash scripts/dev.sh
```

It requires Python 3.11+ and pnpm 10.32.1. If pnpm is unavailable after
installing Node.js, run `corepack enable` once in your shell. Open
`http://127.0.0.1:5173` when the launcher reports that Polaris is starting.

### Run services separately

Use these commands if you prefer separate terminals or are using Windows
PowerShell.

#### Backend — macOS, Linux, Git Bash, or WSL

```bash
cd backend
python3 -m venv .venv
./.venv/bin/python -m pip install -e ".[dev]"
./.venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

#### Backend — Windows PowerShell

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

#### Frontend — macOS, Linux, Git Bash, WSL, or PowerShell

```bash
cd frontend
pnpm install
pnpm dev
```

Open `http://127.0.0.1:5173`. Set `VITE_API_BASE_URL` if the API is not at `http://127.0.0.1:8000`.

## Checks

```powershell
cd backend
.\.venv\Scripts\python -m pytest

cd ../frontend
pnpm run build
```

## Project layout

- `backend/app/schemas.py` — API contract and validation.
- `backend/app/repositories/sites.py` — fixture data; replace this layer when real processed data exists.
- `frontend/src/api.ts` — client boundary for the API.
- `frontend/src/components/` — focused UI components.

Candidate locations and scores in this prototype are illustrative only and are not siting recommendations.
