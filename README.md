# Polaris

Polaris is a Canadian Arctic observatory for investigating ports, supply connections and shipping corridors as sea ice changes. Its intended decision is where a port could support a defined shipping service, how reliably ships could reach it, and which conditions justify further investigation or investment.

The dashboard combines observed regional ice, published ECCC / CMIP6 climate projections, sourced port evidence and schematic routes. The earlier experimental trend maps have been retired. Engineering feasibility, vessel-specific route access, opening dates and commercial profitability remain future work.

## Rubric presentation and decision screening

The revised deck and team run-through are in `deliverables/Polaris-team-presentation.pptx` and `deliverables/Polaris-step-by-step.md`. The sequence uses a 2–3 minute opener, a separate RCM evidence presenter and a final one-minute site demonstration. The RCM overview needs the team's actual scene and metadata before a scene-specific claim can be made.

**Port details → Compare three ports** compares documented project status, supply connections, source evidence and unresolved requirements. Grays Bay, Churchill and Tuktoyaktuk are the initial infrastructure benchmarks, not interchangeable routes for the same shipment. No feasibility score is assigned.

The voyage calculator now accepts extra days on both routes and shows the selected route's break-even delay. At an assumed 12 knots and zero alternative delay, the shorter Prince of Wales schematic loses its time advantage over the Victoria Strait schematic after approximately 1.11 extra days. Fuel use, emissions, vessel suitability and commercial profitability are not calculated.

Read-only source verification: `backend/.venv/Scripts/python.exe scripts/verify_presentation_evidence.py` checks the cached September source hashes, fixed ocean-cell sample and two displayed regional means without downloading or rewriting data.

## Start on Windows

Double-click **Start Polaris.cmd** in this folder. It uses Git Bash to run the canonical `start.sh` launcher, starts the API and website, waits for both, and opens `http://127.0.0.1:5173/` in your default browser. Keep its window open; press **Ctrl+C** to stop the services it started. Healthy existing Polaris services are reused; unrelated applications occupying ports 8000 or 5173 produce an error.

### One-time setup

Install Git for Windows, Python 3.11+, and Node.js with pnpm 10.32.1 available. In PowerShell, from this project folder:

```powershell
python -m venv backend/.venv
.\backend\.venv\Scripts\python.exe -m pip install -e './backend[dev]'
cd frontend
pnpm install --frozen-lockfile
cd ..
```

Setup needs internet; installed dependencies and the saved presentation pack work locally. The launch supervisor can also find the bundled Codex Node runtime when available.

For manual startup in separate terminals:

```powershell
.\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

```powershell
cd frontend
pnpm dev --host 127.0.0.1
```

`VITE_API_BASE_URL` overrides the frontend's default API address, `http://localhost:8000`.

## Start on macOS / Linux

Run `bash scripts/dev.sh` once to install dependencies and start both services. After setup, run `bash start.sh` from a terminal for the canonical launcher. On macOS, **Start Polaris.command** provides Finder double-click startup and browser opening. Keep its Terminal window open; **Control+C** stops it. If executable bits were lost in your checkout, run `chmod +x "Start Polaris.command"` once.

Manual backend setup uses `python3 -m venv backend/.venv`, then `backend/.venv/bin/python -m pip install -e './backend[dev]'`. From `backend`, run `.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`. Start the frontend with `pnpm dev` from `frontend`.

## Offline presentation

The project includes **123 observed ice outlines across four selectable months**, **24 ECCC projection layers**, world land geometry, eleven route corridors, a saved ten-location port catalogue and a prepared pack of **6,273 satellite tiles** under `frontend/public/data/`. Unused observations, projection layers and imagery have been moved to the local ignored archive `.cache/retired-public-data/`. Local servers can serve the active files without internet even if browser storage is cleared.

**Use saved imagery** (under **Offline imagery & coverage**) enables itself when the completed pack is available:

