"""Check the researched overlay's evidence labels and display geography."""
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
DATA = json.loads((ROOT / 'frontend/public/data/routes-canada-v2.geojson').read_text())


def test_proposals_are_separated_from_used_logistics_and_have_sources():
    routes = DATA['features']
    assert len({f['properties']['id'] for f in routes}) == 9
    assert {f['properties']['category'] for f in routes} == {'used', 'passage', 'proposed'}
    for feature in routes:
        details = feature['properties']
        assert details['sources'] and all(source['url'].startswith('https://') for source in details['sources'])
        assert 'not AIS' in details['geometry_method']
        if details['id'].startswith('grays-'):
            assert details['category'] == 'proposed'
            assert 'Proposed' in details['status']
    assert 'independent' in DATA['metadata']['time_relationship']


def test_marine_display_lines_do_not_cross_substantial_land_areas():
    geometry = pytest.importorskip('shapely.geometry')
    ops = pytest.importorskip('shapely.ops')
    land_data = json.loads((ROOT / 'frontend/public/data/world-land.geojson').read_text())
    land = ops.unary_union([geometry.shape(f['geometry']) for f in land_data['features']])
    for feature in DATA['features']:
        line = geometry.shape(feature['geometry'])
        assert line.is_valid
        if feature['properties']['id'] == 'grays-road':
            assert line.coords[0] == pytest.approx((-110.8709183, 67.8052253))
        else:
            # Tiny shoreline crossings can arise from the 0.04° display mask;
            # this check catches gross geometry errors, not navigation safety.
            assert line.intersection(land).length < 0.05
            assert line.intersection(land).length / line.length < 0.005
