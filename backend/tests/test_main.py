from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_list_sites_matches_the_public_contract() -> None:
    response = client.get("/api/sites")
    body = response.json()

    assert response.status_code == 200
    assert len(body["sites"]) == 10
    assert {site['id'] for site in body['sites'] if site['port_category'] == 'team'} == {'resolute-concept', 'kugluktuk-concept'}
    assert {site['id'] for site in body['sites']} >= {'iqaluit', 'churchill', 'tuktoyaktuk', 'qikiqtarjuaq'}
    for site in body['sites']:
        assert site['logistics_note'] and site['marker_note']
        assert site['selection_source_url'].startswith('https://')
    first_site = body["sites"][0]
    assert 0 <= first_site["durability_score"] <= 100
    assert len(first_site["trend_series"]) >= 2
    assert "RCM scene" in first_site["current_rcm_note"]
    assert first_site["selection_rationale"]
    assert first_site["selection_source_url"].startswith("https://")
    grays_bay = next(site for site in body["sites"] if site['id'] == 'grays-bay')
    assert abs(grays_bay['lat'] - 67.8052253) < 0.000001
    assert abs(grays_bay['lon'] - -110.8709183) < 0.000001
    assert grays_bay['durability_score'] is None
    assert grays_bay['trend_series'] == []
    assert 'Proposed' in grays_bay['project_status']


def test_api_only_allows_the_local_frontend_origin() -> None:
    response = client.get(
        "/api/sites", headers={"Origin": "http://localhost:5173"}
    )

    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
