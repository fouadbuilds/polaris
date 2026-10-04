"""Sourced port catalogue with obsolete illustrative scores retained.

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
                project_status="Existing harbour · community resupply",
                logistics_note="Existing community harbour serves commercial barges and cruise vessels. Community proximity supports local handling; vessel access and harbour constraints still apply.",
                lat=69.1167,
                lon=-105.0583,
                durability_score=78,
                trend_summary="Multi-year decline with comparatively low seasonal volatility.",
                trend_series=[
                    TrendPoint(year=2015, ice_extent_pct=87),
                    TrendPoint(year=2018, ice_extent_pct=76),
                    TrendPoint(year=2021, ice_extent_pct=63),
                    TrendPoint(year=2024, ice_extent_pct=51),
                ],
                current_rcm_note="A site-specific RCM scene has not yet been selected from released mission products.",
                selection_rationale="Included for its existing marine use: a federal review describes Cambridge Bay harbour as serving cruise ships and commercial barges, with vessel access constraints.",
                selection_source_url="https://tc.canada.ca/sites/default/files/migrated/tc_tanker_e_p2.pdf",
            ),
            Site(
                id="gjoa-haven",
                name="Gjoa Haven",
                project_status="Existing community marine facilities",
                lat=68.6356,
                lon=-95.8781,
                durability_score=64,
                trend_summary="Downward trend with several recent year-to-year fluctuations.",
                trend_series=[
                    TrendPoint(year=2015, ice_extent_pct=91),
                    TrendPoint(year=2018, ice_extent_pct=80),
                    TrendPoint(year=2021, ice_extent_pct=73),
                    TrendPoint(year=2024, ice_extent_pct=61),
                ],
                current_rcm_note="A site-specific RCM scene has not yet been selected from released mission products.",
                selection_rationale="Included because Transport Canada funded marine-safety infrastructure work including mooring bollards for Gjoa Haven through the Oceans Protection Plan.",
                selection_source_url="https://www.canada.ca/en/transport-canada/news/2018/12/government-of-canada-delivers-marine-safety-infrastructure-to-nunavut-through-the-oceans-protection-plan.html",
            ),
            Site(
                id="pond-inlet",
                name="Pond Inlet",
                project_status="Existing community harbour · opened 2022",
                lat=72.6997,
                lon=-77.9597,
                durability_score=46,
                trend_summary="Decline that remains less consistent across the observed periods.",
                trend_series=[
                    TrendPoint(year=2015, ice_extent_pct=94),
                    TrendPoint(year=2018, ice_extent_pct=86),
                    TrendPoint(year=2021, ice_extent_pct=88),
                    TrendPoint(year=2024, ice_extent_pct=74),
                ],
                current_rcm_note="A site-specific RCM scene has not yet been selected from released mission products.",
                selection_rationale="The Government of Nunavut announced the community harbour opening in July 2022, including a small-craft harbour and improved resupply facilities next to the community.",
                selection_source_url="https://www.gov.nu.ca/en/newsroom/pond-inlet-community-harbour-2022-07-26",
            ),
            Site(
                id="grays-bay",
                port_category="proposed",
                name="Grays Bay Port",
                # Approximate proposed wharf location, proposal Table 1.1 (2024).
                lat=67 + 48 / 60 + 18.811 / 3600,
                lon=-(110 + 52 / 60 + 15.306 / 3600),
                project_status="Proposed port · environmental review",
                trend_summary="Proposed deepwater port on the south shore of Coronation Gulf, linked to Jericho Station by a planned 230 km all-season road.",
                current_rcm_note="A site-specific RCM scene has not yet been selected from released mission products.",
                selection_rationale="Included as an actual proposed Arctic cargo port. The Nunavut Impact Review Board lists the Grays Bay Road and Port project in active review. The marker uses the approximate proposed wharf location in Table 1.1 of the August 2024 project proposal.",
                selection_source_url="https://www.nirb.ca/portal/pdash.php?appid=125987",
                location_source_url="https://new.reviewboard.ca/sites/default/files/project_document/240812-24xn038-project-proposal-ir1e.pdf",
                marker_note="Approximate proposed wharf coordinate from proposal Table 1.1, August 2024.",
                logistics_note="Remote proposed site, retained because it is a documented project, not a new suggested location. Its planned 230 km road to Jericho Station is not a completed connection to southern Canada; food, fuel, workforce and construction supply logistics require assessment.",
            ),
            Site(
                id="iqaluit", name="Iqaluit Deep Sea Port", lat=63.7467, lon=-68.5170,
                project_status="Existing deep-sea port · opened 2023",
                trend_summary="Existing community resupply port in Nunavut's capital.",
                current_rcm_note="A site-specific RCM scene has not yet been selected from released mission products.",
                selection_rationale="Nunavut announced the port opening on 25 July 2023. This is existing infrastructure serving Iqaluit, rather than a hypothetical site selected from regional ice decline.",
                selection_source_url="https://www.gov.nu.ca/en/newsroom/iqaluit-deep-sea-port-officially-opens-2023-07-25",
                logistics_note="Located by Nunavut's capital and its existing local services. Marine cargo can support community supplies; there is no southern all-season road connection. Berth, storage and seasonal vessel schedules need separate assessment.",
            ),
            Site(
                id="churchill", name="Port of Churchill", lat=58.768, lon=-94.175,
                project_status="Existing deep-water port · rail connection",
                trend_summary="Hudson Bay export and supply gateway with an existing railway.",
                current_rcm_note="A site-specific RCM scene has not yet been selected from released mission products.",
                selection_rationale="Arctic Gateway Group operates the Port of Churchill and identifies its rail connection and commodity handling services. Useful as an existing gateway comparator, not an interoceanic passage guarantee.",
                selection_source_url="https://www.arcticgateway.com/port-of-churchill",
                logistics_note="Adjacent to Churchill with the Hudson Bay Railway connecting to the southern rail network. Rail supports incoming supplies and outgoing cargo; Hudson Bay seasonality and service reliability still matter.",
            ),
            Site(
                id="tuktoyaktuk", name="Tuktoyaktuk Marine Terminal", lat=69.445, lon=-133.037,
                project_status="Existing terminal · Western Arctic resupply",
                trend_summary="Existing Western Arctic cargo and fuel supply hub.",
                current_rcm_note="A site-specific RCM scene has not yet been selected from released mission products.",
                selection_rationale="GNWT documents cargo transfers through its Tuktoyaktuk terminal and MTS deliveries of deck cargo and petroleum to Western Arctic communities.",
                selection_source_url="https://www.gov.nt.ca/en/newsroom/vince-mckay-update-2025-marine-transportation-services-operations",
                logistics_note="Located at Tuktoyaktuk, connected to Inuvik by the all-season highway. Existing terminal operations handle regional cargo and fuel, but shallow approaches, weather and seasonal marine access require assessment.",
                location_source_url="https://www.inf.gov.nt.ca/en/MTS",
            ),
            Site(
                id="qikiqtarjuaq", name="Qikiqtarjuaq Proposed Deep Sea Port", lat=67.558, lon=-64.029, port_category="proposed",
                project_status="Proposed deep-sea port · community location",
                trend_summary="Published community-adjacent proposal for fisheries and regional resupply.",
                current_rcm_note="A site-specific RCM scene has not yet been selected from released mission products.",
                selection_rationale="Transport Canada announced funding in 2021 for a deep-water port at Qikiqtarjuaq supporting fisheries and local resupply. Nunavut's 2026–2030 business plan still lists it as a priority project; this marker does not assert completion.",
                selection_source_url="https://www.canada.ca/en/transport-canada/news/2021/08/government-of-canada-invests-in-transportation-infrastructure-in-nunavut.html",
                location_source_url="https://www.gov.nu.ca/sites/default/files/documents/2026-05/2026-2030_Business_Plans_-_ENG.pdf",
                logistics_note="Published proposal at an existing community, rather than an isolated invented site. Fisheries offloading and local resupply are stated uses; construction status, fuel storage, utilities, workforce and final berth location must be verified.",
            ),
            Site(
                id="resolute-concept", name="Resolute Bay · team port concept", port_category="team",
                project_status="Team research concept · not an approved project", lat=74.7, lon=-94.8667,
                trend_summary="No site-specific feasibility or ice-access forecast has been established.",
                current_rcm_note="No site-specific RCM scene selected.",
                selection_rationale="Team inference: investigate a community-adjacent logistics port near Lancaster Sound if future access improves. Nunavut identifies Resolute as a High Arctic gateway; NRCan already operates an Arctic logistics hub here. These sources do not endorse our port concept.",
                selection_source_url="https://www.gov.nu.ca/en/communities/resolute-bay",
                location_source_url="https://natural-resources.canada.ca/corporate/transparency/polar-continental-shelf-program-renewal",
                logistics_note="Existing community, airport and research logistics hub could support staff, supplies and emergency response. Study fuel storage and safe handling, berth depths, thick-ice choke points, conservation requirements and community priorities before proposing a site.",
                marker_note="Approximate Resolute community centre. Team concept only; no surveyed berth, engineering assessment or community endorsement.",
            ),
            Site(
                id="kugluktuk-concept", name="Kugluktuk · team port concept", port_category="team",
                project_status="Team research concept · not an approved project", lat=67.8274, lon=-115.0965,
                trend_summary="No site-specific feasibility or ice-access forecast has been established.",
                current_rcm_note="No site-specific RCM scene selected.",
                selection_rationale="Team inference: investigate a community-adjacent resupply port on Coronation Gulf if access improves. Nunavut documents Kugluktuk's airport and opened a new air terminal in 2025. This supports a logistics study, not a claim of port feasibility.",
                selection_source_url="https://www.gov.nu.ca/en/communities/kugluktuk",
                location_source_url="https://www.gov.nu.ca/en/newsroom/kugluktuk-naujaat-and-whale-cove-open-new-air-terminal-buildings-2025-06-18",
                logistics_note="Research candidate beside the existing community. Airport and local services offer a starting point for staff and food delivery; bulk fuel still needs marine access, safe storage and permits. Check shallow approaches, river sediment, winter ice and community priorities.",
                marker_note="Approximate Kugluktuk community centre. Team concept only; no surveyed berth, engineering assessment or community endorsement.",
            ),
        ],
    )