- March, July and September **2005, 2015, 2025 and 2026**, plus October **2005, 2015 and 2025** use saved NASA MODIS imagery dated the 15th of that month, within 56–80°N and 150–42°W, at tile zooms 3–6.
- **1996** uses the saved mixed-date Esri reference mosaic with the observed ice outline. This is not a photograph from 1996.
- The global reference mosaic is saved through tile zoom 4, with the Arctic region saved through zoom 6. Further zoom enlarges saved images.
- Every ice year works locally. Other photograph dates show the reference mosaic with an explicit notice; turn off Use saved imagery to retrieve them online.
- New high-resolution Sentinel-2 requests are disabled while saved imagery is enabled. The bundled researched port catalogue is used online and offline, with the API as a fallback.

The service worker also saves the local pack on the device. **✓ Presentation pack & projections saved offline** confirms browser preparation. Use the same `http://127.0.0.1:5173/` address and keep local servers running. Custom dates, new detailed port imagery and external source links still require internet; source summaries, methods and provenance stay local.

Before presenting, switch all four monthly views and the available preset buttons in Map and Satellite views, then disconnect internet and repeat. Use saved imagery should stay enabled.

To regenerate the catalogue and resumably prepare the public satellite pack:

```powershell
.\backend\.venv\Scripts\python.exe scripts/prepare_presentation.py
```

On macOS use `backend/.venv/bin/python`. Failed downloads are recorded; the pack is marked complete only when every tile is saved. No paid Copernicus processing is requested. Provider endpoints are recorded in the presentation manifest. Bump the data-cache version in `frontend/public/sw.js` when replacing saved assets.

## Ice data and exact sources

