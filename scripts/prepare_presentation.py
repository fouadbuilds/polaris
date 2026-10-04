"""Save the preset satellite views and port catalogue for an offline presentation.

Run with backend/.venv/Scripts/python.exe on Windows (bin/python on macOS).
Downloads are resumable. Only public reference tiles are fetched, never paid imagery.
"""
from concurrent.futures import ThreadPoolExecutor
import json
import math
from pathlib import Path
import sys
import time
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
from app.repositories.sites import get_sites

DEST = ROOT / 'frontend/public/data/presentation'
DATES = [f'{year}-{month}-15' for year in (2005, 2015, 2025, 2026) for month in ('03', '07', '09', '10') if not (year == 2026 and month == '10')]


def tiles():
    for z in range(5):
        for x in range(2 ** z):
            for y in range(2 ** z):
                yield f'reference/{z}/{y}/{x}.jpg', f'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    for date in ['reference', *DATES]:
        for z in range(5 if date == 'reference' else 3, 7):
            n = 2 ** z
            def row(lat):
                return math.floor((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n)
            # Margin includes tiles touching the study-window boundary.
            for x in range(math.floor((-150 + 180) / 360 * n), math.floor((-42 + 180) / 360 * n) + 1):
                for y in range(row(80), row(56) + 1):
                    source = (f'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' if date == 'reference' else f'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/{date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg')
                    yield f'{date}/{z}/{y}/{x}.jpg', source


def download(item):
    relative, url = item
    target = DEST / relative
    if target.exists() and target.stat().st_size > 0:
        return relative, None
    for attempt in range(3):
        try:
            with urlopen(Request(url, headers={'User-Agent': 'Polaris-offline-presentation/1.0'}), timeout=30) as response:
                payload = response.read()
                if not payload or not response.headers.get('Content-Type', '').startswith('image/'):
                    raise ValueError('Expected a satellite image tile')
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(payload)
            return relative, None
        except Exception as error:
            if attempt == 2:
                return relative, str(error)
            time.sleep(attempt + 1)


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    (DEST.parent / 'sites.json').write_text(get_sites().model_dump_json(indent=2), encoding='utf-8')
    jobs = list(tiles())
    assets, failures = [], []
    print(f'Saving {len(jobs)} public satellite tiles plus the port catalogue...', flush=True)
    with ThreadPoolExecutor(max_workers=6) as executor:
        for i, (relative, error) in enumerate(executor.map(download, jobs), 1):
            if error:
                failures.append({'path': relative, 'error': error})
            else:
                assets.append('/data/presentation/' + relative)
            if i % 50 == 0:
                print(f'{i}/{len(jobs)} checked; {len(failures)} unavailable', flush=True)
    manifest = {'complete': not failures, 'dates': DATES, 'reference_max_zoom': 4,
                'reference_regional_max_zoom': 6, 'dated_max_zoom': 6, 'bounds': [[56, -150], [80, -42]],
                'assets': assets, 'failures': failures,
                'sources': [{'title': 'Esri World Imagery reference mosaic (mixed acquisition dates)',
                             'url': 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'},
                            {'title': 'NASA GIBS MODIS Terra Corrected Reflectance True Color',
                             'url': 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml'}]}
    (DEST / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    print(f'{len(assets)} tiles saved. Pack {"ready" if not failures else "incomplete: rerun to retry"}.', flush=True)
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
