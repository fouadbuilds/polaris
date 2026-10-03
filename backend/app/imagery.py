"""Small, bounded Sentinel-2 previews; credentials never leave the backend."""

import base64
import hashlib
import json
from collections import OrderedDict
from datetime import date, datetime, timedelta, timezone
import math
import os
from pathlib import Path
from threading import Lock
import time
import uuid

from dotenv import load_dotenv
from fastapi import HTTPException
import httpx

from app.repositories.sites import get_sites

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
API_URL = "https://sh.dataspace.copernicus.eu/api/v1"
EVALSCRIPT = """//VERSION=3
function setup() {
  return {input: ["B04", "B03", "B02", "dataMask"], output: {bands: 4}};
}
function evaluatePixel(s) {
  return [2.5 * s.B04, 2.5 * s.B03, 2.5 * s.B02, s.dataMask];
}
"""


def preview_bounds(lat: float, lon: float):
    """A square in Web Mercator aligns with Leaflet's image overlay."""
    radius = 6378137
    x = radius * math.radians(lon)
    y = radius * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
    half = 20000 / math.cos(math.radians(lat))
    bbox = [x - half, y - half, x + half, y + half]

    def inverse(px, py):
        return [math.degrees(2 * math.atan(math.exp(py / radius)) - math.pi / 2),
                math.degrees(px / radius)]

    return bbox, [inverse(bbox[0], bbox[1]), inverse(bbox[2], bbox[3])]


