"""Check period extraction, thresholds, and published offline projection coverage."""
import importlib.util
import json
from pathlib import Path

import numpy as np
import pytest
import xarray as xr
from shapely.geometry import box, shape, GeometryCollection, LineString

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('projections', ROOT / 'scripts/prepare_projections.py')
projection = importlib.util.module_from_spec(spec)
spec.loader.exec_module(projection)


def test_period_uses_selected_month_and_keeps_missing_cells():
    times = np.array(['2031-08-15', '2031-07-15', '2032-08-15'], dtype='datetime64[ns]')
    data = xr.DataArray([[10, np.nan], [100, 100], [30, 40]], dims=['time', 'cell'], coords={'time': times})
    result = projection.period_field(data, 2031, 2032, 8).values
    assert result[0] == 20
    assert np.isnan(result[1])
    with pytest.raises(ValueError, match='Incomplete'):
        projection.period_field(data, 2031, 2033, 8)
    duplicate = data.isel(time=[0, 0])
    with pytest.raises(ValueError, match='Incomplete'):
        projection.period_field(duplicate, 2031, 2032, 8)


def test_extent_threshold_missing_and_land_subtraction():
    result = projection.extent(np.array([[15, 14.9, np.nan]]), [70.5], [-100.5, -99.5, -98.5], box(-101, 70, -100.5, 71))
    assert result.area == pytest.approx(.5)
    assert result.bounds == (-100.5, 70, -100, 71)


def test_clipped_boundary_fragments_do_not_become_ice_hover_regions():
    geometry = GeometryCollection([box(-100, 70, -99, 71), LineString([(-101, 70), (-101, 71)])])
    result = projection.polygonal(geometry)
    assert result.area == geometry.area
    assert result.geom_type == 'Polygon'


def test_bundled_projection_sources_and_complete_matrix():
    manifest = json.loads((ROOT / 'frontend/public/data/projections/manifest.json').read_text())
    assert len(manifest['sources']) == 9
    assert len(manifest['frames']) == 24
    expected = {(s, m, start, end) for s in projection.SCENARIOS for m in projection.MONTHS for start, end in projection.PERIODS}
    assert {(f['scenario'], f['month'], f['start_year'], f['end_year']) for f in manifest['frames']} == expected
    for source in manifest['sources']:
        assert 'CMIP6valuetype=actual' in source['url']
        assert source['variable_attributes']['units'] == '%'
        assert source['dataset_attributes']['experiment_id'] == source['scenario']
        assert len(source['sha256']) == 64
    for frame in manifest['frames']:
        data = json.loads((ROOT / 'frontend/public' / frame['vector_url'].lstrip('/')).read_text())
        for feature in data['features']:
            geometry = shape(feature['geometry'])
            assert geometry.is_valid
            assert geometry.geom_type in ('Polygon', 'MultiPolygon')
            assert box(-150, 56, -42, 80).covers(geometry)
            assert feature['properties']['threshold_percent'] == 15
