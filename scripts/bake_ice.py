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
from PIL import Image
import rasterio
from rasterio.transform import from_bounds, xy
from rasterio.warp import reproject, Resampling, transform, transform_bounds

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

    bbox = transform_bounds('EPSG:4326', 'EPSG:3857', west, south, east, north)
    width = 1100
    height = round(width * (bbox[3] - bbox[1]) / (bbox[2] - bbox[0]))
    target_affine = from_bounds(*bbox, width, height)

    def render(data, filename):
        projected = np.full((height, width), 2550, dtype=np.float32)
        reproject(data.astype(np.float32), projected, src_transform=affine, src_crs=crs,
                  dst_transform=target_affine, dst_crs='EPSG:3857', resampling=Resampling.nearest)
        rgba = np.zeros((height, width, 4), dtype=np.uint8)
        ocean = projected <= 1000
        # Below 15% is the source product's low-concentration cutoff, not
        # evidence of an ice-free, navigable channel.
        t = np.where(projected >= 150, np.clip(projected / 1000, 0, 1), 0)
        dark, light = np.array([13, 55, 83]), np.array([238, 250, 255])
        rgba[ocean, :3] = (dark + t[ocean, None] * (light - dark)).astype(np.uint8)
        rgba[ocean, 3] = 255
        rgba[projected == 2550] = [231, 174, 56, 255]
        # Flat land and coastline colours make this a stand-alone simplified map.
        rgba[projected == 2540] = [204, 216, 210, 255]
        rgba[projected == 2530] = [153, 176, 169, 255]
        rgba[projected == 2510] = [91, 111, 124, 255]
        Image.fromarray(rgba).save(OUTPUT / filename, optimize=True)

    frames = []
    sources = []
    for year, path, data in zip(YEARS, paths, raw):
        filename = f'{prefix}-{year}.png'
        render(data, filename)
        frames.append({'year': year, 'kind': 'observed', 'url': '/data/ice/' + filename,
                       'mean_concentration_percent': round(float(values[YEARS.index(year)][common_ocean].mean()), 1)})
        sources.append({'year': year, 'url': base + path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    for year in [2035, 2050]:
        forecast = predict(intercept, slope, year)
        prediction_raw = np.where(np.isfinite(forecast), forecast * 10, raw[TRAINING_YEARS.index(2024)]).astype(np.float32)
        # Unmodelled ocean cells are missing, not silently borrowed observations.
        prediction_raw[(raw[TRAINING_YEARS.index(2024)] <= 1000) & ~np.isfinite(forecast)] = 2550
        filename = f'{prefix}-{year}-scenario.png'
        render(prediction_raw, filename)
        model_ocean = common_ocean & np.isfinite(forecast)
        frames.append({'year': year, 'kind': 'scenario', 'url': '/data/ice/' + filename,
                       'mean_concentration_percent': round(float(forecast[model_ocean].mean()), 1)})
    manifest = {
        'dataset': 'NOAA/NSIDC Sea Ice Index, Version 4 (G02135)',
        'source_url': 'https://nsidc.org/data/g02135/versions/4',
        'documentation_url': 'https://nsidc.org/sites/default/files/documents/user-guide/g02135-v004-userguide.pdf',
        'month': month_name, 'bounds': BOUNDS, 'native_resolution_km': 25,
        'latest_observed_year': 2026, 'baseline_year': 1996,
        'metric': 'Unweighted mean concentration over a fixed set of ocean grid cells within 56–80°N, 150–42°W. This geographic window includes waters beyond Canada; it is not a national or shipping-route metric.',
        'metric_ocean_cells': int(common_ocean.sum()),
        'method': f'Per-cell ordinary least-squares linear trend fitted to {month_name} observations from 1996–2024, extrapolated and clipped to 0–100%. Values below 15% share the lowest display colour. A trend extrapolation, not a climate-model forecast; no calibrated probability or confidence interval.',
        'holdout': {'training': '1996–2019', 'validation': '2020–2024', 'mean_absolute_error_percentage_points': round(mae, 1), 'ocean_cells': int(holdout_mask.sum()), 'meaning': 'Mean absolute per-cell error over withheld Septembers in this map window; does not quantify future uncertainty.'},
        'limitations': ['25 km grids cannot resolve many narrow Northwest Passage channels or port approaches.', 'Historical and recent concentration inputs change in January 2025 (GSFC to AMSR2); forecasts exclude 2025–2026 from fitting.', f'{month_name} monthly averages are not daily passage conditions. Below 15% concentration is not proof of open water.', 'Linear extrapolation omits future emissions, ice transport, feedbacks and physical constraints; skill may deteriorate with lead time.', 'All maps describe sea ice concentration, not thickness, glacier melt or navigability.'],
        'frames': frames, 'sources': sources,
    }
    (OUTPUT / f'manifest-{prefix}.json').write_text(json.dumps(manifest, indent=2) + '\n')
    if month == 9:
        (OUTPUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
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
