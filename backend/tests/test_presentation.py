"""The committed presentation assets must not depend on upstream services."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / 'frontend/public'


def test_preset_pack_has_every_expected_tile_and_a_matching_catalogue():
    import importlib.util
    spec = importlib.util.spec_from_file_location('prepare', ROOT / 'scripts/prepare_presentation.py')
    prepare = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(prepare)
    manifest = json.loads((PUBLIC / 'data/presentation/manifest.json').read_text())
    expected = {'/data/presentation/' + relative for relative, _ in prepare.tiles()}
    assert manifest['complete'] and not manifest['failures']
    assert set(manifest['assets']) == expected
    for asset in expected:
        payload = (PUBLIC / asset.lstrip('/')).read_bytes()
        assert payload.startswith((b'\xff\xd8', b'\x89PNG')), asset
    from app.repositories.sites import get_sites
    saved = json.loads((PUBLIC / 'data/sites.json').read_text(encoding='utf-8'))
    assert saved['sites'] == get_sites().model_dump(mode='json')['sites']
