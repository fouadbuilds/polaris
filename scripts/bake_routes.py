"""Bundle researched Canadian logistics corridors as schematic GeoJSON.

Waypoints are hand placed for a dashboard overview, not AIS or navigation data.
Run without network access: backend/.venv/bin/python scripts/bake_routes.py.
"""
import json
import heapq
import math
from pathlib import Path

import numpy as np
from shapely import contains_xy
from shapely.geometry import shape, LineString
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    'resolute': {'title': 'Government of Nunavut · Resolute Bay community and High Arctic gateway', 'url': 'https://www.gov.nu.ca/en/communities/resolute-bay'},
    'research-hub': {'title': 'NRCan · existing Arctic logistics hub at Resolute Bay', 'url': 'https://natural-resources.canada.ca/corporate/transparency/polar-continental-shelf-program-renewal'},
    'kugluktuk': {'title': 'Government of Nunavut · Kugluktuk community', 'url': 'https://www.gov.nu.ca/en/communities/kugluktuk'},
    'airport': {'title': 'Nunavut · new Kugluktuk air terminal opened June 2025', 'url': 'https://www.gov.nu.ca/en/newsroom/kugluktuk-naujaat-and-whale-cove-open-new-air-terminal-buildings-2025-06-18'},
    'geography': {'title': 'DRDC Canadian Arctic shipping routes · Table 2-2 (2013)', 'url': 'https://publications.gc.ca/collections/collection_2016/rddc-drdc/D68-3-065-2013-eng.pdf'},
    'transits': {'title': 'Northwest Passage transit records · through 2025', 'url': 'https://thenorthwestpassage.info/transit-statistics'},
    'cargo': {'title': 'Recorded NWP cargo transits · through 2025', 'url': 'https://thenorthwestpassage.info/wp-content/uploads/2026/01/NWP-2025-Transits-Cargo.pdf'},
    'neas': {'title': 'NEAS Arctic resupply service areas', 'url': 'https://neas.ca/sealift-reservation-options/'},
    'mts': {'title': 'GNWT Marine Transportation Services', 'url': 'https://www.inf.gov.nt.ca/en/MTS'},
    'schedule': {'title': 'MTS 2026 sailing schedule', 'url': 'https://www.inf.gov.nt.ca/en/MTS/schedule-and-cargo-dates'},
    'churchill': {'title': 'Port of Churchill · Europe-bound grain shipment, August 2026', 'url': 'https://www.arcticgateway.com/agg-news/newsroom/first-grain-export-since-2020-loaded-at-port-of-churchill-bound-for-europe'},
    'grays': {'title': 'NIRB · Grays Bay Road and Port active review', 'url': 'https://www.nirb.ca/portal/pdash.php?appid=125987'},
    'proposal': {'title': 'Grays Bay proposal · port and road endpoints, Table 1.1 (2024)', 'url': 'https://new.reviewboard.ca/sites/default/files/project_document/240812-24xn038-project-proposal-ir1e.pdf'},
}
# Lat/lon waypoints. Shared passage legs are reused by potential connectors.
BERING = [[66, -168.5], [69.5, -165], [71.8, -157], [71.5, -145], [71.1, -135], [70.5, -128]]
WEST = [[70.5, -128], [70.1, -123], [69.4, -119], [69.1, -116], [68.7, -113], [68.4, -110.5], [68.75, -107], [69.05, -104], [68.65, -100.5]]
SOUTH = [[68.65, -100.5], [69.4, -100], [70.2, -99.1], [70.9, -97.6], [71.9, -95.7], [73.2, -95.4], [74.2, -96]]
EAST = [[74.2, -96], [74.4, -91], [74.25, -85], [74.1, -80], [73.5, -75], [71.5, -68], [68, -61], [63, -55], [60, -50]]
GRAYS = [67.8052253, -110.8709183]


