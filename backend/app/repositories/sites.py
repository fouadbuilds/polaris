"""Temporary fixture repository.

Replace this module with a processed-data repository when the historical and
RCM pipelines are available. The API and frontend should not need to change.
"""

from datetime import datetime, timezone

from app.schemas import Site, SitesResponse, TrendPoint


def get_sites() -> SitesResponse:
    """Return illustrative prototype candidates in the public API shape."""

    return SitesResponse(
        updated=datetime.now(timezone.utc),
        sites=[
            Site(
                id="cambridge-bay",
                name="Cambridge Bay",
                lat=69.1167,
                lon=-105.0583,
                durability_score=78,
                trend_summary="Illustrative multi-year decline with comparatively low seasonal volatility.",
                trend_series=[
                    TrendPoint(year=2015, ice_extent_pct=87),
                    TrendPoint(year=2018, ice_extent_pct=76),
                    TrendPoint(year=2021, ice_extent_pct=63),
                    TrendPoint(year=2024, ice_extent_pct=51),
                ],
                current_rcm_note="Prototype only — RCM current-state detail has not been integrated.",
            ),
            Site(
                id="gjoa-haven",
                name="Gjoa Haven",
                lat=68.6356,
                lon=-95.8781,
                durability_score=64,
                trend_summary="Illustrative downward trend with several recent year-to-year fluctuations.",
                trend_series=[
                    TrendPoint(year=2015, ice_extent_pct=91),
                    TrendPoint(year=2018, ice_extent_pct=80),
                    TrendPoint(year=2021, ice_extent_pct=73),
                    TrendPoint(year=2024, ice_extent_pct=61),
                ],
                current_rcm_note="Prototype only — RCM current-state detail has not been integrated.",
            ),
            Site(
                id="pond-inlet",
                name="Pond Inlet",
                lat=72.6997,
                lon=-77.9597,
                durability_score=46,
                trend_summary="Illustrative decline that remains less consistent across the observed periods.",
                trend_series=[
                    TrendPoint(year=2015, ice_extent_pct=94),
                    TrendPoint(year=2018, ice_extent_pct=86),
                    TrendPoint(year=2021, ice_extent_pct=88),
                    TrendPoint(year=2024, ice_extent_pct=74),
                ],
                current_rcm_note="Prototype only — RCM current-state detail has not been integrated.",
            ),
        ],
    )
