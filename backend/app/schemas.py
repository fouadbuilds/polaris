"""Stable response models for the Polaris site API."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class TrendPoint(BaseModel):
    """One annual observation used to explain a durability score."""

    year: int = Field(ge=1900, le=2200)
    ice_extent_pct: float = Field(ge=0, le=100)


class Site(BaseModel):
    """A prototype port candidate and its supporting trend information."""

    model_config = ConfigDict(frozen=True)

    id: str = Field(pattern=r"^[a-z0-9-]+$")
    name: str = Field(min_length=1, max_length=100)
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    durability_score: int | None = Field(default=None, ge=0, le=100)
    trend_summary: str = Field(min_length=1, max_length=280)
    trend_series: list[TrendPoint] = Field(default_factory=list)
    current_rcm_note: str = Field(min_length=1, max_length=280)
    selection_rationale: str = Field(min_length=1, max_length=360)
    selection_source_url: HttpUrl
    project_status: str | None = Field(default=None, max_length=100)
    port_category: Literal['current', 'proposed', 'team'] = 'current'
    location_source_url: HttpUrl | None = None
    logistics_note: str = Field(default="Community resupply remains seasonal and dependent on vessel access; verify local handling and storage capacity.", max_length=650)
    marker_note: str = Field(default="Approximate community location, not a surveyed berth or proposed construction footprint.", max_length=300)


class SitesResponse(BaseModel):
    """The single public response shape consumed by the frontend."""

    updated: datetime
    sites: list[Site]
