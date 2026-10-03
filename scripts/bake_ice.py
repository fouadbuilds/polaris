"""Prepare offline March and September ice maps from NOAA/NSIDC Sea Ice Index v4.

Run with backend/.venv/bin/python scripts/bake_ice.py after installing the
optional `data` dependencies. Source files are cached under .cache/seaice.
"""

from concurrent.futures import ThreadPoolExecutor
import argparse
import hashlib
import json
from pathlib import Path

import httpx
import numpy as np
import rasterio
from rasterio.transform import xy
from rasterio.warp import transform

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.cache/seaice'
OUTPUT = ROOT / 'frontend/public/data/ice'
BASE = 'https://noaadata.apps.nsidc.org/NOAA/G02135/north/monthly/geotiff/09_Sep/'
BOUNDS = [[56, -150], [80, -42]]
YEARS = list(range(1996, 2027))
TRAINING_YEARS = list(range(1996, 2025))


def download(year, month, base):
    name = f'N_{year}{month:02d}_concentration_v4.0.tif'
    path = CACHE / name
    if not path.exists():
        response = httpx.get(base + name, timeout=60, follow_redirects=True)
        response.raise_for_status()
        path.write_bytes(response.content)
    return path


def fit_trend(values, years):
    """OLS at each native ocean grid cell; flags are excluded, never ice values."""
    valid = np.isfinite(values)
    x = np.asarray(years, dtype=float)[:, None, None] - 2010
    n = valid.sum(axis=0)
    sx = np.where(valid, x, 0).sum(axis=0)
    sy = np.where(valid, values, 0).sum(axis=0)
    sxx = np.where(valid, x * x, 0).sum(axis=0)
    sxy = np.where(valid, x * values, 0).sum(axis=0)
    denominator = n * sxx - sx * sx
    good = (n >= len(years) - 2) & (denominator > 0)
    slope = np.full(n.shape, np.nan)
    intercept = np.full(n.shape, np.nan)
    slope[good] = (n[good] * sxy[good] - sx[good] * sy[good]) / denominator[good]
    intercept[good] = (sy[good] - slope[good] * sx[good]) / n[good]
    return intercept, slope


def predict(intercept, slope, year):
    return np.clip(intercept + slope * (year - 2010), 0, 100)


def bake(month):
    month_name, directory = {3: ('March', '03_Mar'), 9: ('September', '09_Sep')}[month]
    prefix = month_name.lower()
    base = BASE.rsplit('09_Sep/', 1)[0] + directory + '/'
    CACHE.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=4) as pool:
        paths = list(pool.map(lambda year: download(year, month, base), YEARS))
    arrays = []
    for path in paths:
        with rasterio.open(path) as src:
            if arrays:
                assert src.shape == shape and src.transform == affine and src.crs == crs, 'Incompatible source grids'
            else:
                shape, affine, crs = src.shape, src.transform, src.crs
            arrays.append(src.read(1))
    raw = np.stack(arrays)
    values = np.where(raw <= 1000, raw / 10.0, np.nan)
    # Match-month forecasts fit the homogeneous historical source period. The
    # Sea Ice Index switched concentration input instruments in January 2025.
    training = values[:len(TRAINING_YEARS)]
    intercept, slope = fit_trend(training, TRAINING_YEARS)
    # Forward holdout: fit only 1996–2019, then compare against unseen 2020–2024.
    holdout_intercept, holdout_slope = fit_trend(training[:24], TRAINING_YEARS[:24])
    heldout = np.stack([predict(holdout_intercept, holdout_slope, y) for y in range(2020, 2025)])

    rows, cols = np.indices(shape)
    xs, ys = xy(affine, rows.ravel(), cols.ravel())
    lons, lats = transform(crs, 'EPSG:4326', xs, ys)
    lons, lats = np.asarray(lons).reshape(shape), np.asarray(lats).reshape(shape)
    (south, west), (north, east) = BOUNDS
    region = (lons >= west) & (lons <= east) & (lats >= south) & (lats <= north)
    common_ocean = region & np.all(np.isfinite(values), axis=0)
    assert common_ocean.sum() > 1000, 'Regional ocean sample unexpectedly small'
    holdout_mask = region & np.all(np.isfinite(training[-5:]), axis=0) & np.isfinite(heldout).all(axis=0)
    mae = float(np.mean(np.abs(heldout[:, holdout_mask] - training[-5:, holdout_mask])))

    frames = []
    sources = []
    for year, path in zip(YEARS, paths):
        frames.append({'year': year, 'kind': 'observed',
                       'mean_concentration_percent': round(float(values[YEARS.index(year)][common_ocean].mean()), 1)})
        sources.append({'year': year, 'url': base + path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    for year in [2035, 2050]:
        forecast = predict(intercept, slope, year)
        model_ocean = common_ocean & np.isfinite(forecast)
        frames.append({'year': year, 'kind': 'scenario',
                       'mean_concentration_percent': round(float(forecast[model_ocean].mean()), 1)})
    manifest = {
        'dataset': 'NOAA/NSIDC Sea Ice Index, Version 4 (G02135)',
        'source_url': 'https://nsidc.org/data/g02135/versions/4',
        'documentation_url': 'https://nsidc.org/sites/default/files/documents/user-guide/g02135-v004-userguide.pdf',
        'month': month_name, 'bounds': BOUNDS, 'native_resolution_km': 25,
        'latest_observed_year': 2026, 'baseline_year': 1996,
        'metric': 'Unweighted mean concentration over a fixed set of ocean grid cells within 56–80°N, 150–42°W. This geographic window includes waters beyond Canada; it is not a national or shipping-route metric.',
        'metric_ocean_cells': int(common_ocean.sum()),
        'method': f'Per-cell ordinary least-squares linear trend fitted to {month_name} observations from 1996–2024, extrapolated and clipped to 0–100%. Display outlines use a 15% concentration threshold. A trend extrapolation, not a climate-model forecast; no calibrated probability or confidence interval.',
        'holdout': {'training': '1996–2019', 'validation': '2020–2024', 'mean_absolute_error_percentage_points': round(mae, 1), 'ocean_cells': int(holdout_mask.sum()), 'meaning': f'Mean absolute per-cell error over withheld {month_name} observations in this map window; does not quantify future uncertainty.'},
        'limitations': ['25 km grids cannot resolve many narrow Northwest Passage channels or port approaches.', 'Historical and recent concentration inputs change in January 2025 (GSFC to AMSR2); forecasts exclude 2025–2026 from fitting.', f'{month_name} monthly averages are not daily passage conditions. Below 15% concentration is not proof of open water.', 'Linear extrapolation omits future emissions, ice transport, feedbacks and physical constraints; skill may deteriorate with lead time.', 'All maps describe sea ice concentration, not thickness, glacier melt or navigability.'],
        'frames': frames, 'sources': sources,
    }
    (OUTPUT / f'manifest-{prefix}.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(f'{month_name}: prepared {len(frames)} maps; {common_ocean.sum()} fixed ocean cells; holdout MAE {mae:.1f} percentage points.')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--month', choices=['march', 'september', 'all'], default='all')
    options = parser.parse_args()
    for month in ([3, 9] if options.month == 'all' else [3 if options.month == 'march' else 9]):
        bake(month)
    from vectorize_ice import main as vectorize
    vectorize(('march', 'september') if options.month == 'all' else (options.month,))


if __name__ == '__main__':
    main()
