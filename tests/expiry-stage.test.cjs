// node --test tests/expiry-stage.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  return resolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, ...args);
};
require.extensions['.ts'] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);

const { EXPIRY_STAGE_ORDER, EXPIRY_STAGE_PRESENTATION, expiryStageForRemaining } = require('../lib/expiry-notice.ts');

test('dashboard expiry bands map exact boundaries to the expected reminder stage', () => {
  const cases = [
    [-1, 'expired'],
    [0, '1_day'],
    [1, '1_day'],
    [2, '3_days'],
    [3, '3_days'],
    [4, '7_days'],
    [7, '7_days'],
    [8, '14_days'],
    [14, '14_days'],
    [15, '30_days'],
    [30, '30_days'],
    [31, '60_days'],
    [60, '60_days'],
    [61, '90_days'],
    [90, '90_days'],
    [365, '90_days'],
  ];
  for (const [days, expected] of cases) {
    assert.equal(expiryStageForRemaining(days), expected, `${days} day(s)`);
  }
});

test('each expiry stage has its own visible color and an explicit range label', () => {
  const colors = EXPIRY_STAGE_ORDER.map((type) => EXPIRY_STAGE_PRESENTATION[type].email.accent);
  assert.equal(new Set(colors).size, EXPIRY_STAGE_ORDER.length);

  for (const type of EXPIRY_STAGE_ORDER) {
    const stage = EXPIRY_STAGE_PRESENTATION[type];
    assert.ok(stage.labelVi, `${type} label`);
    assert.ok(stage.bandLabel, `${type} band label`);
    assert.ok(stage.badgeClass.includes('border-'), `${type} border class`);
    assert.ok(stage.markerClass.includes('border-l-'), `${type} card marker`);
  }
  assert.equal(EXPIRY_STAGE_PRESENTATION.renewal_reminder.urgency, 'complete');
});

test('expiry dashboard uses the shared palette for live alerts, sent history and scan results', () => {
  const page = fs.readFileSync(path.join(root, 'app/dashboard/canh-bao/page.tsx'), 'utf8');
  assert.match(page, /EXPIRY_STAGE_ORDER\.map/);
  assert.match(page, /expiryStageForRemaining\(c\.remaining_days\)/);
  assert.match(page, /stage\.badgeClass/);
  assert.match(page, /stage\.cardClass/);
  assert.match(page, /stage\.markerClass/);
  assert.match(page, /Mốc thông báo|Chú giải màu theo thời gian còn lại/);

  const tailwind = fs.readFileSync(path.join(root, 'tailwind.config.ts'), 'utf8');
  assert.match(tailwind, /\.\/lib\/\*\*\/\*\.\{js,ts,jsx,tsx\}/, 'Tailwind must scan the shared class map');
});
