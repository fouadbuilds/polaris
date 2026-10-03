const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../node_modules/typescript');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/cableCurves.ts'), 'utf8'),
  {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const api = {};
new Function('exports',code)(api);
const {cableCurve,hitsCable} = api;

test('right-angle bends become true curves with preserved endpoints', () => {
  const points = [{x:0,y:0},{x:100,y:0},{x:100,y:100}];
  const original = JSON.stringify(points);
  const curve = cableCurve(points);
  assert.match(curve.path, /Q100\.00 0\.00 100\.00 30\.00/);
  assert.deepEqual(curve.hitPoints[0],points[0]);
  assert.deepEqual(curve.hitPoints.at(-1),points.at(-1));
  assert.equal(JSON.stringify(points),original);
});

test('subpixel staircase noise does not produce boxy bends', () => {
  const points = Array.from({length:100},(_,i)=>({x:i,y:i%2 ? 1 : 0}));
  const curve = cableCurve(points);
  assert.equal(curve.path.includes('Q'),false);
  assert.equal(curve.hitPoints.length,2);
});

test('click targets follow the visible bend, not its removed angular corner', () => {
  const curve = cableCurve([{x:0,y:0},{x:100,y:0},{x:100,y:100}]);
  assert.equal(hitsCable({x:92.5,y:7.5},curve.hitPoints,6),true);
  assert.equal(hitsCable({x:100,y:0},curve.hitPoints,6),false);
});

test('empty and repeated points never produce invalid path coordinates', () => {
  assert.equal(cableCurve([]).path,'');
  const curve = cableCurve([{x:0,y:0},{x:0,y:0},{x:10,y:0}]);
  assert.doesNotMatch(curve.path,/NaN|Infinity/);
});
