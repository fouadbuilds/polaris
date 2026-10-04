const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../node_modules/typescript');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/routeMetrics.ts'), 'utf8'),
  {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
const api = {};
new Function('exports', code)(api);

test('distance handles equatorial degrees, repeated vertices and the date line', () => {
  assert.ok(Math.abs(api.distanceKm([[0, 0], [1, 0]]) - 111.195) < 0.001);
  assert.equal(api.distanceKm([[0, 0], [0, 0]]), 0);
  assert.ok(Math.abs(api.distanceKm([[179, 0], [-179, 0]]) - 222.39) < 0.001);
});
test('knots convert to nautical miles per hour and voyage days', () => {
  assert.equal(api.voyageDays(12 * 1.852 * 24, 12), 1);
});
test('ruler follows a great circle at high latitudes and crosses the date line smoothly', () => {
  const arc = api.greatCirclePoints([-90, 70], [90, 70]);
  assert.ok(arc[32][1] > 89.99);
  assert.ok(Math.abs(api.distanceKm(arc) - api.distanceKm([[-90,70],[90,70]])) < .001);
  const crossing = api.greatCirclePoints([179,0],[-179,0]);
  assert.ok(Math.abs(crossing.at(-1)[0] - 181) < .00001);
  for (let i=1;i<crossing.length;i++) assert.ok(Math.abs(crossing[i][0]-crossing[i-1][0]) < 1);
  for (const coordinate of api.greatCirclePoints([0,0],[180,0]).flat()) assert.ok(Number.isFinite(coordinate));
});