The annual ice-cycle cards show **winter maximum (March), melting/breakup (July), annual minimum (September, the default), and freeze-up (October)**. Each card explains the wider seasonal phase while displaying a real monthly snapshot. The shipping-window disclosure gives Canadian Ice Service 1991–2020 regional normals for Lancaster Sound, Amundsen Gulf and Peel/Larsen sounds; these are historical shipping seasons, not measured ice-free durations or projected access. Seasonal timing is sourced to [NSIDC](https://nsidc.org/learn/parts-cryosphere/sea-ice/quick-facts-about-sea-ice) and [Canadian Ice Service normals](https://www.canada.ca/en/environment-climate-change/services/ice-forecasts-observations/latest-conditions/climatology/ice-climate-normals/northern-canadian-waters.html). March, July and September observations cover **1996–2026**; October covers **1996–2025**, because October 2026 is not complete. Each observed map is a monthly average, not a daily measurement. Inputs switch to AMSR2 in 2025. The observation slider remains separate from future projections.

**Layers & time → Sources & how these maps are made** links to the selected observation's original GeoTIFF, the other original observations, their SHA-256 checksums, the exact user guide, the Natural Earth boundary download and the local provenance manifest. Expand this section when you need the evidence or methodology.

- [NOAA/NSIDC Sea Ice Index v4, G02135](https://nsidc.org/data/g02135/versions/4).
- [August 2026 original concentration GeoTIFF](https://noaadata.apps.nsidc.org/NOAA/G02135/north/monthly/geotiff/08_Aug/N_202608_concentration_v4.0.tif).
- [G02135 v4 user guide](https://nsidc.org/sites/default/files/documents/user-guide/g02135-v004-userguide.pdf).
- Complete source URLs, checksums, metrics and methods: `frontend/public/data/ice/manifest-{month}.json` for March, July, September and October. Earlier monthly files are archived locally under `.cache/retired-public-data/ice/` and can be regenerated from the saved raw sources.

Visible credits identify NOAA/NSIDC observations. Satellite view names NASA GIBS / MODIS Terra for dated images and Esri World Imagery for the reference mosaic, with direct provider catalogue links.

Route tooltips appear beside the hovered route, using a wider invisible target to make thin lines easier to select. They close on pointer exit, map movement or route removal. Keyboard focus also shows the tooltip; Enter or Space opens route details and Escape dismisses it. Hover effects respect reduced-motion preferences.

The native grid is 25 km. Display polygons outline at least 15% concentration, with smoothing and finer land subtraction; they do not increase observation resolution or measure thickness. Missing values remain excluded. The displayed metric averages 8,312 fixed ocean cells across the study window, including non-Canadian waters. It is neither total ice area nor a route-access statistic.

## Future ice: ECCC / CMIP6 projections

Choose **Future projections** in Layers & time. The website includes 24 offline layers: four monthly views, **SSP1-2.6, SSP2-4.5 and SSP5-8.5**, and **2031–2040 / 2041–2060** periods. These are regional climate projections, not predictions of a specific year or ship access.

`scripts/prepare_projections.py` downloads nine official ECCC monthly absolute `siconc` concentration NetCDF files (25th, 50th and 75th ensemble percentiles). It averages each selected calendar month over the listed years, retaining missing values; draws the median field's ≥15% extent; and shows a purple band where the averaged 25th/75th percentile fields disagree on that threshold. These are **averages of monthly percentile fields**, not percentiles of period averages or calibrated probabilities. The 1° cells remain visibly coarse; saved land is subtracted for display without adding local model detail.

The projection source is credited above its controls. **Projection sources & calculation** links to the exact official downloads, technical documentation and saved metadata/checksums in `frontend/public/data/projections/manifest.json`. All 24 selected vectors are bundled and included in browser offline preparation. Rebuild with the backend `data` extra installed: `backend/.venv/Scripts/python.exe scripts/prepare_projections.py` on Windows. Raw source files (~2.4 GB) stay in ignored `.cache/eccc-cmip6/`; compact derived vectors ship with the site.

The old 2035/2050 maps used per-cell ordinary least-squares extrapolation of 1996–2024 observations. That was a reproducible algorithm, but its short historical check did not validate local ice boundaries decades into the future. [NSIDC’s trend guidance, section 3](https://nsidc.org/sites/default/files/interpretation-resources-sea-ice-trends-and-anomalies.pdf) distinguishes measuring historical change from predicting ice conditions. Those maps and all future slider entries have been removed. The generation pipeline no longer creates them; the previous experiment was archived locally outside the public website.

[ECCC’s CMIP6 products](https://climate-scenarios.canada.ca/?page=cmip6-scenarios) now supply the replacement layer. A trusted source does not remove regional uncertainty: [Canada’s Changing Climate Report 2026, section 6.3.3.3](https://www.canada.ca/en/environment-climate-change/services/science-technology/changing-climate-report-2026/cccr-chapter-6-en.html) discusses Northwest Passage grid limitations and ice choke points. No local bias correction or route-access forecast is claimed.

Read the [full scientific-source audit and replacement requirements](docs/SEA_ICE_PROJECTIONS_RESEARCH.md). The website includes these research links in **Future ice: research & limits**.

Rebuild observations using `scripts/bake_ice.py` with the backend `data` extra. `--month march`, `july`, `september` or `october` selects one visible monthly view; `all` also preserves the earlier monthly assets. Original GeoTIFFs are cached in `.cache/seaice/`; `scripts/vectorize_ice.py` rebuilds observed outlines from them. Only display vectors and provenance are shipped. Concentration values 0–1000 are divided by 10; flagged land, coastal and missing cells are excluded from statistics. Display uses 18 km closing, 8 km opening, 3 km simplification and Natural Earth land subtraction.

## Existing and proposed ports

| Location | Status | Supply context |
| --- | --- | --- |
| Cambridge Bay | Existing harbour | Community marine use and commercial barges |
| Gjoa Haven | Existing marine facilities | Community resupply and funded mooring infrastructure |
| Pond Inlet | Community harbour opened in 2022 | Local small craft and improved resupply |
| Iqaluit | Deep-sea port opened in 2023 | Capital-community services and marine cargo |
| Churchill | Operating deep-water port | Hudson Bay Railway and commodity handling |
| Tuktoyaktuk | Existing MTS terminal | Western Arctic cargo/fuel and the Inuvik highway |
| Grays Bay | Documented proposal under review | Remote site; proposed 230 km road to Jericho Station |
| Qikiqtarjuaq | Published deep-sea-port proposal | Existing community, fisheries and local resupply |
| Resolute Bay | Team research concept | Existing community, airport and Arctic research logistics hub |
| Kugluktuk | Team research concept | Existing community, airport and a new air terminal opened in 2025 |

Port details lead with supply connections; evidence, sources and location/assessment limits are in separate expandable sections. Repeated yellow caution boxes and the unimplemented RCM status panel have been removed. Community markers are approximate, not surveyed berths. Grays Bay uses the approximate proposed wharf coordinate from the August 2024 proposal, Table 1.1. No isolated hypothetical sites have been invented. Proposals remain distinct from existing infrastructure; proximity to a community alone does not establish feasibility.

Research: [Arctic port brief](research/arctic-port-research.md). Addition sources include [Nunavut's Iqaluit opening announcement](https://www.gov.nu.ca/en/newsroom/iqaluit-deep-sea-port-officially-opens-2023-07-25), [Churchill's operator](https://www.arcticgateway.com/port-of-churchill), [GNWT's terminal operations update](https://www.gov.nt.ca/en/newsroom/vince-mckay-update-2025-marine-transportation-services-operations), and [Qikiqtarjuaq funding announcement](https://www.canada.ca/en/transport-canada/news/2021/08/government-of-canada-invests-in-transportation-infrastructure-in-nunavut.html). Qikiqtarjuaq remains listed as a priority in Nunavut's 2026–2030 business plan, linked in its panel; completion is not asserted.

**Legacy scores and fixture charts are obsolete for now and hidden.** API fields and components remain intact. Set `SHOW_LEGACY_SCORES = true` in `frontend/src/components/SitePanel.tsx` to restore them with their illustrative-data notice. They are unrelated to measured regional ice.

## Routes, distances and voyage comparisons

Routes include three Northwest Passage variants, eastern sealift, western resupply, Churchill–Atlantic exports, two conceptual Grays Bay sea connections and the proposed Grays Bay–Jericho road. Group/individual controls select overlays. Click a corridor for evidence, limitations, sources and the focus button.

Filters separate **Current port connections**, **Published port projects**, **Team port concepts**, **Passage alternatives** and **All routes**. Two extra schematic feeders connect the team's Resolute Bay and Kugluktuk research candidates to Lancaster Sound and Coronation Gulf. These are community-adjacent study ideas inferred from published community, airport and logistics information, not approved projects or promises of future access. Port filters separately show current ports, published proposals and team concepts. Purple markers identify team concepts; their source panels explain the inference and assessment gaps.

The **↔ Ruler** button on the map lets you click A and B to measure direct great-circle distance in kilometres, statute miles and nautical miles. A third click starts a new measurement; Clear removes it. The line follows the spherical arc and does not calculate a navigable route. A scale bar is also shown. Ruler mode suspends route and port click targets so they do not intercept point placement.

Route cards stay anchored to the initial hover position and close on selection or map movement. Port cards show status and a brief logistics note on hover or keyboard focus. Clicking opens evidence without recentering; use the explicit focus controls to move the map. The study-area rectangle is noninteractive.

The larger **Map legend** at the bottom right has **Hide legend / Show legend** controls. White projection shading means the central estimate reaches at least 15% ice concentration; purple/pink shading means lower and upper model estimates disagree about the ice edge. Pink is purple shading overlapping white, not a third ice category. Hover or tap the projection areas for explanations; keyboard focus also opens them, and Escape dismisses them. Port markers have wider invisible hit areas for easier selection. All hover cards close when the map moves. Ruler mode bypasses projection, port and route hit areas.

Each route shows **kilometres and statute miles**; sea corridors also show **nautical miles**. Distance sums great-circle segment lengths along the original schematic geometry, before curves and parallel offsets. The road's endpoint sketch is distinguished from the published approximately 230 km proposed alignment.

The calculator accepts speed in knots, extra ice/waiting days, an alternative distance and optional daily operating cost in CAD. Northwest Passage variants with identical endpoints can be selected directly. For other comparisons, enter a sourced alternative distance for the same endpoints. The initial 12 knots is an editable example; no operating cost is invented.

Time = distance ÷ speed + selected-route extra days. Alternative delay is assumed zero. Operating-cost difference = days saved × daily cost. Icebreaking, insurance, canal fees, fuel-price differences, cargo revenue and port costs are excluded. This is an assumption-based comparison, not a verified commercial savings claim.

Routes are schematic and independent of the ice year. Proposed routes are dashed. Parallel cables and rounded bends only affect display. Research: [Canadian Arctic trade routes](research/arctic-trade-routes.md). Data: `frontend/public/data/routes-canada.geojson`. Rebuild using `scripts/bake_routes.py` after preparing world land geometry.

## Online satellite detail

**Custom date** is in the map's lower-left corner. Select a date and choose **Show photograph** to switch to dated satellite imagery. Unsaved dates automatically use online imagery; saved dates can use the local pack. **Return to monthly ice** restores the observed preset. Custom photographs hide the monthly ice overlay rather than presenting it as a daily measurement. Optional Copernicus port detail is inside the date card.

Turn off Use saved imagery for other dated imagery and Sentinel-2 port previews. MODIS Terra begins in 2000; high-resolution port detail requires an observed date from March 2017 onwards. Clouds, darkness and incomplete coverage may hide the surface. Imagery is not an ice classification.

The simplified map uses warm cream land, pastel-blue water and white ice. On dated satellite photographs, selected ice extent uses a translucent blue tint and darker blue boundary to distinguish it from clouds. Reference mosaics use white ice fill and edges; this overlay comes from the monthly ice data, not classification of the photograph.

For Sentinel-2, create a Copernicus Data Space OAuth client in the [dashboard](https://shapps.dataspace.copernicus.eu/dashboard/), copy `backend/.env.example` to `backend/.env`, enter the ID and secret, and restart the API. Keep credentials private; they stay on the backend.

`GET /api/imagery/{site_id}?date=YYYY-MM-DD` searches the preceding 30 days and returns a 768-pixel true-colour preview of the latest acquisition. The UI shows the acquisition timestamp separately. Successful previews persist under `.cache/imagery/`; 24 previews also remain in memory. Keys include coordinates, date and rendering settings. Historical previews have no expiry; delete a specific cache file to refresh it after upstream reprocessing. Tokens are never written to disk. New requests consume Copernicus quota; public deployment needs access controls and request budgets.

Viewed external tiles use a separate bounded 96-tile browser cache. They cannot evict the saved local presentation pack. NASA's exact layer catalogue and the Esri service endpoint are recorded in the pack manifest.

## Checks and layout

```powershell
New-Item -ItemType Directory -Path .cache -Force
.\backend\.venv\Scripts\python.exe -m pytest backend/tests --basetemp .cache/pytest-check
node --test frontend/tests/*.test.cjs
cd frontend
pnpm run build
```

Optional scientific preparation tests require `backend[data]`; display does not.

- `backend/app/schemas.py`: port contract and validation.
- `backend/app/repositories/sites.py`: sourced catalogue and retained fixtures.
- `frontend/src/components/`: map, source evidence, port inspector and route calculator.
- `frontend/src/map-colors.css`: editable map and individual-route colours.
- `frontend/public/data/`: bundled geography, ports and presentation assets.
- `scripts/launch.py`: shared cross-platform startup and browser opening.
- `scripts/prepare_presentation.py`: resumable satellite and catalogue preparation.

Further assessment needs route-wide ice hazards, vessel capability, depths, community priorities, permitting, infrastructure, cargo demand and competing transport costs. Current maps and proposals support investigation, not navigation or siting recommendations.

Port, route and projection hover cards use a dedicated map pane above permanent labels and markers. Port label anchors are fully transparent so they cannot cover the orange current/project dots or purple team concept dots.
