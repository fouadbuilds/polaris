# Canadian Arctic trade and logistics corridors

Research checked 3 October 2026. Scope: Canada, Northwest Passage and Grays Bay.

The dashboard includes nine schematic corridors. Solid brown lines identify mapped passage variants;
solid teal lines identify corridors supporting existing logistics; dashed purple lines identify proposed
infrastructure or our inferred market connections. The overlay does not change with the ice-map year:
historical ice and trend scenarios provide context, not proof that a voyage can operate.

## What has actually carried trade?

The Northwest Passage has carried commercial cargo, although recorded voyages do not establish a
reliable year-round container service. The independent transit compilation lists the **Nunavik** carrying
nickel concentrate to China in 2014, and **Amurborg** carrying anodes from China to Québec and pulp from
Québec to Korea in 2024. These are evidence of specific voyages, not a service guarantee or a track used
to generate this dashboard. The archive's numbered routes differ from the DRDC variant numbering;
we do not equate the two systems. [Cargo transit compilation through 2025](https://thenorthwestpassage.info/wp-content/uploads/2026/01/NWP-2025-Transits-Cargo.pdf).

Existing community supply operations are a separate logistics market. NEAS lists service areas including
Pond Inlet, Resolute Bay, Cambridge Bay and Gjoa Haven. Its service-area list supports the network's
existence, rather than the precise itinerary drawn here. [NEAS service areas](https://neas.ca/sealift-reservation-options/).

MTS provides deck cargo and bulk petroleum services to Western Arctic communities including
Tuktoyaktuk, Paulatuk and Kugluktuk. Cambridge Bay's scheduled MTS service was discontinued starting
in 2021; it should not be presented as a current scheduled stop. [MTS](https://www.inf.gov.nt.ca/en/MTS),
[2026 schedule](https://www.inf.gov.nt.ca/en/MTS/schedule-and-cargo-dates),
[Cambridge Bay service change](https://www.gov.nt.ca/en/newsroom/mts-discontinue-service-cambridge-bay).

Churchill is another existing Canadian export gateway, reached through Hudson Bay and Hudson Strait.
Its operator announced Europe-bound grain loading in August 2026. This route is not an NWP crossing.
The overlay ends at an Atlantic gateway, without implying a particular destination port or vessel track.
[Arctic Gateway Group announcement](https://www.arcticgateway.com/agg-news/newsroom/first-grain-export-since-2020-loaded-at-port-of-churchill-bound-for-europe).

## Corridors in the map

| Corridor | Evidence / status | Role in the hackathon |
| --- | --- | --- |
| NWP: Victoria Strait | Documented southern variant, 3A | Atlantic–Pacific connection through Queen Maud Gulf, Dease Strait and Coronation Gulf |
| NWP: Prince of Wales Strait | Documented northern variant, 1 | Comparison with the southern archipelago route |
| NWP: Rae / Simpson Strait | Documented southern variant, 3B | A shallow-channel alternative near Gjoa Haven |
| Québec–Baffin–Kitikmeot sealift | Existing service-area network | Community and project resupply |
| Tuktoyaktuk–Western Arctic | Existing MTS logistics | Regional cargo and fuel supply |
| Churchill–Atlantic | Existing export gateway | Rail–port connection to European markets |
| Grays Bay–Pacific | Our inferred connection; port proposed | Potential export and supply link through the western NWP and Bering Strait |
| Grays Bay–Atlantic | Our inferred connection; port proposed | Potential export and supply link through the southern NWP |
| Grays Bay–Jericho | Proposed road, schematic endpoints | Land–sea logistics connection |

The three passage variants follow the named waterways in Table 2-2 of the 2013 DRDC report. That source
is used for corridor geography, not current operations or a 2026 chart. It describes narrow, shallow and
ice-affected passages; the variants cannot be assumed suitable for the same vessels.
[DRDC report, section 2.5 / Table 2-2](https://publications.gc.ca/collections/collection_2016/rddc-drdc/D68-3-065-2013-eng.pdf).

## Grays Bay: proposal versus inference

NIRB lists the Grays Bay Road and Port project in active review. Its proposal includes a deepwater port,
small-craft harbour, landside facilities and approximately 230 km of road to Jericho Station. The proposed
wharf and road endpoint locations come from Table 1.1 of the August 2024 proposal.
[NIRB registry](https://www.nirb.ca/portal/pdash.php?appid=125987),
[project proposal](https://new.reviewboard.ca/sites/default/files/project_document/240812-24xn038-project-proposal-ir1e.pdf).

The western and eastern sea connectors are **our inference** from the proposed port's geography and
the documented passage network. They are not announced Grays Bay–China or Grays Bay–Europe shipping
services. No opening year, carrier commitment or commercial feasibility score is assigned. The road is
drawn between endpoints, not as a surveyed alignment. An all-season road to Jericho does not establish
a completed all-season road connection to southern Canada.

## What the lines can and cannot tell us

Route waypoints are hand placed. A local Natural Earth water mask prevents major sea segments from
visually cutting through islands. This step improves presentation; it does not calculate safe routes,
depth clearance, ice resistance or vessel performance. Port endpoints may be shifted to adjacent water.
The lines are not AIS observations, official low-impact shipping corridors or navigational guidance.

The dashboard's 25 km monthly ice data cannot resolve many of these narrow channels. To evaluate an
actual future voyage, the next research steps are daily regional ice conditions, multiyear ice and drift,
bathymetry and vessel draft, ports and unloading capacity, schedule reliability, cargo commitments and
operating costs. Project approval, financing and construction are separate from sea-ice accessibility.

For stronger evidence of actual traffic, PAME's Arctic Ship Traffic Data service offers eligible students
and academic researchers an application path for free access. The dashboard does not yet incorporate
those tracks. [PAME data access overview](https://pame.is/).

## Reuse and updates

The bundled file is `frontend/public/data/routes-canada.geojson`; the browser caches it for offline use.
`scripts/bake_routes.py` records the route metadata, source links and schematic geometry preparation.
Run it with the backend Python environment after the world land file has been prepared. When changing
the dataset, use a new filename and update the frontend and service-worker paths so older browser
caches do not hide a revised route.