class ImageryService:
    def __init__(self, client=None, cache_dir=None):
        self.client = client or httpx.Client(timeout=60)
        self.cache_dir = Path(cache_dir) if cache_dir is not None else (
            Path(__file__).resolve().parents[2] / '.cache/imagery' if client is None else None)
        self.token = ""
        self.expires = 0.0
        self.cache = OrderedDict()
        self.lock = Lock()

    def access_token(self):
        if self.token and time.monotonic() < self.expires:
            return self.token
        client_id = os.getenv("COPERNICUS_CLIENT_ID", "")
        secret = os.getenv("COPERNICUS_CLIENT_SECRET", "")
        if not client_id or not secret or client_id.startswith("replace_") or secret.startswith("replace_"):
            raise HTTPException(503, "Satellite access is not configured. Add Copernicus credentials to backend/.env and restart the API.")
        response = self.client.post(TOKEN_URL, data={
            "grant_type": "client_credentials", "client_id": client_id, "client_secret": secret,
        })
        if response.status_code in (400, 401, 403):
            raise HTTPException(503, "Copernicus could not authenticate. Check the saved client credentials and expiry date.")
        self.check_response(response)
        body = response.json()
        self.token = body["access_token"]
        self.expires = time.monotonic() + max(0, int(body.get("expires_in", 300)) - 30)
        return self.token

    @staticmethod
    def check_response(response):
        if response.status_code == 429:
            raise HTTPException(429, "Copernicus usage limit reached. Wait before trying again.")
        if not response.is_success:
            # Upstream responses may contain request details; never relay them.
            raise HTTPException(502, "Copernicus could not provide imagery. Please try again later.")

    def post(self, path, payload):
        for attempt in range(2):
            response = self.client.post(f"{API_URL}/{path}", json=payload,
                                        headers={"Authorization": f"Bearer {self.access_token()}"})
            if response.status_code == 401 and attempt == 0:
                self.token = ""
                continue
            self.check_response(response)
            return response
        raise HTTPException(502, "Copernicus authentication failed.")

    def get(self, site_id: str, requested_date: date):
        site = next((s for s in get_sites().sites if s.id == site_id), None)
        if site is None:
            raise HTTPException(404, "Unknown candidate site.")
        if requested_date < date(2017, 3, 28) or requested_date > datetime.now(timezone.utc).date():
            raise HTTPException(422, "Choose a date from 28 March 2017 through today.")
        # Include rendering parameters and coordinates to invalidate previews
        # when the product or a candidate's location changes.
        signature = json.dumps([site_id, site.lat, site.lon, requested_date.isoformat(), EVALSCRIPT, 768, 'preview-v1'])
        key = hashlib.sha256(signature.encode()).hexdigest()
        # Serialise misses to avoid duplicate processing and unbounded parallel usage.
        with self.lock:
            cached = self.cache.get(key)
            if cached:
                self.cache.move_to_end(key)
                return cached
            path = self.cache_dir / f'{key}.json' if self.cache_dir else None
            if path and path.exists():
                try:
                    result = json.loads(path.read_text())
                    if result['site_id'] != site_id or result['requested_date'] != requested_date.isoformat() or not result['image_url'].startswith('data:image/png;base64,'):
                        raise ValueError('Invalid cached preview')
                    self.remember(key, result)
                    return result
                except (OSError, ValueError, KeyError, TypeError):
                    pass  # A damaged entry can be rebuilt; never return partial data.
            try:
                result = self.fetch(site, requested_date)
            except httpx.TimeoutException:
                raise HTTPException(504, "Satellite image request timed out. Please try again.") from None
            except (httpx.HTTPError, ValueError, KeyError, TypeError, IndexError):
                raise HTTPException(502, "Satellite imagery is temporarily unavailable. Please try again.") from None
            if path:
                # A successful historical snapshot is reusable across restarts.
                # Tokens and credentials are never written to this cache.
                temporary = path.with_suffix(f'.{uuid.uuid4().hex}.tmp')
                try:
                    path.parent.mkdir(parents=True, exist_ok=True)
                    temporary.write_text(json.dumps(result))
                    temporary.replace(path)
                except OSError:
                    pass  # Caching failures must not discard a successful image.
                finally:
                    try:
                        temporary.unlink(missing_ok=True)
                    except OSError:
                        pass
            self.remember(key, result)
            return result

    def remember(self, key, result):
        self.cache[key] = result
        self.cache.move_to_end(key)
        while len(self.cache) > 24:
            self.cache.popitem(last=False)

    def fetch(self, site, requested_date):
        start = requested_date - timedelta(days=29)
        search = {
            "collections": ["sentinel-2-l2a"],
            "intersects": {"type": "Point", "coordinates": [site.lon, site.lat]},
            "datetime": f"{start}T00:00:00Z/{requested_date}T23:59:59Z",
            "limit": 100,
        }
        scenes = []
        for _ in range(5):
            catalog = self.post("catalog/1.0.0/search", search).json()
            scenes.extend(catalog.get("features", []))
            next_page = catalog.get("context", {}).get("next")
            if next_page is None:
                break
            search["next"] = next_page
        else:
            raise HTTPException(502, "Too many acquisitions to select reliably. Try another date.")
        if not scenes:
            raise HTTPException(404, "No Sentinel-2 scene covers this site in the preceding 30 days. Try a summer date.")
        scene = max(scenes, key=lambda s: s["properties"]["datetime"])
        acquired = scene["properties"]["datetime"]
        timestamp = datetime.fromisoformat(acquired.replace("Z", "+00:00"))
        bbox, bounds = preview_bounds(site.lat, site.lon)
        image = self.post("process", {
            "input": {
                "bounds": {"bbox": bbox, "properties": {"crs": "http://www.opengis.net/def/crs/EPSG/0/3857"}},
                "data": [{"type": "sentinel-2-l2a", "dataFilter": {
                    "timeRange": {
                        "from": (timestamp - timedelta(seconds=1)).isoformat(),
                        "to": (timestamp + timedelta(seconds=1)).isoformat(),
                    }, "mosaickingOrder": "mostRecent",
                }}],
            },
            "output": {"width": 768, "height": 768,
                       "responses": [{"identifier": "default", "format": {"type": "image/png"}}]},
            "evalscript": EVALSCRIPT,
        })
        if not image.content.startswith(b"\x89PNG\r\n\x1a\n"):
            raise HTTPException(502, "Copernicus returned an unexpected image format.")
        return {
            "site_id": site.id, "requested_date": requested_date.isoformat(),
            "acquired_at": acquired, "scene_id": scene["id"],
            "cloud_cover_percent": scene["properties"].get("eo:cloud_cover"),
            "bounds": bounds,
            "image_url": "data:image/png;base64," + base64.b64encode(image.content).decode(),
            "attribution": f"Contains modified Copernicus Sentinel data {timestamp.year}",
        }


imagery_service = ImageryService()
