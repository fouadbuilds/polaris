const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function worker() {
  const stores = new Map();
  const handlers = {};
  let online = true;
  const requests = [];
  const key = request => typeof request === 'string' ? request : request.url ?? request.href;
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        async match(request) { return entries.get(key(request))?.clone(); },
        async put(request, response) { entries.set(key(request), response.clone()); },
        async keys() { return [...entries.keys()].map(url => new Request(url)); },
        async delete(request) { return entries.delete(key(request)); },
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); },
  };
  const context = {
    URL, Request, Response, caches,
    self: {location: {origin: 'http://127.0.0.1:5173'}, clients: {async claim() {}},
      async skipWaiting() {}, addEventListener(name, handler) { handlers[name] = handler; }},
    async fetch(request) {
      requests.push(key(request));
      if (!online) throw new Error('Offline');
      if (key(request).includes('failed')) return new Response('Quota reached', {status: 429});
      if (key(request).includes('manifest-')) return Response.json({frames: [{vector_url: '/data/ice/saved-outline.geojson'}]});
      return new Response('saved data');
    },
  };
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../public/sw.js'), 'utf8'), context);
  return {
    requests, stores,
    offline() { online = false; },
    async get(url) {
      let result;
      handlers.fetch({request: new Request(url), respondWith(promise) { result = promise; }});
      return result;
    },
    async warm() {
      let result, status;
      handlers.message({data: {type: 'SAVE_MAPS'}, source: {postMessage(message) { status = message; }},
        waitUntil(promise) { result = promise; }});
      await result;
      return status;
    },
  };
}

test('ice files and successful port previews are reused without another request', async () => {
  const app = worker();
  const urls = ['http://127.0.0.1:5173/data/world-land.geojson', 'http://localhost:8000/api/imagery/cambridge-bay?date=2025-08-18'];
  for (const url of urls) await app.get(url);
  app.offline();
  for (const url of urls) assert.equal(await (await app.get(url)).text(), 'saved data');
  assert.equal(app.requests.length, 2);
});

test('failed API responses are not cached', async () => {
  const app = worker();
  const url = 'http://localhost:8000/api/imagery/failed?date=2025-08-18';
  assert.equal((await app.get(url)).status, 429);
  app.offline();
  await assert.rejects(app.get(url), /Offline/);
});

test('offline preparation saves unvisited frames and both seasonal manifests', async () => {
  const app = worker();
  assert.equal((await app.warm()).ready, true);
  app.offline();
  const before = app.requests.length;
  const saved = await app.get('http://127.0.0.1:5173/data/ice/saved-outline.geojson');
  assert.equal(await saved.text(), 'saved data');
  assert.equal(app.requests.length, before);
  assert.equal(await (await app.get('http://127.0.0.1:5173/data/routes-canada-v2.geojson')).text(), 'saved data');
  assert.equal(app.requests.length, before);
});

test('satellite tile cache is bounded and newest viewed tile works offline', async () => {
  const app = worker();
  for (let i = 0; i < 100; i++) await app.get(`https://server.arcgisonline.com/tile/4/0/${i}`);
  const tileStore = [...app.stores.entries()].find(([name]) => name.includes('satellite-tiles'))[1];
  assert.equal(tileStore.size, 96);
  app.offline();
  assert.equal(await (await app.get('https://server.arcgisonline.com/tile/4/0/99')).text(), 'saved data');
});

test('app shell falls back to its saved copy offline', async () => {
  const app = worker();
  const url = 'http://127.0.0.1:5173/';
  await app.get(url);
  app.offline();
  assert.equal(await (await app.get(url)).text(), 'saved data');
});

test('port catalogue refreshes online and keeps its offline fallback', async () => {
  const app = worker();
  const url = 'http://localhost:8000/api/sites?catalog=2';
  await app.get(url);
  await app.get(url);
  assert.equal(app.requests.length, 2);
  app.offline();
  assert.equal(await (await app.get(url)).text(), 'saved data');
});
