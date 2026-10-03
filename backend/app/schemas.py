"""Stable response models for the Polaris site API."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


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
    durability_score: int = Field(ge=0, le=100)
    trend_summary: str = Field(min_length=1, max_length=280)
    trend_series: list[TrendPoint] = Field(min_length=2)
    current_rcm_note: str = Field(min_length=1, max_length=280)


class SitesResponse(BaseModel):
    """The single public response shape consumed by the frontend."""

    updated: datetime
    sites: list[Site]
