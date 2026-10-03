# Polaris

Polaris is a decision-support prototype for comparing Northwest Passage port candidates by the durability of their ice-melt trend. It is not a live navigation or safety tool.

The first vertical slice provides a typed FastAPI endpoint and a TypeScript React map that renders fixture data from that endpoint. The API contract is intentionally stable so that fixture data can later be replaced with processed historical and RCM data without changing the client.

## Run locally

### Double-click on Mac

Double-click **Start Polaris.command** in the project folder. It starts the backend and
website, then opens Polaris in your default browser. Keep the Terminal window open;
press **Control+C** in that window to stop the servers it started. If Polaris is already
running, the launcher reuses it. Dependencies must be installed once using the setup below.

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

## Satellite imagery

Create a Copernicus Data Space OAuth client in the [dashboard](https://shapps.dataspace.copernicus.eu/dashboard/).
Copy `backend/.env.example` to `backend/.env` and fill in its client ID and secret.
The API loads this file automatically; restart it after changing credentials. Keep this file private (Git ignores it).

The dashboard starts on a world overview, with the Canadian Arctic study area highlighted. **World**, **Canada’s north**
and **Port** buttons focus the map. **Layers & time** and **Port details** stay in a side panel with its own scroll area;
on narrow screens, **Controls** opens a floating panel. The page and map remain in the viewport.
The panel's **Map / Satellite** buttons switch the background. Map mode uses OpenStreetMap geographic tiles and
saved ice polygons. Satellite mode uses an Esri global reference mosaic plus dated NASA GIBS MODIS/Terra Arctic tiles.
The global mosaic has mixed acquisition dates and must not be used as a historical comparison. Changing
**Photograph date** updates the Arctic daily composite. Clouds, missing coverage and polar darkness
can obscure the surface; the imagery is not an ice classification. Regional tiles are enlarged beyond native zoom 9.
Source and integration documentation: [NASA GIBS](https://nasa-gibs.github.io/gibs-api-docs/access-basics/).

Select a candidate, choose a photograph date, and click **Load selected port detail**.
The backend searches Sentinel-2 L2A scenes covering that site over the preceding 30 days,
then requests a 768-pixel true-colour preview of the most recent acquisition.
The map shows the acquisition timestamp separately from the requested date. Clouds and partial coverage remain visible;
this is a satellite observation, not an ice classification. Scores and trends remain illustrative.

The local endpoint is `GET /api/imagery/{site_id}?date=YYYY-MM-DD`.
Only the existing candidates are accepted. Tokens stay on the backend and are reused until near expiry.
Successful previews are saved under `.cache/imagery/` and reused across restarts without an expiry.
The 24 most recent previews also stay in memory. The cache key includes site coordinates, requested date,
and rendering settings. Historical previews are treated as fixed snapshots; remove a specific saved file
if you deliberately want to refresh it after upstream reprocessing. Credentials and access tokens are never cached on disk.
Each uncached preview uses catalogue and processing requests against your Copernicus quota.
Before deploying publicly, add user access control and a per-user request budget to protect that quota.

## Checks

### Canadian trade routes

The **Routes** panel adds nine researched schematic corridors: three Northwest Passage variants,
Québec–Arctic sealift, Western Arctic MTS resupply, Churchill–Atlantic exports, two conceptual Grays Bay
sea connections and the proposed Grays Bay–Jericho road. Route groups and individual checkboxes control
the overlay in both map and satellite views. Select a line or list entry to read evidence, limitations and
source links; **Show & focus this route** fits its extent. Proposals are dashed purple, used logistics teal,
and mapped passage variants brown. Route access is not inferred from the selected ice year.

Research and interpretation: [Canadian Arctic trade routes](research/arctic-trade-routes.md).
Data: `frontend/public/data/routes-canada.geojson`, automatically saved by the offline worker.
Rebuild with `backend/.venv/bin/python scripts/bake_routes.py` after preparing `world-land.geojson`.
Waypoints and a coarse land mask make the drawing follow broad geography; no AIS, bathymetry, vessel,
ice or commercial routing model is used. The road line is an endpoint sketch, not the actual alignment.

### Saved ice history and trend scenarios

The default ice layer displays bundled March winter extent outlines. **Season** switches to September,
near the end of the summer melt season. Both months cover every year from 1996 through 2026, plus 2035 and
2050 **trend scenarios** (66 maps total). The year selection is preserved when switching seasons.
Maps and seasonal manifests live in `frontend/public/data/ice/`; they require no satellite account or runtime
processing request. The simplified world map is bundled Natural Earth land geometry, with yellow land,
blue water and white ice. It requires no external map tiles. The data window is 56–80°N, 150–42°W.

The browser service worker saves all 66 ice outlines, both manifests and the world land file automatically.
The panel confirms when the maps are saved. Successful port API responses and viewed satellite tiles are
cached on the device; the tile cache retains up to 96 tiles. New satellite areas or dates still require internet.
Cached app code can be reused if connectivity fails; local servers should remain running when using the launcher.
Browser caches are per origin/device and can be evicted by the browser or cleared by the user. Keep using
the same local address, `http://127.0.0.1:5173/`. App code updates online; bump the data version in `frontend/public/sw.js`
when rebuilding geographical assets. To test worker behavior: `node --test frontend/tests/sw.test.cjs`.

Rebuild them with `backend/.venv/bin/python scripts/bake_ice.py` after installing `backend` with its `data` extra
(`backend/.venv/bin/python -m pip install -e './backend[data]'`). The script downloads public NSIDC GeoTIFFs,
caches originals in `.cache/seaice/`, and records source URLs and SHA-256 hashes in the manifest. It also runs
`scripts/vectorize_ice.py` to rebuild the GeoJSON display outlines. That script can be run separately when originals are cached.

Source: [NOAA/NSIDC Sea Ice Index v4](https://nsidc.org/data/g02135/versions/4).
The source grid is 25 km polar stereographic. Only the vector display assets are shipped; cached original GeoTIFFs remain available for reproducible preparation.
GeoTIFF values 0–1000 are divided by 10 for concentration percent; land, coastal and missing flags are excluded
from the statistical fit. Display polygons outline cells at or above 15% concentration. They show extent, not concentration shading.
For display, source land gaps are interpolated, outlines receive 18 km closing and 8 km opening and are simplified at 3 km,
then finer [Natural Earth land boundaries](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/)
are subtracted. Boundaries are clipped to the study window after smoothing. This is an approximate presentation:
small features can disappear and coastal alignment is imperfect. It does not increase ice observation resolution.
The original ocean-cell values and metrics are unchanged. No ice observations are displayed outside the study window;
the dashed rectangle marks the data footprint. Missing observations remain excluded rather than interpreted as ice-free.

Scenario method: separate ordinary least-squares trends per cell fitted to the selected month during 1996–2024, projected to
2035/2050 and clipped to 0–100%. Recent concentration inputs switch to AMSR2 in January 2025, so 2025–2026 are
displayed as observations but excluded from fitting. This simple model omits emissions scenarios, dynamics and
physical feedbacks. It is not a validated long-term climate forecast and supplies no calibrated uncertainty interval.
A forward holdout fits 1996–2019 and evaluates unseen 2020–2024; average per-cell absolute error in the map window
is recorded in each month's manifest and shown in the UI (March: 2.8 percentage points; September: 3.9).
It does not establish accuracy decades into the future. Use `--month march` or `--month september` to rebuild
one season; the default rebuilds both.

The displayed metric is an **unweighted mean concentration over a fixed set of valid ocean grid cells** in
56–80°N, 150–42°W (8,312 ocean cells). The window includes waters outside Canada. It is neither total ice area nor a Northwest Passage
shipping-route statistic. Existing port scores and site trends remain separately labelled fixtures.

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

### Map colors and satellite time presets

Edit `frontend/src/map-colors.css` to change land, water, ice, port, label, and route colors. The variables apply to map shapes and legends without rebaking geographical data.

Satellite mode shares the seasonal ice presets and year slider with the map, and retains a separate custom photograph date. Observed years from 2000 onwards use MODIS Terra imagery for the 15th of the selected month. The 1996 preset uses measured ice over a reference mosaic because MODIS Terra imagery begins in February 2000. Future presets show trend-scenario ice outlines over a reference mosaic, not future photographs. High-resolution Sentinel-2 port detail is enabled only for observed dates from March 2017 onwards.

Route hover details appear in a compact fixed card that does not capture clicks. The study window can be clicked to focus without a hover tag; port markers render above route lines. The dashboard opens focused on Canada’s north. Route bends are rounded only where the display coastline allows it. These remain schematic corridors rather than navigation tracks.

Each route now has an individual `--map-route-<route-id>` color in `frontend/src/map-colors.css`, matching its controls and clickable legend. Shared route segments render as parallel cables separated by 6 screen pixels, with white casing. Spacing is recalculated on zoom, and connections ease into shared sections. These are visual offsets only: source route coordinates remain unchanged. Proposed routes remain dashed.

Route display uses screen-space Bézier bends, with staircase simplification before rounding. Click targets follow the visible curves. The source coastline-following route geometry is preserved; curves and cable offsets are presentation approximations. Legacy raster ice maps, duplicate manifests, and numbered route copies have been removed. The ice baking pipeline now produces only metrics, provenance, and the vector assets used by the dashboard.
