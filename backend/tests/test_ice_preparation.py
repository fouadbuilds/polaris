"""Observed-map integrity checks and reproducibility of retired trend helpers."""

import importlib.util
import json
from pathlib import Path

import pytest

np = pytest.importorskip('numpy')
pytest.importorskip('rasterio')
ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('bake_ice', ROOT / 'scripts/bake_ice.py')
bake = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bake)


def test_exact_linear_signal_and_physical_bounds():
    years = list(range(1996, 2025))
    signal = np.array([70 - 2 * (year - 2010) for year in years])[:, None, None]
    intercept, slope = bake.fit_trend(signal, years)
    assert intercept.item() == pytest.approx(70)
    assert slope.item() == pytest.approx(-2)
    assert bake.predict(intercept, slope, 2035).item() == pytest.approx(20)
    assert bake.predict(intercept, slope, 2050).item() == 0


def test_missing_and_land_cells_cannot_become_predicted_ice():
    years = list(range(1996, 2025))
    values = np.full((len(years), 1, 3), 50.0)
    values[:, 0, 0] = np.nan
    values[:8, 0, 1] = np.nan
    intercept, slope = bake.fit_trend(values, years)
    result = bake.predict(intercept, slope, 2035)
    assert np.isnan(result[0, 0]) and np.isnan(result[0, 1])
    assert result[0, 2] == 50


@pytest.mark.parametrize('month', ['march', 'july', 'september', 'october'])
def test_saved_manifest_matches_all_baked_assets(month):
    output = ROOT / 'frontend/public/data/ice'
    data = json.loads((output / f'manifest-{month}.json').read_text())
    assert data['month'].lower() == month
    observations = [f for f in data['frames'] if f['kind'] == 'observed']
    assert [f['year'] for f in observations] == list(range(1996, 2026 if month in ('october', 'november') else 2027))
    assert all(f['kind'] == 'observed' for f in data['frames'])
    assert all(f['year'] <= data['latest_observed_year'] for f in data['frames'])
    assert len(data['sources']) == len(observations)
    for frame in data['frames']:
        assert Path(frame['vector_url']).name.startswith(month + '-')
        assert 'url' not in frame
        assert 0 <= frame['mean_concentration_percent'] <= 100
        vector = json.loads((output / Path(frame['vector_url']).name).read_text())
        assert vector['type'] == 'FeatureCollection'
        assert all(feature['properties']['year'] == frame['year'] for feature in vector['features'])
    assert 'holdout' not in data
    assert 'No future ice is predicted.' in data['method']


def test_vector_boundaries_are_valid_and_stay_in_study_window():
    geometry = pytest.importorskip('shapely.geometry')
    output = ROOT / 'frontend/public/data/ice'
    for path in output.glob('*-outline.geojson'):
        data = json.loads(path.read_text())
        for feature in data['features']:
            polygon = geometry.shape(feature['geometry'])
            assert polygon.is_valid
            west, south, east, north = polygon.bounds
            assert -150.00001 <= west <= east <= -41.99999
            assert 55.99999 <= south <= north <= 80.00001


def test_retired_future_contours_are_not_in_public_data():
    output = ROOT / 'frontend/public/data/ice'
    assert not list(output.glob('*-2035-outline.geojson'))
    assert not list(output.glob('*-2050-outline.geojson'))
