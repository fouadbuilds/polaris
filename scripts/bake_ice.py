"""Prepare monthly ice maps from NOAA/NSIDC Sea Ice Index v4.

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
MONTHS = {1: ('January', '01_Jan'), 2: ('February', '02_Feb'), 3: ('March', '03_Mar'), 4: ('April', '04_Apr'), 5: ('May', '05_May'), 6: ('June', '06_Jun'), 7: ('July', '07_Jul'), 8: ('August', '08_Aug'), 9: ('September', '09_Sep'), 10: ('October', '10_Oct'), 11: ('November', '11_Nov')}


def years_for_month(month):
    # October and November 2026 are not completed months at the presentation date.
    return list(range(1996, 2026 if month >= 10 else 2027))


def download(year, month, base):
    name = f'N_{year}{month:02d}_concentration_v4.0.tif'
    path = CACHE / name
    if not path.exists():
        response = httpx.get(base + name, timeout=60, follow_redirects=True)
        response.raise_for_status()
        path.write_bytes(response.content)
    return path


# Retired research helpers: retained for reproducibility of the audit.
# They do not generate any public map or prediction.
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
    month_name, directory = MONTHS[month]
    years = years_for_month(month)
    prefix = month_name.lower()
    base = BASE.rsplit('09_Sep/', 1)[0] + directory + '/'
    CACHE.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=4) as pool:
        paths = list(pool.map(lambda year: download(year, month, base), years))
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
    rows, cols = np.indices(shape)
    xs, ys = xy(affine, rows.ravel(), cols.ravel())
    lons, lats = transform(crs, 'EPSG:4326', xs, ys)
    lons, lats = np.asarray(lons).reshape(shape), np.asarray(lats).reshape(shape)
    (south, west), (north, east) = BOUNDS
    region = (lons >= west) & (lons <= east) & (lats >= south) & (lats <= north)
    common_ocean = region & np.all(np.isfinite(values), axis=0)
    assert common_ocean.sum() > 1000, 'Regional ocean sample unexpectedly small'

    frames = []
    sources = []
    for year, path in zip(years, paths):
        frames.append({'year': year, 'kind': 'observed',
                       'mean_concentration_percent': round(float(values[years.index(year)][common_ocean].mean()), 1)})
        sources.append({'year': year, 'url': base + path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    manifest = {
        'dataset': 'NOAA/NSIDC Sea Ice Index, Version 4 (G02135)',
        'source_url': 'https://nsidc.org/data/g02135/versions/4',
        'documentation_url': 'https://nsidc.org/sites/default/files/documents/user-guide/g02135-v004-userguide.pdf',
        'month': month_name, 'bounds': BOUNDS, 'native_resolution_km': 25,
        'latest_observed_year': years[-1], 'baseline_year': 1996,
        'metric': 'Unweighted mean concentration over a fixed set of ocean grid cells within 56–80°N, 150–42°W. This geographic window includes waters beyond Canada; it is not a national or shipping-route metric.',
        'metric_ocean_cells': int(common_ocean.sum()),
        'method': f'Observed {month_name} monthly concentration from NOAA/NSIDC GeoTIFFs. Values 0–1000 are divided by 10; flagged cells are excluded. Regional means use the fixed valid ocean-cell mask. Display outlines use a 15% concentration threshold. No future ice is predicted.',
        'limitations': ['25 km grids cannot resolve many narrow Northwest Passage channels or port approaches.', 'Historical and recent concentration inputs change in January 2025 (GSFC to AMSR2).', f'{month_name} monthly averages are not daily passage conditions. Below 15% concentration is not proof of open water.', 'All maps describe sea ice concentration, not thickness, glacier melt or navigability.'],
        'frames': frames, 'sources': sources,
    }
    (OUTPUT / f'manifest-{prefix}.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(f'{month_name}: prepared {len(frames)} observed maps; {common_ocean.sum()} fixed ocean cells.')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--month', choices=[name.lower() for name, _ in MONTHS.values()] + ['all'], default='all')
    options = parser.parse_args()
    selected = list(MONTHS) if options.month == 'all' else [month for month, (name, _) in MONTHS.items() if name.lower() == options.month]
    for month in selected:
        bake(month)
    from vectorize_ice import main as vectorize
    vectorize(tuple(MONTHS[month][0].lower() for month in selected))


if __name__ == '__main__':
    main()
