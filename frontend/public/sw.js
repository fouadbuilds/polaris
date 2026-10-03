// Bump the data version whenever the baked geographical files change.
const PREFIX = 'polaris-';
const DATA = PREFIX + 'data-v3';
const SHELL = PREFIX + 'shell-v3';
const API = PREFIX + 'previews-v1';
const TILES = PREFIX + 'satellite-tiles-v1';
const tileHosts = new Set(['server.arcgisonline.com', 'gibs.earthdata.nasa.gov']);
let warming;

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(PREFIX) && ![DATA, SHELL, API, TILES].includes(key)) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

async function put(cache, request, response, limit) {
  try {
    await cache.put(request, response.clone());
    if (limit) {
      const keys = await cache.keys();
      for (const key of keys.slice(0, Math.max(0, keys.length - limit))) await cache.delete(key);
    }
  } catch {
    // Satellite tiles are disposable; release them before retrying local data.
    await caches.delete(TILES);
    try { await cache.put(request, response.clone()); } catch { /* Storage may be unavailable. */ }
  }
}
async function cached(request, cacheName, limit) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') await put(cache, request, response, limit);
  return response;
}
async function networkFirst(request, cacheName = SHELL) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) await put(cache, request, response, cacheName === SHELL ? 120 : undefined);
    return response;
  } catch (error) {
    const saved = await cache.match(request);
    if (saved) return saved;
    throw error;
  }
}
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith('/data/')) {
    event.respondWith(cached(request, DATA));
  } else if (['localhost', '127.0.0.1'].includes(url.hostname) && url.pathname === '/api/sites') {
    event.respondWith(networkFirst(request, API));
  } else if (['localhost', '127.0.0.1'].includes(url.hostname) && /^\/api\/imagery\/[^/]+$/.test(url.pathname)) {
    event.respondWith(cached(request, API));
  } else if (tileHosts.has(url.hostname)) {
    // Only tiles actually viewed are fetched; no extra Copernicus processing.
    event.respondWith(cached(request, TILES, 96));
  } else if (url.origin === self.location.origin && !url.pathname.includes('sw.js') && !url.pathname.startsWith('/@vite')) {
    // Fresh app code online, saved app code if the network goes away.
    event.respondWith(networkFirst(request));
  }
});

async function warmData(apiUrl) {
  const paths = ['/data/world-land.geojson', '/data/routes-canada-v2.geojson'];
  for (const month of ['march', 'september']) {
    const url = `/data/ice/manifest-${month}.json`;
    const response = await cached(new Request(new URL(url, self.location.origin)), DATA);
    if (!response.ok) throw new Error('Ice manifest unavailable');
    const manifest = await response.json();
    paths.push(...manifest.frames.map(frame => frame.vector_url));
  }
  let index = 0;
  await Promise.all(Array.from({length: 4}, async () => {
    while (index < paths.length) {
      const url = paths[index++];
      const response = await cached(new Request(new URL(url, self.location.origin)), DATA);
      if (!response.ok) throw new Error('Saved map unavailable');
    }
  }));
  const cache = await caches.open(DATA);
  for (const path of paths) {
    if (!await cache.match(new URL(path, self.location.origin))) throw new Error('Storage could not save all maps');
  }
  // Public candidate fixtures only. Never prefetch paid imagery or credentials.
  if (apiUrl) { try { await cached(new Request(apiUrl), API); } catch { /* Local API may be restarting. */ } }
}
self.addEventListener('message', event => {
  if (event.data?.type !== 'SAVE_MAPS') return;
  warming ??= warmData(event.data.apiUrl).catch(error => { warming = undefined; throw error; });
  event.waitUntil(warming.then(() => {
    event.source?.postMessage({type: 'MAPS_SAVED', ready: true});
  }).catch(() => {
    event.source?.postMessage({type: 'MAPS_SAVED', ready: false});
  }));
});
