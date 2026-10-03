from datetime import date
import json

from fastapi import HTTPException
from fastapi.testclient import TestClient
import httpx
import pytest

from app.imagery import ImageryService, preview_bounds
from app.main import app


@pytest.fixture
def credentials(monkeypatch):
    monkeypatch.setenv("COPERNICUS_CLIENT_ID", "test-id")
    monkeypatch.setenv("COPERNICUS_CLIENT_SECRET", "test-secret")


def test_preview_uses_acquisition_time_and_caches(credentials):
    requests = []

    def handler(request):
        requests.append(request)
        if request.url.path.endswith("token"):
            return httpx.Response(200, json={"access_token": "private-token", "expires_in": 300})
        assert request.headers["authorization"] == "Bearer private-token"
        payload = json.loads(request.content)
        if request.url.path.endswith("search"):
            assert payload["intersects"]["type"] == "Point"
            return httpx.Response(200, json={"features": [{
                "id": "scene-a", "properties": {"datetime": "2025-08-16T18:00:00Z", "eo:cloud_cover": 8},
            }]})
        time_range = payload["input"]["data"][0]["dataFilter"]["timeRange"]
        assert time_range["from"] == "2025-08-16T17:59:59+00:00"
        assert payload["input"]["bounds"]["properties"]["crs"].endswith("3857")
        return httpx.Response(200, content=b"\x89PNG\r\n\x1a\nexample")

    service = ImageryService(httpx.Client(transport=httpx.MockTransport(handler)))
    first = service.get("cambridge-bay", date(2025, 8, 18))
    assert first == service.get("cambridge-bay", date(2025, 8, 18))
    assert len(requests) == 3
    assert first["acquired_at"].startswith("2025-08-16")
    assert first["requested_date"] == "2025-08-18"
    assert "private-token" not in json.dumps(first)


def test_no_scene_does_not_spend_processing_request(credentials):
    def handler(request):
        if request.url.path.endswith("token"):
            return httpx.Response(200, json={"access_token": "token"})
        assert request.url.path.endswith("search")
        return httpx.Response(200, json={"features": []})

    service = ImageryService(httpx.Client(transport=httpx.MockTransport(handler)))
    with pytest.raises(HTTPException) as exc:
        service.get("gjoa-haven", date(2025, 8, 18))
    assert exc.value.status_code == 404


def test_auth_failure_is_sanitized(credentials):
    service = ImageryService(httpx.Client(transport=httpx.MockTransport(
        lambda request: httpx.Response(401, text="test-secret private upstream details"))))
    with pytest.raises(HTTPException) as exc:
        service.get("pond-inlet", date(2025, 8, 18))
    assert exc.value.status_code == 503
    assert "test-secret" not in exc.value.detail


def test_pagination_selects_newest_scene(credentials):
    def handler(request):
        if request.url.path.endswith("token"):
            return httpx.Response(200, json={"access_token": "token"})
        payload = json.loads(request.content)
        if request.url.path.endswith("search"):
            second = payload.get("next") == 100
            return httpx.Response(200, json={
                "context": {} if second else {"next": 100},
                "features": [{"id": "new" if second else "old", "properties": {
                    "datetime": "2025-08-17T19:00:00Z" if second else "2025-08-01T19:00:00Z",
                }}],
            })
        return httpx.Response(200, content=b"\x89PNG\r\n\x1a\nexample")

    service = ImageryService(httpx.Client(transport=httpx.MockTransport(handler)))
    assert service.get("cambridge-bay", date(2025, 8, 18))["scene_id"] == "new"


def test_quota_error_does_not_retry(credentials):
    calls = []

    def handler(request):
        calls.append(request)
        return httpx.Response(429, text="quota exhausted")

    service = ImageryService(httpx.Client(transport=httpx.MockTransport(handler)))
    with pytest.raises(HTTPException) as exc:
        service.get("cambridge-bay", date(2025, 8, 18))
    assert exc.value.status_code == 429
    assert len(calls) == 1


def test_bounds_enclose_site():
    _, (southwest, northeast) = preview_bounds(69.1167, -105.0583)
    assert southwest[0] < 69.1167 < northeast[0]
    assert southwest[1] < -105.0583 < northeast[1]


def test_disk_cache_survives_restart_without_upstream_requests(tmp_path):
    saved = {'site_id': 'cambridge-bay', 'requested_date': '2025-08-18',
             'image_url': 'data:image/png;base64,example', 'scene_id': 'saved-scene'}
    first = ImageryService(cache_dir=tmp_path)
    first.fetch = lambda *_: saved
    assert first.get('cambridge-bay', date(2025, 8, 18)) == saved
    def offline(_):
        raise AssertionError('A cached preview must not call Copernicus')
    restarted = ImageryService(httpx.Client(transport=httpx.MockTransport(offline)), cache_dir=tmp_path)
    assert restarted.get('cambridge-bay', date(2025, 8, 18)) == saved
    assert len(list(tmp_path.glob('*.json'))) == 1


def test_failed_preview_is_not_saved(tmp_path):
    service = ImageryService(cache_dir=tmp_path)
    def fail(*_):
        raise HTTPException(429, 'Quota reached')
    service.fetch = fail
    with pytest.raises(HTTPException):
        service.get('cambridge-bay', date(2025, 8, 18))
    assert not list(tmp_path.iterdir())


def test_invalid_site_and_date_are_rejected_before_network():
    with TestClient(app) as client:
        assert client.get("/api/imagery/no-such-site?date=2025-08-18").status_code == 404
        assert client.get("/api/imagery/cambridge-bay?date=bad").status_code == 422
        assert client.get("/api/imagery/cambridge-bay?date=2000-01-01").status_code == 422
        assert client.get("/api/imagery/cambridge-bay?date=2999-01-01").status_code == 422
