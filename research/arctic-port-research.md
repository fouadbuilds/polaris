# Canadian Arctic ports and the Northwest Passage: hackathon research brief

Research checked on **3 October 2026**. Prepared for the Polaris hackathon project.

## 1. The decision your project should support

**Compare where an Arctic port could support a defined shipping service, how reliably that service could operate, and under what future conditions investment becomes worth investigating.**

Separate three questions:

1. **Can it be built?** Land tenure, community priorities, permitting, foundations, permafrost, water depth, construction logistics, utilities and funding.
2. **Can ships use it?** Berth and approach conditions, route-wide ice hazards, vessel capability, draft, weather, icebreaking and emergency support.
3. **Will anybody pay to use it?** Cargo demand, inland connections, total transport costs, scheduling reliability and competing ports.

There is no single Arctic “port construction year” that follows from sea-ice decline. Existing ports demonstrate that seasonal infrastructure is already possible. A date for commercially dependable Northwest Passage service needs a route, a vessel specification, a minimum operating season and an acceptable failure probability.

This brief provides sources and a proposed method. It does **not** contain newly calculated site rankings, downloaded satellite scene analysis, engineering feasibility estimates or validated opening dates. The supplied PNG discussion was considered as project context; the separate HEIC file could not be decoded in this environment.

## 2. Findings that change the project design

### Arctic-wide ice decline does not imply steadily improving local navigation

