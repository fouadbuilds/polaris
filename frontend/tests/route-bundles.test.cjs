const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../node_modules/typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/routeBundles.ts'), 'utf8');
const output = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
const moduleExports = {};
new Function('exports', output)(moduleExports);
const {bundleRoutes} = moduleExports;
const coordinates = Array.from({length: 15}, (_, i) => [i, 0]);
const project = ([x,y]) => ({x,y});
const unproject = ({x,y}) => [x,y];

test('shared corridors get evenly spaced lanes, including reverse-direction routes', () => {
  const routes = [{id:'a',coordinates}, {id:'b',coordinates:[...coordinates].reverse()}, {id:'c',coordinates}];
  const result = bundleRoutes(routes, project, unproject);
  const offsets = result.map(route => route.coordinates[7][1]).sort((a,b)=>a-b);
  assert.deepEqual(offsets, [-6,0,6]);
  assert.deepEqual(result[0].coordinates[0], coordinates[0]);
  assert.deepEqual(result[1].coordinates[0], coordinates.at(-1));
  assert.deepEqual(routes[0].coordinates, coordinates);
});

test('isolated routes retain their geography', () => {
  const result = bundleRoutes([{id:'a',coordinates}], project, unproject);
  assert.deepEqual(result[0].coordinates, coordinates);
});

test('spacing stays constant in screen pixels across zoom levels', () => {
  for (const scale of [1,4,16]) {
    const result = bundleRoutes([{id:'a',coordinates}, {id:'b',coordinates}],
      ([x,y])=>({x:x*scale,y:y*scale}), ({x,y})=>[x/scale,y/scale]);
    assert.equal(Math.abs(result[0].coordinates[7][1]-result[1].coordinates[7][1])*scale,6);
  }
});

test('route ordering does not swap cable identities', () => {
  const routes = [{id:'a',coordinates}, {id:'b',coordinates}];
  const first = bundleRoutes(routes,project,unproject);
  const second = bundleRoutes([...routes].reverse(),project,unproject);
  assert.deepEqual(first[0],second[1]);
});

test('all saved routes have distinct editable palette colors', () => {
  const routes = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/routes-canada.geojson'), 'utf8')).features;
  const css = fs.readFileSync(path.join(__dirname, '../src/map-colors.css'), 'utf8');
  const colors = routes.map(route => {
    const match = css.match(new RegExp(`--map-route-${route.properties.id}:\\s*(#[a-f0-9]+);`, 'i'));
    assert.ok(match, `Missing color for ${route.properties.id}`);
    return match[1].toLowerCase();
  });
  assert.equal(new Set(colors).size, routes.length);
});
