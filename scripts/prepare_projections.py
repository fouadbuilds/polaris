"""Prepare offline ECCC CMIP6 monthly concentration projections (not trends).

Install backend[data]. Raw NetCDFs are cached; public files are compact vectors.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlencode
import hashlib
import json

import httpx
import numpy as np
import xarray as xr
from shapely.geometry import box, shape, mapping
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.cache/eccc-cmip6'
OUTPUT = ROOT / 'frontend/public/data/projections'
ENDPOINT = 'https://climate-scenarios.canada.ca/tools/dd-cmip6/scen-gridded-data.pl'
SCENARIOS = {'ssp126': 'SSP1-2.6 · low emissions', 'ssp245': 'SSP2-4.5 · intermediate emissions', 'ssp585': 'SSP5-8.5 · very high emissions'}
MONTHS = {'march': 3, 'july': 7, 'september': 9, 'october': 10}
PERIODS = [(2031, 2040), (2041, 2060)]
PERCENTILES = (25, 50, 75)


def parameters(scenario, percentile):
    return {'CMIP6variabletype': 'sea-ice', 'CMIP6Variable': 'siconc', 'CMIP6model': 'ensemble',
            'CMIP6Percentile': str(percentile), 'CMIP6experiment': scenario, 'CMIP6baseline': 'mean',
            'CMIP6valuetype': 'actual', 'CMIP6timeofyear': 'monthly', 'CMIP6timeperiod': '2015-2100', 'action': 'GetNetCDFFile'}


def download(job):
    scenario, percentile = job
    target = CACHE / f'{scenario}-p{percentile}.nc'
    url = ENDPOINT + '?' + urlencode(parameters(scenario, percentile))
    if not target.exists():
        temporary = target.with_suffix('.partial')
        with httpx.Client(timeout=180, follow_redirects=True) as client:
            with client.stream('GET', url) as response:
                response.raise_for_status()
                if 'netcdf' not in response.headers.get('content-type', ''):
                    raise ValueError(f'Expected official NetCDF: {url}')
                with temporary.open('wb') as output:
                    for chunk in response.iter_bytes(1024 * 1024):
                        output.write(chunk)
        temporary.replace(target)
    print(f'Saved {scenario} p{percentile}: {target.stat().st_size // 1_000_000} MB', flush=True)
    return scenario, percentile, target, url


def period_field(data, start, end, month):
    """Mean of the provider's monthly percentile field; not a percentile of means."""
    selected = data.where((data.time.dt.year >= start) & (data.time.dt.year <= end) & (data.time.dt.month == month), drop=True)
    if selected.sizes['time'] != end - start + 1 or set(selected.time.dt.year.values.tolist()) != set(range(start, end + 1)):
        raise ValueError('Incomplete projection period')
    # A missing year remains missing, rather than changing the averaging sample.
    return selected.mean('time', skipna=False)


def extent(values, latitudes, longitudes, land):
    cells = [box(lon - .5, lat - .5, lon + .5, lat + .5)
             for row, lat in enumerate(latitudes) for col, lon in enumerate(longitudes)
             if np.isfinite(values[row, col]) and values[row, col] >= 15]
    return polygonal(unary_union(cells).intersection(box(-150, 56, -42, 80)).difference(land))


