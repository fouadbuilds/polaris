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
test('distance advantage disappears at break-even and reverses with more delay', () => {
  const dailyKm = 12 * 1.852 * 24;
  const before = api.compareVoyages(10 * dailyKm, 15 * dailyKm, 12, 0, 2);
  assert.equal(before.breakEvenDelay, 7);
  assert.equal(before.savingDays, 7);
  assert.equal(api.compareVoyages(10 * dailyKm, 15 * dailyKm, 12, 7, 2).savingDays, 0);
  assert.equal(api.compareVoyages(10 * dailyKm, 15 * dailyKm, 12, 8, 2).savingDays, -1);
});
test('longer route and equal distances retain the correct comparison sign', () => {
  const dailyKm = 12 * 1.852 * 24;
  assert.equal(api.compareVoyages(15 * dailyKm, 10 * dailyKm, 12, 0, 0).breakEvenDelay, -5);
  assert.equal(api.compareVoyages(dailyKm, dailyKm, 12, 1, 3).savingDays, 2);
});
test('comparison rejects missing, non-finite and physically invalid inputs', () => {
  for (const args of [[0,100,12,0,0], [100,-1,12,0,0], [100,200,0,0,0], [100,200,12,-1,0], [100,200,12,0,-1], [100,Infinity,12,0,0], [100,200,NaN,0,0]]) {
    assert.equal(api.compareVoyages(...args), null);
  }
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
