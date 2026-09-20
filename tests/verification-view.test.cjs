// node --test tests/verification-view.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  return resolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, ...args);
};
const load = Module._load;
Module._load = function(request, ...args) {
  if (request === 'next/navigation') return { useRouter: () => ({ refresh() {} }) };
  return load.call(this, request, ...args);
};
for (const ext of ['.ts', '.tsx']) {
  require.extensions[ext] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
}
require.extensions['.css'] = (mod) => { mod.exports = new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) }); };
const { verificationResult, formatCheckedAt, formatRegistrationDate } = require('../lib/verification-view.ts');
const { publicCertificate } = require('../lib/certificate-workflow.ts');
const { VerifyView } = require('../components/VerifyView.tsx');
const checkedAt = '2026-09-20T05:23:00.000Z';
const cert = {
  standard: 'GACC', status: 'published', validity_confirmed: 1,
  registered_at: '2026-01-01', expires_at: '2031-01-01', validity_years: 5,
  company_name: 'Example Foods', registration_code: 'VN-REG-00158', certificate_no: 'VXM-GACC-2026-0158',
  public_code: 'DEMOQR123456', scope: 'Frozen fruit\nPackaged agricultural products',
  duns_code: '', us_agent: '', renewal_count: 0, last_renewed_at: null,
};
const render = (patch = {}) => renderToStaticMarkup(React.createElement(VerifyView, { cert: { ...cert, ...patch }, checkedAt }));

test('valid, expired, unconfirmed and future registrations have distinct truthful results', () => {
  assert.equal(verificationResult(cert, checkedAt).state, 'valid');
  assert.equal(verificationResult({ ...cert, expires_at: '2026-09-19' }, checkedAt).title, 'Certificate Expired');
  assert.equal(verificationResult({ ...cert, status: 'expired' }, checkedAt).state, 'expired');
  assert.equal(verificationResult({ ...cert, validity_confirmed: 0 }, checkedAt).state, 'unverified');
  assert.equal(verificationResult({ ...cert, registered_at: '2026-09-21' }, checkedAt).title, 'Certificate Not Yet Valid');
  assert.equal(verificationResult({ ...cert, status: 'draft' }, checkedAt).state, 'unverified');
});

test('last valid day and midnight follow the existing UTC expiry rule', () => {
  const endToday = { ...cert, expires_at: '2026-09-20' };
  assert.equal(verificationResult(endToday, '2026-09-20T23:59:59Z').state, 'valid');
  assert.equal(verificationResult(endToday, '2026-09-21T00:00:00Z').state, 'expired');
});

test('missing/invalid/inverted dates or incomplete record cannot display a verified seal', () => {
  for (const patch of [{ expires_at: '' }, { expires_at: '2026-02-30' }, { registered_at: '2032-01-01' }, { registration_code: '' }, { company_name: '' }]) {
    assert.notEqual(verificationResult({ ...cert, ...patch }, checkedAt).state, 'valid');
  }
  assert.equal(verificationResult(cert, 'invalid').state, 'unverified');
});

test('last checked is a real timestamp formatted consistently in ICT, with day rollover', () => {
  assert.equal(formatCheckedAt(checkedAt), '20 Sep 2026 · 12:23 ICT');
  assert.equal(formatCheckedAt('2026-09-20T18:05:00Z'), '21 Sep 2026 · 01:05 ICT');
  assert.equal(formatRegistrationDate('2026-09-20'), '20/09/2026');
  assert.equal(formatRegistrationDate('2026-02-30'), '—');
});

test('GACC renders two semantic tables, actual IDs and authority without FDA-only fields', () => {
  const html = render();
  assert.equal((html.match(/<table\b/g) || []).length, 2);
  for (const text of ['Certificate Verified', 'Còn hiệu lực', 'Verification ID', cert.certificate_no,
    '20 Sep 2026 · 12:23 ICT', 'General Administration of Customs of China (GACC)',
    'Việt Nam', 'VN-REG-00158', 'Frozen fruit', '01/01/2031', 'DEMOQR123456', 'scope="row"']) assert.ok(html.includes(text), text);
  for (const text of ['DUNS', 'US Agent', 'Live Sync', 'verify.vexim.vn', 'fa-solid']) assert.ok(!html.includes(text), text);
});

test('FDA includes its own agency, DUNS and US Agent; scope is never inferred as food-only', () => {
  const html = render({ standard: 'FDA', validity_years: 2, duns_code: '123456789', us_agent: 'Sample US Agent', scope: 'MoCRA cosmetic registration' });
  for (const text of ['U.S. Food and Drug Administration (FDA)', 'Mã số DUNS', 'Sample US Agent', 'MoCRA cosmetic registration', 'không đồng nghĩa']) assert.ok(html.includes(text), text);
  assert.ok(!html.includes('General Administration of Customs of China'));
  assert.ok(!html.includes('FFRN'));
});

test('expired and unconfirmed records never display Certificate Verified or a valid badge', () => {
  const expired = render({ expires_at: '2026-09-19' });
  assert.ok(expired.includes('Certificate Expired'));
  assert.ok(expired.includes('Hết hiệu lực'));
  assert.ok(expired.includes('data-state="expired"'));
  assert.ok(!expired.includes('Certificate Verified'));
  assert.ok(!expired.includes('Còn hiệu lực'));
  const pending = render({ validity_confirmed: 0 });
  assert.ok(pending.includes('Verification Pending'));
  assert.ok(!pending.includes('Certificate Expired'));
});

test('rendered public record retains the approved snapshot and no private data', () => {
  const input = { ...cert, service_price: 999123, company_email: 'private@example.test',
    pending_changes: { company_name: 'UNAPPROVED NAME', scope: 'UNAPPROVED SCOPE' } };
  const html = renderToStaticMarkup(React.createElement(VerifyView, { cert: publicCertificate(input), checkedAt }));
  for (const secret of ['999123', 'private@example.test', 'UNAPPROVED NAME', 'UNAPPROVED SCOPE']) assert.ok(!html.includes(secret));
  assert.ok(html.includes('Example Foods'));
  assert.ok(html.includes('Hồ sơ đã sẵn sàng bạn đã có phương án đưa sản phẩm vào Mỹ chưa?'));
  assert.ok(html.includes('Khám phá mô hình phòng sale xuất khẩu &amp; Vận hành Amazon tại Vexim'));
  assert.ok(html.includes('https://veximtrade.com'));
  assert.ok(html.includes('https://veximops.com'));
});