def polygonal(geometry):
    """Drop zero-area boundary fragments left by clipping, retaining all ice area."""
    if geometry.geom_type in ('Polygon', 'MultiPolygon'):
        return geometry
    return unary_union([polygonal(part) for part in getattr(geometry, 'geoms', []) if part.area > 0])


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    jobs = [(scenario, percentile) for scenario in SCENARIOS for percentile in PERCENTILES]
    with ThreadPoolExecutor(max_workers=3) as pool:
        sources = list(pool.map(download, jobs))
    land_data = json.loads((ROOT / 'frontend/public/data/world-land.geojson').read_text())
    land = unary_union([shape(feature['geometry']) for feature in land_data['features']]).intersection(box(-150, 56, -42, 80))
    records, frames = [], []
    for scenario in SCENARIOS:
        fields = {}
        for source_scenario, percentile, path, url in sources:
            if source_scenario != scenario:
                continue
            with xr.open_dataset(path) as dataset:
                print(f'{path.name}: {dict(dataset.sizes)}; variables {list(dataset.data_vars)}', flush=True)
                variable = dataset['siconc']
                if dataset.attrs.get('experiment_id') != scenario or dataset.attrs.get('ensemble_type') != f'ensemble {percentile}th percentile':
                    raise ValueError('Unexpected scenario or ensemble percentile')
                if not np.allclose(np.diff(dataset.lat.values), 1) or not np.allclose(np.diff(dataset.lon.values), 1):
                    raise ValueError('Unexpected grid spacing; extent requires 1 degree cells')
                if variable.attrs.get('units') not in ('%', 'percent', 'percentage'):
                    raise ValueError(f'Unexpected concentration units: {variable.attrs}')
                # Longitude convention is normalized, never interpreted as anomalies.
                variable = variable.assign_coords(lon=((variable.lon + 180) % 360) - 180).sortby('lon').sortby('lat')
                variable = variable.sel(lat=slice(55.5, 80.5), lon=slice(-150.5, -41.5)).load()
                finite = variable.values[np.isfinite(variable.values)]
                if finite.size == 0 or finite.min() < -0.01 or finite.max() > 100.01:
                    raise ValueError('File is not absolute concentration in 0–100%')
                fields[percentile] = variable
                with path.open('rb') as source_file:
                    checksum = hashlib.file_digest(source_file, 'sha256').hexdigest()
                records.append({'scenario': scenario, 'percentile': percentile, 'url': url,
                                'filename': path.name, 'sha256': checksum,
                                'variable_attributes': variable.attrs, 'dataset_attributes': dataset.attrs})
        for month_name, month in MONTHS.items():
            for start, end in PERIODS:
                summaries = {p: period_field(fields[p], start, end, month).transpose('lat', 'lon') for p in PERCENTILES}
                arrays = {p: np.asarray(summaries[p]) for p in PERCENTILES}
                common = np.isfinite(arrays[25]) & np.isfinite(arrays[50]) & np.isfinite(arrays[75])
                if np.any(arrays[25][common] > arrays[50][common] + .01) or np.any(arrays[50][common] > arrays[75][common] + .01):
                    raise ValueError('Provider percentile ordering failed')
                latitude, longitude = summaries[50].lat.values, summaries[50].lon.values
                outlines = {p: extent(arrays[p], latitude, longitude, land) for p in PERCENTILES}
                features = []
                for role, geometry in [('median', outlines[50]), ('spread', polygonal(outlines[75].difference(outlines[25])))]:
                    if not geometry.is_empty:
                        features.append({'type': 'Feature', 'properties': {'role': role, 'scenario': scenario, 'month': month_name,
                                         'start_year': start, 'end_year': end, 'threshold_percent': 15}, 'geometry': mapping(geometry)})
                filename = f'{scenario}-{month_name}-{start}-{end}.geojson'
                (OUTPUT / filename).write_text(json.dumps({'type': 'FeatureCollection', 'features': features}, separators=(',', ':')))
                frames.append({'scenario': scenario, 'month': month_name, 'start_year': start, 'end_year': end,
                               'vector_url': '/data/projections/' + filename})
    manifest = {'provider': 'Environment and Climate Change Canada', 'dataset': 'CMIP6 multi-model sea-ice concentration ensemble',
                'source_url': 'https://climate-scenarios.canada.ca/?page=cmip6-scenarios',
                'documentation_url': 'https://climate-scenarios.canada.ca/?page=cmip6-technical-notes',
                'grid_degrees': 1, 'units': '% of grid-cell area', 'scenarios': SCENARIOS, 'periods': PERIODS,
                'method': 'For each calendar month and period, average ECCC monthly 25th, 50th and 75th percentile concentration fields over the listed years, retaining missing cells. Draw median ≥15% extent and a model-spread band where the averaged 25th and 75th percentile fields disagree on the 15% threshold. Subtract saved land for display. No trend extrapolation, smoothing or observational baseline is added.',
                'spread_meaning': 'Period averages of monthly grid-cell ensemble percentile fields. Not percentiles of period means, confidence intervals, or probabilities of ice-free shipping.',
                'limitations': ['1° model grid cannot resolve narrow channels or port approaches.', 'Concentration is not thickness or navigability.', 'Future projections are conditional on emissions; individual years are not forecasts.', 'Blank or missing model cells are not predictions of open water.'],
                'sources': records, 'frames': frames}
    (OUTPUT / 'manifest.json').write_text(json.dumps(manifest, indent=2, default=str) + '\n')
    print(f'Prepared {len(frames)} projection layers.', flush=True)


if __name__ == '__main__':
    main()