def coast_aligned_display(routes):
    """Avoid drawing sea lines through land, purely for display.

    A coarse water mask steers segments between the hand-placed waypoints.
    No depth, ice, vessel, legal access or commercial optimization is included.
    Port endpoints are snapped to adjacent water in this approximate display.
    """
    land_data = json.loads((ROOT / 'frontend/public/data/world-land.geojson').read_text())
    land = unary_union([shape(item['geometry']) for item in land_data['features']])
    step, west, south = 0.04, -171, 48
    xs = np.arange(west, -23, step)
    ys = np.arange(south, 77, step)
    water = ~contains_xy(land, xs[None, :], ys[:, None])
    height, width = water.shape
    saved = {}

    def snap(point):
        col, row = round((point[0] - west) / step), round((point[1] - south) / step)
        for radius in range(31):
            candidates = [(r, c) for r in range(max(0, row-radius), min(height, row+radius+1))
                          for c in range(max(0, col-radius), min(width, col+radius+1)) if water[r, c]]
            if candidates:
                return min(candidates, key=lambda cell: (cell[0]-row)**2 + ((cell[1]-col)*math.cos(math.radians(point[1])))**2)
        raise ValueError(f'No adjacent water at {point}')

    def leg(start, finish):
        key = tuple(sorted([start, finish]))
        if key in saved:
            path = saved[key]
            return path if path[0] == start else list(reversed(path))
        longitude_scale = math.cos(math.radians(south + (start[0] + finish[0]) * step / 2))
        def distance(cell):
            return math.hypot(cell[0] - finish[0], (cell[1] - finish[1]) * longitude_scale)
        queue, costs, previous = [(distance(start), 0, start)], {start: 0}, {}
        margin = 150  # Six degrees of surrounding geography for display detours.
        while queue:
            _, cost, current = heapq.heappop(queue)
            if cost != costs[current]:
                continue
            if current == finish:
                path = [finish]
                while path[-1] != start:
                    path.append(previous[path[-1]])
                path.reverse()
                saved[key] = path
                return path
            row, col = current
            for dr, dc in [(0,1),(0,-1),(1,0),(-1,0),(1,1),(1,-1),(-1,1),(-1,-1)]:
                r, c = row+dr, col+dc
                if not (0 <= r < height and 0 <= c < width and water[r,c]):
                    continue
                if not (min(start[0],finish[0])-margin <= r <= max(start[0],finish[0])+margin and min(start[1],finish[1])-margin <= c <= max(start[1],finish[1])+margin):
                    continue
                if dr and dc and not (water[row,c] and water[r,col]):
                    continue
                candidate = (r,c)
                next_cost = cost + math.hypot(dr, dc*longitude_scale)
                if next_cost < costs.get(candidate, math.inf):
                    costs[candidate], previous[candidate] = next_cost, current
                    heapq.heappush(queue, (next_cost + distance(candidate), next_cost, candidate))
        raise ValueError(f'No display water connection between {start} and {finish}')

    for route in routes:
        if route['properties']['id'] in {'grays-road', 'grays-yellowknife'}:
            continue
        cells = [snap(point) for point in route['geometry']['coordinates']]
        path = []
        for first, second in zip(cells, cells[1:]):
            path.extend(leg(first, second)[:-1])
        path.append(cells[-1])
        original = LineString([[west + col*step, south + row*step] for row,col in path])
        line = original.simplify(0.025)
        if line.intersection(land).length >= 0.05:
            line = original.simplify(0.009)
        # Round display corners with quadratic curves only where their samples
        # remain outside land. This changes presentation, not route feasibility.
        points = list(line.coords)
        for _ in range(2):
            rounded = [points[0]]
            for previous, current, following in zip(points, points[1:], points[2:]):
                entry = tuple(0.25*a + 0.75*b for a,b in zip(previous,current))
                exit = tuple(0.75*a + 0.25*b for a,b in zip(current,following))
                curve = [tuple((1-t)**2*a + 2*(1-t)*t*b + t*t*c for a,b,c in zip(entry,current,exit)) for t in np.linspace(0,1,5)]
                if LineString(curve).intersects(land):
                    rounded.append(current)
                else:
                    rounded.extend(curve)
            rounded.append(points[-1])
            candidate = LineString(rounded)
            if candidate.intersection(land).length >= 0.05:
                break
            points = rounded
        line = LineString(points)
        route['geometry']['coordinates'] = [list(point) for point in line.coords]
        route['properties']['geometry_method'] += ' Sea segments follow an approximate land mask, with rounded display corners where the coast allows; no depth or ice routing is performed.'


