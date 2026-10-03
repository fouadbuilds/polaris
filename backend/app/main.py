"""FastAPI application entry point."""

from datetime import date

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.repositories.sites import get_sites
from app.schemas import SitesResponse
from app.imagery import imagery_service

app = FastAPI(
    title="Polaris API",
    version="0.1.0",
    description="Read-only prototype API for Northwest Passage port-site comparisons.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=[],
)


@app.get("/health")
def health_check() -> dict[str, str]:
    """Provide a lightweight process health check."""

    return {"status": "ok"}


@app.get("/api/sites", response_model=SitesResponse)
def list_sites() -> SitesResponse:
    """Return candidate sites and the trends that explain their scores."""

    return get_sites()


@app.get("/api/imagery/{site_id}")
def site_imagery(site_id: str, date: date):
    """Return a cached preview of the latest acquisition on/before the chosen date."""
    return imagery_service.get(site_id, date)
