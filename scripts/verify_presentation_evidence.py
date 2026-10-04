"""Read-only verification of September source provenance and two demo metrics.

Uses already-cached NOAA/NSIDC GeoTIFFs. No downloads or data regeneration.
Run with backend/.venv/Scripts/python.exe scripts/verify_presentation_evidence.py.
This checks reproduction of saved regional means, not local access or forecasts.
"""
import hashlib
import json
from pathlib import Path

import numpy as np
import rasterio
from rasterio.transform import xy
from rasterio.warp import transform

ROOT = Path(__file__).resolve().parents[1]


def main():
    manifest = json.loads((ROOT / 'frontend/public/data/ice/manifest-september.json').read_text())
    common = None
    examples = {}
    reference = None
    for entry in manifest['sources']:
        path = ROOT / '.cache/seaice' / entry['url'].rsplit('/', 1)[-1]
        assert path.is_file(), f'Missing source: {path}'
        assert hashlib.sha256(path.read_bytes()).hexdigest() == entry['sha256'], f'Checksum mismatch: {path}'
        with rasterio.open(path) as source:
            grid = (source.shape, source.transform, source.crs)
            raw = source.read(1)
            if reference is None:
                reference = grid
                rows, cols = np.indices(source.shape)
                xs, ys = xy(source.transform, rows.ravel(), cols.ravel())
                lon, lat = transform(source.crs, 'EPSG:4326', xs, ys)
                lon, lat = np.array(lon).reshape(source.shape), np.array(lat).reshape(source.shape)
                (south, west), (north, east) = manifest['bounds']
                common = (lon >= west) & (lon <= east) & (lat >= south) & (lat <= north)
            assert grid == reference, 'Incompatible source grids'
            common &= (raw >= 0) & (raw <= 1000)
            if entry['year'] in (1996, 2026):
                examples[entry['year']] = raw.astype(float) / 10
    assert int(common.sum()) == manifest['metric_ocean_cells'], 'Fixed sample size differs'
    print(f"PASS: all {len(manifest['sources'])} September source checksums and grids match; {common.sum()} fixed ocean cells")
    for year, values in examples.items():
        computed = round(float(values[common].mean()), 1)
        expected = next(frame['mean_concentration_percent'] for frame in manifest['frames'] if frame['year'] == year)
        assert computed == expected, f'{year}: {computed} != {expected}'
        print(f'PASS: September {year} regional mean reproduces displayed {computed:.1f}%')
    print('Scope: provenance and regional-mean reproduction only. Port access and projection accuracy remain unvalidated.')


if __name__ == '__main__':
    main()
