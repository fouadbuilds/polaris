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
    assert len(body["sites"]) == 3
    first_site = body["sites"][0]
    assert 0 <= first_site["durability_score"] <= 100
    assert len(first_site["trend_series"]) >= 2
    assert "RCM scene" in first_site["current_rcm_note"]
    assert first_site["selection_rationale"]
    assert first_site["selection_source_url"].startswith("https://")


def test_api_only_allows_the_local_frontend_origin() -> None:
    response = client.get(
        "/api/sites", headers={"Origin": "http://localhost:5173"}
    )

    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