Cook et al. (2024) analysed Canadian Ice Service charts from 2007–2021 using vessel-specific POLARIS risk calculations. They found substantial spatial variability and shorter shipping seasons in parts of the northern Northwest Passage. Older ice moving into channels can create bottlenecks even as overall Arctic ice declines. This supports evaluating complete routes and vessel classes rather than projecting a local ice-area trend into a port opening date. [Paper](https://www.nature.com/articles/s43247-024-01477-6).

The paper also identifies reusable research outputs: derived 2007–2021 POLARIS RIO data on an ECCC server and figure data in Dryad. Investigate these before reproducing the entire risk-processing pipeline. The Dryad landing page was not retrievable during this research; availability is reported by the paper, rather than independently download-tested. [Dryad DOI](https://doi.org/10.5061/dryad.p5hqbzkx8).

### “Practically ice-free” is a climate metric, not a navigation guarantee

IPCC AR6 assesses that the Arctic Ocean will likely first become practically sea-ice-free in the September mean before 2050 under all assessed SSP scenarios. The threshold is below one million square kilometres, not zero ice. It does not establish year-round operation, every-year reliability, or an ice-free Canadian channel. Use it as broad context, not a construction deadline. [IPCC Chapter 9](https://www.ipcc.ch/report/ar6/wg1/chapter/chapter-9/).

### The Northwest Passage is a network of routes

Northern routes through Parry Channel and southern routes through the archipelago face different depth and ice constraints. A port's nearby open water is insufficient evidence that a ship can reach the Atlantic or Pacific. [NSIDC route explanation](https://nsidc.org/sea-ice-today/analyses/arctic-sea-ice-nears-its-minimum-extent-year).

For the prototype, model three geographic layers separately: the berth and its approach; the regional supply corridor; and the complete interoceanic corridor. Include Baffin Bay/Lancaster Sound at the eastern end and the Beaufort/Chukchi/Bering connection at the western end. Exact routable channel geometry must come from authoritative charts and route literature.

### Ice thickness is not available only from satellites

Canadian Ice Service archives contain direct ice-thickness and snow-depth measurements. The historic collection covers 195 sites, with some records dating to 1947; a smaller programme resumed in 2002. Measurements are typically weekly near shore during the safe winter measurement period. They are valuable for validation, but are not a continuous offshore thickness map. [CIS thickness archive](https://www.canada.ca/en/environment-climate-change/services/ice-forecasts-observations/latest-conditions/archive-overview/thickness-data.html).

Ordinary optical images do not directly measure total thickness. ICESat-2 and radar-altimeter products estimate freeboard, the elevation above sea level, and thickness retrievals require snow and density assumptions. Many standard thickness products are winter-focused; summer retrievals require special methods. [NASA sea-ice products](https://icesat-2.gsfc.nasa.gov/sea-ice-data), [ESA uncertainty explanation](https://www.esa.int/Applications/Observing_the_Earth/FutureEO/CryoSat/Essential_groundwork), [ESA summer-thickness research](https://eo4society.esa.int/projects/arcticsummit-arctic-summer-ice-thickness/).

### Commercial and public-service ports require different comparisons

Compare at least three use cases: community resupply, a mine or other bulk-export terminal, and an international transit service. An emergency-support or government-service facility adds a different value proposition. Revenue, public benefits and service requirements differ across these cases; do not collapse them into one universal “best port” score.

Avoid assuming that trade with China automatically requires Panama. Select actual cargo origins and destinations. For Pacific-facing Canadian cargo, existing Pacific ports are an essential comparator; for Atlantic-facing cargo, compare the applicable Panama/Suez and other viable services. Treat any distance or cost advantage as a calculation to perform, not an established result.

## 3. Websites and datasets to use

“Free” below describes the publicly advertised data pathway, not unlimited processing, guaranteed service access or unrestricted redistribution. Check the licence attached to each selected product. Catalogue pages were checked; bulk downloads and authenticated APIs were not tested.

### Core ice and imagery stack

| Priority | Source | What it provides | Use in Polaris | Access and important limitation |
|---|---|---|---|---|
| 1 | [CIS regional charts, NSIDC G02171 v2](https://nsidc.org/data/g02171/versions/2) | Weekly regional ice polygons, concentration, development stage and ice form; record extends back to 1968 | Historical local and corridor conditions; build operating-season metrics | Public HTTPS archive, shapefiles with XML metadata; regional coverage and observing practices vary |
| 1 | [Direct G02171 v2 archive](https://noaadata.apps.nsidc.org/NOAA/G02171_V2/) | Download pathway identified by the catalogue | Obtain a small regional/time subset first | Verify available folders and latest year before ingestion |
| 1 | [CIS ice services](https://www.canada.ca/en/environment-climate-change/services/ice-forecasts-observations.html) | Current charts, forecasts, historical products and climatology | Authoritative Canadian reference and quality comparison | Chart products have different purposes and coverage |
| 1 | [CIS chart guide](https://www.canada.ca/en/environment-climate-change/services/ice-forecasts-observations/latest-conditions/products-guides/chart-descriptions.html) | Explanation of chart types and Egg Code | Correctly interpret concentration and ice categories | Development stage is not a precise thickness measurement at every point |
| 1 | [Copernicus Browser](https://browser.dataspace.copernicus.eu/) | Search and visualise Sentinel acquisitions | Inspect candidate-site imagery and select scenes | Downloads/processing may require an account; check actual footprints and dates |
| 1 | [Sentinel-1 catalogue](https://dataspace.copernicus.eu/data-collections/copernicus-sentinel-missions/sentinel-1) | C-band radar imagery acquired in darkness and through cloud | Ice/water patterns and repeated local observations | Mode, resolution, polarisation and acquisition schedule vary; radar brightness is not thickness |
| 2 | [Sentinel-2 catalogue](https://dataspace.copernicus.eu/data-collections/copernicus-sentinel-missions/sentinel-2) | Multispectral optical imagery | Clear summer visual examples and shoreline context | Cloud and illumination constrain coverage; different bands have different resolutions |
| 2 | [Sentinel-2 mission specifications](https://sentiwiki.copernicus.eu/web/s2-mission) | Band and mission details | Select suitable visible and infrared bands | A 10 m export does not mean every input band has 10 m native information |
| 2 | [NASA Worldview](https://worldview.earthdata.nasa.gov/) | Browsable imagery and time comparison | Broad regional inspection, visual storytelling and scene triage | A rendered image is a visualisation; use the underlying science data for measurements |
| 2 | [Worldview data guide](https://nsidc.org/data/user-resources/help-center/visualize-and-download-nsidc-daac-data-nasa-worldview) | How to access NSIDC layers through Worldview | Connect a displayed layer to its source | Check date, product and native grid |
| 2 | [NOAA sea-ice concentration CDR](https://www.ncei.noaa.gov/products/climate-data-records/sea-ice-concentration) | Daily/monthly concentration, 25 km grid, 1978–present | Arctic-wide context and long-term reference | Too coarse to resolve many channels or harbour approaches |
| 2 | [CIS 1991–2020 climate normals](https://www.canada.ca/en/environment-climate-change/services/ice-forecasts-observations/latest-conditions/climatology/ice-climate-normals/northern-canadian-waters.html) | Weekly typical conditions in northern Canadian waters | Baseline comparison and explanation of seasonality | A normal is not a forecast or a best/worst-case year |
| 3 | [RCM public-access FAQ](https://www.asc-csa.gc.ca/eng/satellites/radarsat/faq.asp) | RADARSAT Constellation access rules and EODMS registration | Supplement Sentinel-1 where suitable released scenes exist | Public users have limited products; broader access requires vetting; confirm licensing |

**Recommended first dataset:** CIS vector charts. They already encode relevant ice categories. Use Sentinel imagery to add detail and demonstrate observations; do not make a new image-classification model a prerequisite for the whole hackathon.

**RCM access detail:** the CSA FAQ currently limits public users to Canada-land products at 16 m or coarser and world-maritime products at 100 m or coarser. Not everything visible on a coverage map is publicly downloadable. A hackathon should have Sentinel-1 as a fallback if required RCM scenes are unavailable.

### Thickness, weather, forecasts and climate projections

| Source | Data/use | Main limitation |
|---|---|---|
| [CIS measured thickness](https://www.canada.ca/en/environment-climate-change/services/ice-forecasts-observations/latest-conditions/archive-overview/thickness-data.html) | Downloadable historical station measurements for independent validation | Near-shore points and seasonal sampling do not represent the whole shipping route |
| [NASA ICESat-2 sea-ice data](https://icesat-2.gsfc.nasa.gov/sea-ice-data) | ATL07 surface height/type, ATL10 freeboard, gridded freeboard products | Along-track sampling, quality flags, snow corrections and coastal gaps need inspection |
| [ICESat-2 monthly thickness guide](https://nsidc.org/sites/default/files/documents/user-guide/is2sitmogr4-v004-userguide.pdf) | Monthly winter thickness and snow/density estimates; NetCDF product | Winter monthly estimates cannot be relabelled as current summer harbour measurements |
| [ESA Sea Ice CCI](https://climate.esa.int/en/projects/sea-ice/) | Climate-quality sea-ice products and documentation | Select concentration versus thickness explicitly; check seasonal masks and uncertainty |
| [Copernicus Arctic ice forecast](https://data.marine.copernicus.eu/product/ARCTIC_ANALYSISFORECAST_PHY_ICE_002_011/description) | Model-based Arctic ice analysis and nine-day forecasts, including the Canadian Archipelago | Forecast/assimilation output, not raw satellite truth or a decades-ahead climate projection |
| [ERA5](https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels?tab=overview) | Historical hourly temperature, wind and other fields; atmospheric grid 0.25° | Reanalysis blends observations and modelling; coastal harbour conditions need finer information |
| [CMIP6 climate projections](https://cds.climate.copernicus.eu/datasets/projections-cmip6?tab=overview) | Multi-model scenario data, including sea-ice area percentage and thickness | Native model grids and variable frequency differ; narrow channels may be poorly represented |

For decadal research, use several models and SSP pathways. For day-to-day conditions, use forecasts and charts. These answer different questions. Never stretch a nine-day forecast into a 2040 prediction.

### Port feasibility, traffic and commercial demand

| Source | What to extract | Main limitation |
|---|---|---|
| [CHS NONNA](https://www.charts.gc.ca/data-gestion/nonna/index-eng.html) | Public Canadian bathymetry; assess depth-data coverage and approach constraints | Explicitly non-navigational; gaps and source quality matter |
| [GEBCO Arctic bathymetry / IBCAO](https://www.gebco.net/data-products/gridded-bathymetry-data/arctic-ocean) | Broad Arctic seabed context plus source/type identifier grids | Interpolated regional grid; not an engineering survey or navigation chart |
| [PAME Arctic Ship Traffic Data](https://www.pame.is/ourwork/arctic-shipping/astd) | Tracks, ship types, port visits and traffic analysis | Application required; students can seek limited free access; AIS has coverage limitations |
| [Statistics Canada trade application](https://www150.statcan.gc.ca/n1/pub/71-607-x/71-607-x2021004-eng.htm) | Commodity, province, partner-country, value and quantity where reported | National/provincial trade is not proof that cargo can be captured by a particular port |
| [Nunavut Impact Review Board](https://www.nirb.ca/) | Proposed-project documents, assessment findings and concerns | Documents are project-specific; proposal claims are not independent confirmation |
| [Grays Bay registry file 17XN011](https://www.nirb.ca/portal/pdash.php?appid=125069) | Starting point for the project's review history | Check current submissions and status against the latest official project page |
| [Tallurutiup Imanga](https://parks.canada.ca/amnc-nmca/cnamnc-cnnmca/tallurutiup-imanga) | Conservation context in the Lancaster Sound region | Obtain applicable management provisions; designation alone does not establish a blanket shipping ban |
| [National Inuit Strategy on Research](https://itk.ca/projects/national-inuit-strategy-on-research/) | Inuit expectations for governance, participation and benefits in research | Public information cannot substitute for community involvement or consent |

IBCAO's current landing page lists **v5.2, released June 2026**, with 100 m grid spacing and coarser downloads. The complete 100 m bathymetric GeoTIFF is about 12.6 GB. Use a relevant tile or coarser grid for a prototype. Grid spacing must not be presented as underlying survey accuracy; inspect the source/type grids. CHS and IBCAO screening must be replaced by appropriate local surveys before any construction or navigational decision.

### Technical and regulatory references

- [Copernicus API documentation](https://documentation.dataspace.copernicus.eu/APIs.html): catalogue search, OData, STAC, S3 and processing options. Start with manual scene selection, then automate the proven workflow.
- [CIS Open Government ice-chart catalogue](https://open.canada.ca/data/en/dataset/c80b950d-0a0a-44ed-87cc-53f69354750b): product resources and Canadian open-government licensing.
- [Canadian ice-navigation manual](https://publications.gc.ca/collections/collection_2023/mpo-dfo/Fs154-31-2022-eng.pdf): practical background, chart interpretation and navigation considerations.
- [IMO Polar Code overview](https://www.imo.org/en/mediacentre/hottopics/pages/polar-default.aspx): ship requirements and operational context.
- [Transport Canada ASSPPR introduction](https://tc.canada.ca/en/marine-transportation/marine-safety/ship-safety-bulletins/coming-force-new-arctic-shipping-safety-pollution-prevention-regulations-ssb-no-05-2018): Canadian framework and POLARIS as an option in specified circumstances.
- [AIRSS standard](https://tc.canada.ca/sites/default/files/migrated/tp12259e.pdf): vessel capability, ice-regime assessment and reporting background.

Older Transport Canada pages still reference the repealed ASPPR. Use the ASSPPR framework and current consolidated rules when making compliance claims. A prototype risk score does not establish permission to sail.

## 4. Locations worth investigating

These are **research candidates and comparators**, not a ranked recommendation. Harbour or community coordinates do not identify a suitable berth parcel.

| Location | Why investigate | What must be established | Role in the demo |
|---|---|---|---|
| Cambridge Bay | Already a candidate in the Polaris fixture; useful southern-corridor study area | Local approaches, draft, supply demand, corridor bottlenecks and community priorities | One primary local case study |
| Gjoa Haven | Existing Polaris candidate; southern-route community context | Shallow-route constraints, vessel choice, resupply benefit and channel connectivity | Second local case study, with bottleneck comparison |
| Pond Inlet | Existing Polaris candidate; eastern Arctic study area | Community harbour capability versus regional industrial facilities; ecological and local priorities | Eastern comparison; do not equate its harbour with Milne Port |
| Grays Bay | Real proposed port plus roughly 230 km road project; connects port economics with mineral access | Assessment outcome, committed demand, road delivery, financing, construction and shipping windows | Strong proposed-project case study |
| Iqaluit | Deep Sea Port opened in July 2023 | Actual service capabilities and limitations; eastern supply-network role | Existing-infrastructure benchmark; not a mid-passage location |
| Churchill | Existing port with Hudson Bay Railway access to the continental Class 1 rail network | Hudson Bay/Strait seasons, inland reliability, cargo capture and comparative economics | Atlantic-facing, inland-connected benchmark; outside the core NWP corridor |
| Tuktoyaktuk | GNWT reports identify it as a marine transport terminal | Harbour/approach depth, road-linked logistics, local coastal hazards and community needs | Western comparison requiring further site-specific study |
| Nanisivik | A documented warning about seasonal and infrastructure economics | Current caretaker status and any actual reuse proposal | Historical investment case, not an operating naval-port benchmark |

### Verified project status, as of the research date

**Grays Bay:** the federal page describes a proposed deepwater port, airfield and approximately 230 km all-season road. It records a March 2026 impact-statement submission and ongoing NIRB assessment, plus planning/preconstruction support and consultation toward possible national-interest listing. Planning funds and assessment progress are not construction approval or a confirmed opening date. [Federal project page, modified 14 September 2026](https://www.canada.ca/en/privy-council/major-projects-office/projects/national/grays-bay.html).

**Iqaluit:** the Nunavut government announced the Deep Sea Port's opening on 25 July 2023. Its existence demonstrates that “when can Arctic ports be built?” cannot be answered by waiting for an Arctic-wide melt threshold. [Official announcement](https://www.gov.nu.ca/en/newsroom/iqaluit-deep-sea-port-officially-opens-2023-07-25).

**Churchill:** the federal Churchill Plus page proposes upgraded rail, an all-weather road, an energy corridor and icebreaking capacity. Its four-season ambition is a proposal being investigated, not evidence that reliable year-round service has already been achieved. [Federal project page](https://www.canada.ca/en/privy-council/major-projects-office/projects/other/referred/churchill-plus.html).

**Tuktoyaktuk:** a GNWT 2025 operational update describes cargo being redirected to its terminal, illustrating why inland and marine network disruption must be considered together. [GNWT update](https://www.gov.nt.ca/en/newsroom/vince-mckay-update-2025-marine-transportation-services-operations).

**Nanisivik:** DND announced on 21 May 2026 that the facility would transition out of operational use into caretaker status. It cited a very short access season, construction problems, scope reductions, repairs and changed ship endurance. The announcement reports $110.2 million invested and another $200 million needed to make it fully operational. This is evidence for considering infrastructure and mission viability alongside ice, rather than proof that any nearby port would fail. [DND announcement](https://www.canada.ca/en/department-national-defence/news/2026/05/department-of-national-defence-to-transition-nanisivik-naval-facility-out-of-operational-use.html).

## 5. How to answer “when will it be possible?”

### Define the service before estimating its future

Choose a vessel class, maximum draft, loading needs, origin and destination, target season and tolerable cancellation risk. A shallow-draft resupply vessel and a large container ship cannot share one navigability definition.

For an illustrative hackathon experiment, you could ask:

> In which future period could a specified vessel have a contiguous 90-day seasonal service window in at least 8 of 10 years, across the harbour approach and the complete required route?

The 90 days and 8/10 reliability requirement are **proposed adjustable assumptions**, not industry standards or measured results. Transit time, turnaround and weather buffers must fit inside that window. Repeat the experiment at different season and reliability requirements.

### Historical baseline

1. Start with 2007–2021 if using the published research outputs, or a documented recent 15–20-year CIS subset if processing charts yourself. Use only complete years for annual comparisons; verify archive completeness.
2. Draw a harbour-approach polygon, a regional corridor and a route network. Test sensitivity to polygon size; a 25 km or 50 km buffer is an analyst choice, not a harbour boundary.
3. Extract concentration and stage-of-development categories for each observation. Preserve dates, missing values and source polygons.
4. Estimate breakup, freeze-up, low-ice weeks, longest contiguous suitable window, old-ice encounters and year-to-year variability.
5. Estimate vessel-specific ice suitability using a correctly implemented published method where the required inputs exist. If inputs are insufficient, label the simpler result a concentration-based screening measure.
6. Display typical and adverse years. A median alone conceals service failures.

Weekly charts support weekly indicators, not exact daily opening dates. Interpolation does not create daily observations. A route-wide count of suitable weeks also does not establish successful transit: the vessel has to traverse successive segments at successive times.

### Ice concentration is not a universal safety threshold

For visualisation, a low-concentration threshold such as 15% can help describe open-water conditions, but it is not a safe-passage rule. Small amounts of old ice or ridged ice can matter disproportionately. A model based on average concentration must be presented as a screening tool.

POLARIS combines ice-type concentrations with vessel-specific risk values. If implemented, respect the published concentration units, ice categories, risk-value tables and operational caveats. Polar Code categories A/B/C and individual ice classes are related concepts, not interchangeable labels.

### Future scenarios

1. Select several CMIP6 models and multiple pathways, for example SSP1-2.6, SSP2-4.5 and SSP5-8.5, where the required variables are available.
2. Validate historical model output against the observed regional seasonal cycle. Reject or clearly flag poor geographic representation and major baseline biases.
3. Evaluate windows such as 2031–2040, 2041–2050 and 2051–2060. Decade ranges are more credible than a single opening year.
4. Show the distribution across models and model years. Do not describe an uncalibrated model agreement fraction as a precise real-world probability.
5. Label fine-scale future harbour and channel conditions unresolved unless supported by suitable regional modelling. Resampling a coarse model onto a 10 m map does not solve that problem.
6. Stress-test route blockage, an adverse ice year, weaker cargo demand and delayed road construction.

A historical linear trend can be a transparent baseline comparison. It cannot reliably extrapolate local ice dynamics or prove climate durability. Short-term worsening can occur within a long-term warming trend; infrastructure should survive both favourable and unfavourable years.

### Construction is a separate timeline

Even if an operating-window criterion is met in a future decade, commercial readiness also requires surveys, land arrangements, assessment, permitting, funding, design, construction, commissioning and a customer base. Construction logistics can themselves depend on seasonal transport. Present these as separate milestones with dependencies; do not silently convert a climate threshold into a build start or completion date.

## 6. Compare port feasibility without hiding missing evidence

Use **exclusion and uncertainty checks first**, then compare the remaining candidates. Unknown depth or unresolved land arrangements should not be converted to a middling score that can be offset by favourable ice.

| Dimension | Evidence required | Suggested display |
|---|---|---|
| Ice and route access | Vessel-specific suitability, approach conditions, bottlenecks, contiguous seasons | Distribution of operating weeks and adverse years |
| Water depth and manoeuvring | Survey coverage, tidal datum, berth and approach depths, turning area | Suitable / constrained / unknown, with data quality |
| Inland logistics | Existing or proposed road/rail, cargo origin, transfer requirements | Connection status and cost assumptions |
| Cargo and customers | Commodity quantities, realistic market capture, contracts or demand scenarios | Demand range and evidence strength |
| Ground and construction | Geotechnical/permafrost studies, erosion, utilities, workforce and material supply | Unresolved engineering requirements |
| Community and environmental fit | Relevant Inuit/Inuvialuit organisations, community priorities, land use and project assessment | Documented issues and required engagement |
| Operational support | Fuel, repair, communications, rescue and pollution response | Existing capacity and dependency gaps |
| Economics | Capital, maintenance, ship and inland transport, delays and fallback costs | Scenario costs and break-even assumptions |

For an explainable demo, show dimensions separately. If a summary score is essential, publish its weights, vary them, and mark sites with unresolved essential constraints as provisional. Do not call an arbitrary weighted score a probability or a feasibility certification.

### Economic comparison to perform

Compare door-to-door cost per tonne or per container for the **same cargo movement and service level**:

`inland movement + loading/transfers + ship charter/capital + fuel + ice support + insurance + expected delay + seasonal storage + port charges + disruption fallback`

Include port construction and maintenance in the investment model rather than treating new infrastructure as free. Transit time depends on route distance **and** realistic speed, ice delays, port turnaround and scheduling. Model cargo revenue and demand conservatively; existing trade totals do not imply all that trade can be diverted.

Compare no new construction, upgrading an existing seasonal facility, a dedicated bulk-export terminal and a new transit-oriented port. A phased project with useful resupply benefits today may be more robust than one dependent entirely on future interoceanic container traffic. This is a hypothesis to test, not a conclusion from the source review.

For environmental comparison, include realistic vessel fuel use and operational delays. Shorter distance alone does not prove lower emissions; investigate local pollution, underwater noise, wildlife and community travel/harvesting impacts separately.

## 7. Recommended hackathon scope

**Deliver a map that compares three sites using historical operating seasons, identifies their route bottlenecks, and explains the evidence still needed before investment.**

Use Cambridge Bay, Gjoa Haven and Pond Inlet to align with the existing Polaris prototype. Add Grays Bay, Iqaluit and Churchill as documented project/benchmark cards if time permits. Keep the map's site coordinates distinct from any proposed berth coordinates.

### Minimum useful deliverable

- A year/week selector showing actual CIS ice polygons.
- A site panel with concentration, ice-category mix, estimated seasonal window and historical variability.
- An approach and route panel showing where access is constrained beyond the port.
- One Sentinel-1 or clear optical scene per site, with sensor, acquisition date and footprint.
- A source and data-quality panel that explicitly identifies observations, interpreted charts, model outputs and assumptions.
- Documented existing/proposed infrastructure and cargo-use scenarios.

Add long-term climate scenarios only after the historical pipeline is working. A well-evidenced historical comparison is stronger than an unsupported “build in 2037” prediction.

### Suggested 48-hour sequence

| Stage | Work | Reviewable output |
|---|---|---|
| First 4 hours | Confirm vessel/use case, three sites and available CIS files; select sample imagery | Data manifest, geographic scope, sample chart |
| Hours 4–14 | Parse chart attributes, clip site approaches and corridor segments, preserve missingness | Real historical measurements with provenance |
| Hours 14–24 | Calculate seasonal/variability indicators and adverse-year comparisons | Site comparisons and bottleneck view |
| Hours 24–34 | Add infrastructure, project status and cargo assumptions | Evidence-backed candidate cards |
| Hours 34–42 | Validate against source charts, alternate buffers and held-out years | Known-error list and uncertainty display |
| Final 6 hours | Polish map and prepare a reproducible example | Working demo and source-linked explanation |

The times are an illustrative work plan, not a promise that full climate or economic modelling can be completed in 48 hours.

## 8. Implications for the existing Polaris repository

The README and site repository identify the current data as illustrative fixtures. The values **78, 64 and 46**, and the existing ice-percentage trend points, are not observations or validated siting evidence. Keep that distinction visible in the pitch until they are replaced by processed data.

Recommended research-driven changes for a subsequent implementation task:

1. Replace the ambiguous `ice_extent_pct` interpretation with a documented metric: for example, area-weighted sea-ice concentration within a fixed marine polygon for a specified week. Sea-ice extent, area and concentration are different quantities.
2. Attach the region, observation date, dataset version, chart identifier, licence and quality/missingness indicators to every derived series.
3. Add route and vessel context to each seasonal-window estimate.
4. Replace the hand-assigned durability score with transparent measured indicators before choosing any combined ranking.
5. Keep economic potential, community/environmental questions and build readiness separate from the ice trend.
6. Show actual source-observation freshness separately from the time the application serves its response.

No application files were changed as part of this research request.

## 9. Data manifest and verification checklist

For each selected chart or scene, record:

| Field | Purpose |
|---|---|
| Dataset/product/version and official URL | Reproduce the source |
| Scene or chart ID, acquisition/validity time | Establish what time the data represent |
| Download date and file checksum | Reproduce the exact input |
| Footprint, coordinate system and native resolution | Confirm geographic relevance |
| Units, missing values and quality flags | Avoid silent numerical errors |
| Processing steps and parameter choices | Reproduce derived indicators |
| Licence and attribution | Publish the demo appropriately |
| Observed / interpreted / modelled / illustrative | Prevent misleading certainty |

Satellite-image suitability checks: does the footprint cover the harbour **and approach**? Does the date match the intended season? Is optical imagery cloud-free and illuminated? Are SAR mode and polarisation comparable? Are surface melt and rough open water confounding interpretation? Is there a near-date CIS chart for cross-checking? Does the licence permit the intended display?

Historical-analysis checks: land is excluded from marine averages; concentration tenths and percentages are not mixed; undocumented/unknown ice is not treated as water; chart coverage gaps remain missing; weekly resolution is respected; results survive reasonable buffer changes; trends use a consistent season; the full route is not represented by a single site-average value.

Predictive checks: separate training and held-out years; compare against climatology and simple baselines; inspect model grid representation; report uncertainty from data, interannual variation, model choice, scenario and economics separately.

## 10. What you can credibly claim in the pitch

> Polaris compares Canadian Arctic port candidates using observed ice conditions, vessel-specific route constraints and infrastructure evidence. It shows how dependable seasonal access has been, where bottlenecks remain, and what additional conditions must be met before expansion is justified.

Claims to avoid without additional work: an exact port opening year; a guaranteed Panama cost saving; a satellite-only thickness measurement from ordinary photographs; a 10 m future climate forecast; or a commercially feasible port selected solely by how fast nearby ice declines.

The strongest immediate research path is **CIS vector history → route and vessel season indicators → Sentinel scene checks → infrastructure and demand comparison → scenario uncertainty**.

## Team concepts added to the dashboard

The team's research shortlist now includes two community-adjacent concepts. This is a Polaris inference about locations worth investigating if access improves; the cited organizations do not endorse these port ideas.

- **Resolute Bay:** Nunavut describes its position facing the Northwest Passage and its role as a High Arctic expedition and research gateway. NRCan documents an existing Arctic logistics hub here. That provides a basis to investigate a logistics port near existing services, rather than choosing an isolated coast. The marker is the approximate community centre, not a berth. Sources: [Nunavut community profile](https://www.gov.nu.ca/en/communities/resolute-bay), [NRCan logistics-hub renewal](https://natural-resources.canada.ca/corporate/transparency/polar-continental-shelf-program-renewal).
- **Kugluktuk:** the existing community and airport provide a starting point for staff and food logistics; Nunavut opened a new air terminal in June 2025. A study could examine improved community marine resupply on Coronation Gulf. This does not establish a deep-water berth, safe fuel storage or a viable carrier service. Sources: [Nunavut community profile](https://www.gov.nu.ca/en/communities/kugluktuk), [2025 air-terminal opening](https://www.gov.nu.ca/en/newsroom/kugluktuk-naujaat-and-whale-cove-open-new-air-terminal-buildings-2025-06-18).

Both require community-led planning, depths and sediment studies, ice-thickness and approach assessments, conservation review, infrastructure and demand evidence. The website separates them from existing ports and published projects. Their feeder lines are schematic study connections, not scheduled services or routes optimized against projected ice.