def feature(id, name, category, summary, cargo, season, waypoints, constraints, source_ids, positions):
    return {'type': 'Feature', 'properties': {
        'id': id, 'name': name, 'category': category,
        'status': {'passage': 'Documented passage · ice constrained', 'used': 'Used logistics corridor · seasonal', 'proposed': 'Published port project · illustrative connection', 'team': 'Team port concept · illustrative connection only'}[category],
        'summary': summary, 'cargo': cargo, 'season': season, 'waypoints': waypoints,
        'constraints': constraints, 'sources': [SOURCES[key] for key in source_ids],
        'geometry_method': 'Hand-placed schematic waypoints; not AIS tracks, official corridor boundaries or a navigational chart.',
    }, 'geometry': {'type': 'LineString', 'coordinates': [[lon, lat] for lat, lon in positions]}}


def main():
    routes = [
        feature('resolute-feeder', 'Resolute Bay concept → Lancaster Sound', 'team',
                'Team study idea: a community-adjacent logistics port feeding Lancaster Sound. Published sources establish an existing community and research hub, not an approved port or shipping service.',
                'Potential community supplies, research freight and emergency support.', 'Conditional research concept; no operating season or opening date forecast.',
                ['Resolute Bay community', 'Barrow Strait', 'Lancaster Sound'],
                ['Community-led planning and conservation requirements.', 'Depth, ice thickness, handling and fuel storage need study.'],
                ['resolute', 'research-hub'], [[74.7, -94.8667], [74.5, -94.5], [74.4, -91], [74.25, -85], [74.1, -80]]),
        feature('kugluktuk-feeder', 'Kugluktuk concept → Coronation Gulf', 'team',
                'Team study idea: improve marine resupply beside the existing community, with an airport connection for staff and food. The schematic joins a study candidate to Coronation Gulf; it is not a new carrier service.',
                'Potential food, community dry cargo and safely handled bulk fuel.', 'Conditional research concept; reduced regional ice alone does not establish access.',
                ['Kugluktuk community', 'Coronation Gulf', 'Western passage corridor'],
                ['Shallow approaches, river sediment and bathymetry.', 'Community priorities, handling infrastructure and fuel permits.'],
                ['kugluktuk', 'airport'], [[67.8274, -115.0965], [68.15, -115.1], [68.5, -114], [68.7, -113]]),
        feature('nwp-victoria', 'Northwest Passage · Victoria Strait', 'passage',
                'Southern passage variant (3A) through the Canadian archipelago. Recorded NWP transits do not establish a regular container service on this specific line.',
                'Bulk and general cargo have transited the NWP; this corridor is not a carrier timetable.',
                'Access varies by vessel and year; no fixed opening date.',
                ['Bering Strait', 'Beaufort Sea', 'Amundsen Gulf', 'Coronation Gulf', 'Dease Strait', 'Queen Maud Gulf', 'Victoria Strait', 'Peel Sound', 'Barrow Strait', 'Lancaster Sound', 'Baffin Bay', 'Atlantic'],
                ['Shallow coastal reaches and narrow channels.', 'Ice can remain in choke points even when regional mean concentration falls.', 'Individual vessel suitability requires separate assessment.'],
                ['geography', 'cargo'], BERING + WEST[1:] + SOUTH[1:] + EAST[1:]),
        feature('nwp-prince-wales', 'Northwest Passage · Prince of Wales', 'passage',
                'Northern passage variant (1) using Viscount Melville Sound and Prince of Wales Strait. A mapped corridor, not a year-round trade lane.',
                'Atlantic–Pacific transit corridor.', 'Ice conditions may prevent a complete transit in a given season.',
                ['Beaufort Sea', 'Amundsen Gulf', 'Prince of Wales Strait', 'Viscount Melville Sound', 'Barrow Strait', 'Lancaster Sound', 'Baffin Bay'],
                ['Multi-year ice can affect northern channels.', 'Narrow strait and limited support infrastructure.'],
                ['geography', 'transits'], BERING + [[70.5, -123], [71.25, -119], [72.05, -118], [72.9, -117.3], [73.7, -115], [74.1, -110], [74.3, -103], [74.2, -96]] + EAST[1:]),
        feature('nwp-rae-simpson', 'Northwest Passage · Rae / Simpson', 'passage',
                'Southern variant (3B) east and south of King William Island, near Gjoa Haven.',
                'Shallow-draft passage alternative.', 'Seasonal and strongly vessel dependent.',
                ['Queen Maud Gulf', 'Simpson Strait', 'Rae Strait', 'James Ross Strait', 'Larsen Sound', 'Peel Sound', 'Lancaster Sound'],
                ['Shoals, narrow channels and draft restrictions.', 'Not interchangeable with deeper passage variants.'],
                ['geography', 'transits'], BERING + WEST[1:] + [[68.45, -98.5], [68.45, -97.2], [68.55, -95.9], [68.9, -94.7], [69.5, -95.4], [70, -96.6]] + SOUTH[3:] + EAST[1:]),
        feature('eastern-sealift', 'Québec → Baffin / Kitikmeot sealift', 'used',
                'NEAS lists Pond Inlet, Resolute Bay, Cambridge Bay, Gjoa Haven and other Arctic communities as service areas. This line illustrates the sea connection, not a published voyage itinerary.',
                'Community supplies, equipment and project freight.', 'Seasonal sealift; sailing calls and order vary by operator and year.',
                ['Québec loading ports (off-map)', 'Gulf of St Lawrence', 'Labrador Sea', 'Baffin Bay', 'Pond Inlet / Lancaster Sound', 'Southern NWP', 'Cambridge Bay'],
                ['Local unloading facilities and vessel draft.', 'Ice-dependent sailing schedules; not every voyage follows every stop shown.'],
                ['neas'], [[50, -62.5], [51.5, -56.5], [57, -55], [63, -57], [68, -61], [71.5, -68], [73.5, -75], [74.1, -80], [74.25, -85], [74.4, -91], [74.2, -96]] + list(reversed(SOUTH[:-1])) + [[68.8, -104.3], [69.1167, -105.0583]]),
        feature('western-resupply', 'Tuktoyaktuk → western Arctic resupply', 'used',
                'MTS supplies Western Arctic communities with deck cargo and petroleum. The coastal sketch connects Tuktoyaktuk, Paulatuk and Kugluktuk; it omits individual delivery calls.',
                'Deck cargo and bulk fuel.', 'Annual scheduled service; consult the current sailing schedule.',
                ['Tuktoyaktuk', 'Amundsen Gulf', 'Paulatuk', 'Dolphin and Union Strait', 'Kugluktuk'],
                ['Weather, ice and unloading access.', 'Do not infer a current MTS Cambridge Bay service from this line.'],
                ['mts', 'schedule'], [[69.45, -133.04], [70.2, -131], [70.4, -127], [70.1, -124], [69.35, -124.1], [70.1, -122], [69.4, -119], [69.1, -116], [68.7, -113], [67.83, -115.1]]),
        feature('churchill-atlantic', 'Churchill → Atlantic / Europe', 'used',
                'Churchill announced a Europe-bound grain loading in August 2026. The port links Canadian inland freight with international markets; the European endpoint here is only a gateway.',
                'Grain and other bulk exports; northern resupply.', 'Current corridor is shown as seasonal, without assuming year-round operation.',
                ['Hudson Bay Railway (off-map)', 'Churchill', 'Hudson Bay', 'Hudson Strait', 'Labrador Sea', 'North Atlantic'],
                ['Rail and port handling capacity.', 'Ice and voyage schedules; this is not a Northwest Passage crossing.'],
                ['churchill'], [[58.77, -94.17], [59.5, -91], [61, -85], [62, -79], [62.8, -76], [62.2, -72], [61.5, -66], [60.8, -61], [58, -52], [55, -40], [53, -25]]),
        feature('grays-west', 'Grays Bay → Pacific connection', 'proposed',
                'Potential feeder from the proposed port to the western NWP and Bering Strait. This is our logistics concept, not an announced Asia shipping service.',
                'Potential mineral exports and inbound project / community supplies.', 'No opening year assigned; depends on the port project and voyage conditions.',
                ['Grays Bay', 'Coronation Gulf', 'Dolphin and Union Strait', 'Amundsen Gulf', 'Beaufort Sea', 'Bering Strait', 'Pacific / East Asia (off-map)'],
                ['Port approval, construction and cargo commitments.', 'Shallow coastal passages may constrain bulk-vessel draft.', 'Distance alone does not establish commercial viability.'],
                ['grays', 'proposal'], [GRAYS, [68.15, -110.8], [68.4, -110.5]] + list(reversed(WEST[:5])) + list(reversed(BERING[:-1]))),
        feature('grays-east', 'Grays Bay → Atlantic connection', 'proposed',
                'Potential feeder east through the southern NWP. This is an inferred connection to markets, not a committed carrier route.',
                'Potential mineral exports and inbound supplies.', 'No fixed season or start date demonstrated.',
                ['Grays Bay', 'Coronation Gulf', 'Dease Strait', 'Queen Maud Gulf', 'Victoria Strait', 'Peel Sound', 'Lancaster Sound', 'Atlantic'],
                ['Project delivery and suitable ships.', 'The southern NWP contains draft restrictions and ice choke points.'],
                ['grays', 'proposal'], [GRAYS, [68.15, -110.8], [68.4, -110.5]] + WEST[6:] + SOUTH[1:] + EAST[1:]),
        feature('grays-road', 'Grays Bay ↔ Jericho road', 'proposed',
                'The project proposes an approximately 230 km all-season road to Jericho Station. This straight line joins the published endpoints; it is not the surveyed road alignment.',
                'Land–sea transfer of mineral and supply freight.', 'Proposed all-season road; the associated marine operation remains ice dependent.',
                ['Grays Bay port', 'Jericho Station'],
                ['Environmental review, financing and construction.', 'Existing winter-road linkage does not equal a completed all-season route to southern Canada.'],
                ['grays', 'proposal'], [GRAYS, [66.0068275, -111.4657294]]),
        feature('grays-yellowknife', 'Yellowknife ↔ Port of Grays Bay · proposed all-season road', 'proposed',
                'Suggested all-season road shown in the supplied presentation, connecting Yellowknife with Port of Grays Bay. The line follows the slide schematically; it is not a surveyed alignment or a completed road.',
                'Potential overland supply and freight connection to the proposed port.',
                'Suggested all-season connection; no opening date is established by the presentation.',
                ['Yellowknife', 'Port of Grays Bay'],
                ['The presentation provides a concept sketch, not an engineered alignment.', 'The broader Yellowknife connection is separate from the published approximately 230 km Grays Bay–Jericho road project.'],
                ['grays', 'proposal'], [[62.454, -114.377], [62.85, -113.6], [63.5, -113.3], [64.15, -113.05], [64.65, -111.8], [64.9, -110.8], [65.35, -110.7], [65.85, -111.45], [66.4, -111.1], [67.1, -110.9], GRAYS]),
    ]
    presentation_route = next(route for route in routes if route['properties']['id'] == 'grays-yellowknife')
    presentation_route['properties']['presentation_source'] = '/data/yellowknife-grays-bay-presentation.png'
    coast_aligned_display(routes)
    output = {'type': 'FeatureCollection', 'metadata': {
        'title': 'Canadian Arctic trade and logistics corridors', 'researched_on': '2026-10-03',
        'geometry_method': 'Hand-placed schematic waypoints; broad corridor geography only. Not AIS tracks or official navigation guidance.',
        'time_relationship': 'Route visibility is independent of the ice-map year and season. Showing a corridor does not certify access in the selected year.',
        'scope': 'Canada and the Northwest Passage. Grays Bay market connectors are inferred concepts, not approved services.',
    }, 'features': routes}
    target = ROOT / 'frontend/public/data/routes-canada.geojson'
    target.write_text(json.dumps(output, separators=(',', ':')) + '\n')
    print(f'Saved {len(routes)} researched schematic corridors to {target.name}')


if __name__ == '__main__':
    main()
