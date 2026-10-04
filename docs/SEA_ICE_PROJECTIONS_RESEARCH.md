# Sea-ice projection audit

Research date: 3 October 2026. The experimental 2035/2050 trend contours remain retired. Published ECCC / CMIP6 concentration projections now supply a separate future layer alongside NOAA/NSIDC observations.

## Implemented replacement

Polaris downloads ECCC's nine monthly **actual concentration** ensemble files for SSP1-2.6, SSP2-4.5 and SSP5-8.5 at the 25th, 50th and 75th percentiles. NetCDF metadata confirms `siconc`, percent units, monthly time coordinates, the selected scenario/percentile and a 1° grid; these source files carry an August 2024 creation date. Exact download URLs, metadata and SHA-256 checksums are saved in `frontend/public/data/projections/manifest.json`.

For each selectable month, `scripts/prepare_projections.py` averages the provider's monthly percentile fields over 2031–2040 and 2041–2060. The 2030s window is a Polaris choice, explicitly labelled, not an ECCC precomputed map period. Missing cells remain missing. The central extent thresholds the averaged 50th-percentile field at 15%; the spread band is the difference between the averaged 75th- and 25th-percentile extents. These statistics are averages of monthly grid-cell percentiles, **not percentiles of period means, confidence intervals or shipping probabilities**. The script checks complete unique years, physical concentration bounds and ordered percentiles. Saved land is subtracted without smoothing model cells. All 24 selected vectors (January, April, July and October) are bundled offline.

The product is an uncorrected regional model projection. Historical regional bias evaluation, port-scale accuracy and vessel-specific navigation remain outside the implemented layer. No validation of future local boundaries is claimed. Source review and automated extraction checks establish provenance and calculation integrity, not forecast skill.

## What the previous maps actually calculated

The old preparation code fitted ordinary least-squares regression independently to each 25 km ocean cell, for each selected calendar month, using 1996–2024 concentrations. It extrapolated the line to 2035 and 2050, clipped concentrations to 0–100%, and drew smoothed contours at 15% concentration:

`C(cell, year) = clip(a(cell) + b(cell) × (year − 2010), 0, 100)`

This was a reproducible algorithm, not a hand-drawn guess. However, mathematical reproducibility is different from demonstrated forecast reliability. The model did not include emissions pathways, ice transport, ice thickness or physical climate feedbacks, and provided no calibrated uncertainty interval. Its historical check trained on 1996–2019 and evaluated 2020–2024: February 2.9, May 8.2, June 11.5, July 6.7, August 4.6 and November 5.9 percentage points mean absolute cell error. That short check did not validate 11–26-year extrapolations, local ice-edge positions, or passage availability. No baseline comparison or long-horizon forecast validation had been implemented.

Those numbers describe the retired experiment; they are not error estimates for the observed data or for 2035/2050. The helpers remain in `scripts/bake_ice.py` for reproducibility, but the normal preparation pipeline now generates observations only. Previous manifests and contours were archived locally in `.cache/retired-ice-trends/`, outside the public website.

## What trusted sources say

**NSIDC trend guidance, section 3.** Linear regression helps quantify historical change; that does not make it an ice-conditions prediction model. The guidance discusses variability, sensitivity to individual years and the physical drivers that a relationship with time omits. This directly undermines treating our simple extrapolated contours as reliable local forecasts. [Interpretation Resources for Sea Ice Trends and Anomalies, pp. 3–5](https://nsidc.org/sites/default/files/interpretation-resources-sea-ice-trends-and-anomalies.pdf).

**Canada’s Changing Climate Report 2026, section 6.3.3.3 and Box 6.3.** The government assessment describes model uncertainty, coarse grids, thickness biases and thick-ice choke points in the Northwest Passage. Its shipping assessment uses temperature, concentration and thickness from 17 bias-corrected CMIP6 simulations, with ship-class distinctions. Our concentration-only extrapolation did not reproduce that method. [Changes in the cryosphere](https://www.canada.ca/en/environment-climate-change/services/science-technology/changing-climate-report-2026/cccr-chapter-6-en.html).

**ECCC CMIP6 products.** Environment and Climate Change Canada provides monthly gridded sea-ice products from a multi-model ensemble, with SSP emissions scenarios. Its map products describe changes over periods such as 2021–2040 and 2041–2060; a period average must not be labeled as an exact-year forecast. This is the recommended provider to investigate for Polaris. [CMIP6 climate scenarios and downloads](https://climate-scenarios.canada.ca/?page=cmip6-scenarios).

**ECCC processing details.** Models are remapped to a common 1° grid; this does not resolve narrow channels. The documentation describes one realization per model, equal model weighting and ensemble percentiles. Anomaly products use a 1995–2014 baseline and mask low historical concentrations; missing values are not open-water predictions. Monthly gridded products are also described as actual values. The product table and downloaded variable metadata must therefore be checked before drawing concentration contours. [Technical documentation](https://climate-scenarios.canada.ca/?page=cmip6-technical-notes), [model list](https://climate-scenarios.canada.ca/?page=cmip6-model-list).

**Kim et al. (2023).** This peer-reviewed study combines CMIP6 simulations with observational constraints and uncertainty estimates. It projects Arctic-wide sea-ice area, not precise boundaries around our ports. Its “ice-free September” result must not be copied into a claim that a Canadian route is open. The paper identifies public model data and analysis code. [Nature Communications, DOI 10.1038/s41467-023-38511-8](https://www.nature.com/articles/s41467-023-38511-8).

Original model output is available through ESGF; ECCC provides a more approachable processed route for this project. [WCRP CMIP data access](https://www.wcrp-cmip.org/cmip-data-access/).

## Research checklist for further development

The following remains the broader research checklist. The implementation above covers provenance, scenario choices, explicit periods, model spread and offline storage; regional bias evaluation and navigability assessment remain open:

1. Use ECCC’s downloadable CMIP6 concentration products, or original `siconc` simulations with explicit provenance. Inspect a real file first: units, calendar, missing values, historical reference, period and whether the values are absolute concentrations or anomalies.
2. Start with SSP1-2.6, SSP2-4.5 and SSP5-8.5 to expose scenario dependence. Record the exact source files, versions, model membership, processing steps and checksums; cite ECCC as processor and CMIP6 modelling centres as producers.
3. Use clearly named multi-year periods, preferably the provider’s published periods. For bespoke windows around 2035/2050, disclose the actual years used and calculation rather than borrowing those labels from unrelated products.
4. Display a central estimate together with model spread. State what each statistic means; ensemble spread is not automatically a calibrated probability of navigability. Verify the extraction against the provider’s own results.
5. Compare historical model fields with observations at an appropriate common scale. Document regional biases and do not create apparent local precision by smoothing or adding finer coastlines. Use a published, evaluated correction method if correction is necessary.
6. Keep projections visually distinct from observations and cache the complete prepared layer locally. Leave route-opening dates and port feasibility outside the concentration layer; those require additional evidence including thickness and vessel capabilities.

## Presentation wording now

“Polaris compares NOAA/NSIDC observed sea ice with published ECCC / CMIP6 regional climate projections, sourced ports and schematic shipping routes. Future layers show three emissions scenarios and model spread for explicitly labelled multi-year periods; they do not forecast a particular year or establish ship access.”

This decision does not imply that future sea ice cannot be projected. It means the removed maps did not have enough support for the specific claims their detailed outlines could suggest.
