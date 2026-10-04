"""Create display-only ice polygons from the saved 25 km NSIDC grids.

Threshold is 15% concentration. Smooth boundaries and clip to Natural Earth land.
This changes presentation only; statistical values and source data are untouched.
"""
import json
import io
import zipfile
import hashlib
import httpx
from pathlib import Path

import numpy as np
import rasterio
from rasterio.fill import fillnodata
from rasterio.features import shapes
from rasterio.transform import xy
from rasterio.warp import transform, transform_geom
from shapely.geometry import shape, mapping, box
from shapely.ops import unary_union
import shapefile

from bake_ice import CACHE, OUTPUT, MONTHS, BOUNDS


def main(months=tuple(name.lower() for name, _ in MONTHS.values())):
    land_path = CACHE / 'ne_10m_land.zip'
    if not land_path.exists():
        response = httpx.get('https://naturalearth.s3.amazonaws.com/10m_physical/ne_10m_land.zip', timeout=60)
        response.raise_for_status()
        land_path.parent.mkdir(parents=True, exist_ok=True)
        land_path.write_bytes(response.content)
    with zipfile.ZipFile(land_path) as archive:
        reader = shapefile.Reader(shp=io.BytesIO(archive.read('ne_10m_land.shp')), dbf=io.BytesIO(archive.read('ne_10m_land.dbf')), shx=io.BytesIO(archive.read('ne_10m_land.shx')))
        (south, west), (north, east) = BOUNDS
        window = box(west, south, east, north)
        land_parts = []
        world_features = []
        for part in reader.shapes():
            world_part = shape(part.__geo_interface__).simplify(0.02, preserve_topology=True)
            world_features.append({'type': 'Feature', 'properties': {}, 'geometry': mapping(world_part)})
            if box(*part.bbox).intersects(window):
                land_parts.append(shape(part.__geo_interface__).intersection(window))
        land = unary_union(land_parts).simplify(0.02, preserve_topology=True)
        world_path = OUTPUT.parent / 'world-land.geojson'
        world_path.write_text(json.dumps({'type': 'FeatureCollection', 'features': world_features}, separators=(',', ':')) + '\n')
    for month, (month_name, _) in MONTHS.items():
        name = month_name.lower()
        if name not in months:
            continue
        raw = []
        manifest_path = OUTPUT / f'manifest-{name}.json'
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
        manifest['frames'] = [frame for frame in manifest['frames'] if frame['kind'] == 'observed']
        years = [frame['year'] for frame in manifest['frames'] if frame['kind'] == 'observed']
        for year in years:
            with rasterio.open(CACHE / f'N_{year}{month:02d}_concentration_v4.0.tif') as source:
                raw.append(source.read(1))
                affine, crs = source.transform, source.crs
        raw = np.stack(raw)
        rows, cols = np.indices(raw.shape[1:])
        x, y = xy(affine, rows.ravel(), cols.ravel())
        lon, lat = transform(crs, 'EPSG:4326', x, y)
        lon, lat = np.array(lon).reshape(rows.shape), np.array(lat).reshape(rows.shape)
        # Build beyond the display window so smoothing cannot turn the study
        # boundary itself into a jagged, artificial ice edge.
        region = (lon >= west - 4) & (lon <= east + 4) & (lat >= south - 2) & (lat <= north + 2)
        concentration = np.where(raw <= 1000, raw / 10.0, np.nan)
        for frame in manifest['frames']:
            values = concentration[years.index(frame['year'])]
            # Bridge source land cells for display, then subtract a finer land
            # boundary below. The measured ocean-cell concentrations stay intact.
            valid = np.isfinite(values)
            display = fillnodata(np.where(valid, values, 0).astype(np.float32), mask=valid.astype(np.uint8), max_search_distance=20, smoothing_iterations=0)
            flags = raw[years.index(frame['year'])]
            land_cells = (flags == 2530) | (flags == 2540)
            display = np.where(land_cells, display, values)
            mask = ((display >= 15) & (display <= 100) & region).astype(np.uint8)
            polygons = [shape(geometry) for geometry, value in shapes(mask, mask=mask.astype(bool), transform=affine) if value == 1]
            merged = unary_union(polygons)
            # Rounded erosion/dilation preserves the broad extent while avoiding
            # block corners. Small features may disappear; no new accuracy is implied.
            smooth = merged.buffer(18000).buffer(-18000).buffer(-8000).buffer(8000).simplify(3000, preserve_topology=True)
            geometry = shape(transform_geom(crs, 'EPSG:4326', mapping(smooth))).intersection(window).difference(land)
            features = [] if geometry.is_empty else [{'type': 'Feature', 'properties': {'year': frame['year'], 'month': name, 'kind': frame['kind'], 'threshold_percent': 15}, 'geometry': mapping(geometry)}]
            output = {'type': 'FeatureCollection', 'features': features}
            filename = f'{name}-{frame["year"]}-outline.geojson'
            (OUTPUT / filename).write_text(json.dumps(output, separators=(',', ':')) + '\n')
            frame['vector_url'] = '/data/ice/' + filename
        manifest['display_method'] = 'Display approximation of ice extent at >=15% concentration. Land gaps in the coarse grid are interpolated for display, then Natural Earth land polygons are subtracted. Boundaries are smoothed using 18 km closing and 8 km opening, simplified at 3 km. Small features may disappear. Statistics use original ocean cells; these outlines are not higher-resolution ice observations.'
        manifest['land_source'] = {'url': 'https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/', 'download_url': 'https://naturalearth.s3.amazonaws.com/10m_physical/ne_10m_land.zip', 'sha256': hashlib.sha256(land_path.read_bytes()).hexdigest()}
        manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
        print(f'{name}: saved {len(manifest["frames"])} vector outlines')


if __name__ == '__main__':
    main()
