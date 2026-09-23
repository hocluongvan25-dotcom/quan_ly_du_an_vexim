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
  company_address: 'Số 12 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
};
const render = (patch = {}, locale = "vi") => renderToStaticMarkup(React.createElement(VerifyView, { cert: { ...cert, ...patch }, checkedAt, locale }));

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
  const html = renderToStaticMarkup(React.createElement(VerifyView, { cert: publicCertificate(input), checkedAt, locale: "vi" }));
  for (const secret of ['999123', 'private@example.test', 'UNAPPROVED NAME', 'UNAPPROVED SCOPE']) assert.ok(!html.includes(secret));
  assert.ok(html.includes('Example Foods'));
  assert.ok(html.includes('Hồ sơ đã sẵn sàng bạn đã có phương án đưa sản phẩm vào Mỹ chưa?'));
  assert.ok(html.includes('Khám phá mô hình phòng sale xuất khẩu &amp; Vận hành Amazon tại Vexim'));
  assert.ok(html.includes('https://veximtrade.com'));
  assert.ok(html.includes('https://veximops.com'));
});

const { resolveVerificationLocale, verificationLanguageUrl, verificationText } = require('../lib/verification-i18n.ts');

test('locale priority: explicit link overrides preference and browser; browser Vietnamese otherwise English', () => {
  assert.equal(resolveVerificationLocale('en', 'vi', 'vi-VN,vi;q=0.9'), 'en');
  assert.equal(resolveVerificationLocale('vi', 'en', 'en-US,en;q=0.9'), 'vi');
  assert.equal(resolveVerificationLocale(undefined, 'en', 'vi-VN'), 'en');
  assert.equal(resolveVerificationLocale(undefined, 'vi', 'en-US'), 'vi');
  assert.equal(resolveVerificationLocale(undefined, undefined, 'vi-VN,vi;q=0.9,en;q=0.8'), 'vi');
  assert.equal(resolveVerificationLocale(undefined, undefined, 'fr-FR,vi;q=0.5'), 'en');
  assert.equal(resolveVerificationLocale(undefined, undefined, 'en-US,vi;q=0.9'), 'en');
  assert.equal(resolveVerificationLocale(undefined, undefined, 'en;q=0.2,vi;q=0.9'), 'vi');
  assert.equal(resolveVerificationLocale(undefined, undefined, 'vi;q=0,en;q=1'), 'en');
  assert.equal(resolveVerificationLocale(undefined, undefined, ''), 'en');
  assert.equal(resolveVerificationLocale('zh', 'invalid', 'vi'), 'vi');
  assert.equal(resolveVerificationLocale(['vi','en'], undefined, 'en'), 'en');
});

test('language/share URLs keep the same QR and unrelated query parameters', () => {
  const source = 'https://vanhanh.veximglobal.com/verify/REALCODE12?ref=partner&lang=vi#registration-details';
  const result = verificationLanguageUrl(source, 'en');
  assert.equal(result.pathname, '/verify/REALCODE12');
  assert.equal(result.searchParams.get('lang'), 'en');
  assert.equal(result.searchParams.get('ref'), 'partner');
  assert.equal(result.hash, '#registration-details');
  assert.equal(result.searchParams.getAll('lang').length, 1);
});

test('English translates both FDA/GACC UI and service descriptions, without translating stored data', () => {
  for (const standard of ['FDA', 'GACC']) {
    const patch = { standard, company_name: 'Công ty Việt Nam', scope: 'Nông sản và thực phẩm đông lạnh',
      duns_code: '123456789', us_agent: 'Registered Agent LLC', renewal_count: 1, last_renewed_at: '2026-08-01' };
    const html = render(patch, 'en');
    assert.ok(html.includes('lang="en"'));
    for (const text of ['Company information', 'Registration details', 'Registration authority', 'Country of registration',
      'Registration date', 'Expiry date', 'Validity status', 'Share result', 'Check again', 'Last renewed',
      'U.S. Export Sales Team', 'Amazon U.S. Operations', 'Request a consultation']) assert.ok(html.includes(text), text);
    for (const text of [patch.company_name, patch.scope, patch.registration_code || cert.registration_code, cert.public_code]) assert.ok(html.includes(text));
    for (const text of ['Thông tin doanh nghiệp', 'Chi tiết đăng ký', 'Còn hiệu lực', 'Đăng ký tư vấn', 'Hồ sơ đã sẵn sàng']) assert.ok(!html.includes(text));
    if (standard === 'FDA') assert.ok(html.includes('U.S. Agent'));
    else assert.ok(!html.includes('DUNS® number'));
    // Language changes text, not the table/section structure or styling.
    const shape = s => [...s.matchAll(/<(table|tbody|tr|th|td|section|aside|details|summary|h[1-3])\b[^>]*>/g)]
      .map(m => m[0].replace(/aria-label="[^"]*"/g, 'aria-label="translated"'));
    assert.deepEqual(shape(html), shape(render(patch, 'vi')));
  }
});

test('every validity state has English text but identical state and dates', () => {
  for (const patch of [{}, { status: 'expired' }, { validity_confirmed: 0 }, { registered_at: '2026-09-21' }, { expires_at: '' }]) {
    const item = { ...cert, ...patch };
    const vi = verificationResult(item, checkedAt, 'vi');
    const en = verificationResult(item, checkedAt, 'en');
    assert.equal(vi.state, en.state);
    assert.equal(vi.left, en.left);
    assert.ok(!/[À-ỹ]/.test(en.label + en.description));
  }
  assert.ok(render({ status: 'expired' }, 'en').includes('Certificate Expired'));
  assert.ok(render({ validity_confirmed: 0 }, 'en').includes('Validity unconfirmed'));
  assert.equal(formatRegistrationDate('2026-01-15', 'en'), '15 Jan 2026');
  assert.equal(formatRegistrationDate('2026-01-15', 'vi'), '15/01/2026');
  assert.equal(formatRegistrationDate('', 'en'), '—');
});

test('feedback and form validation messages are available in both languages', () => {
  for (const key of ['copySuccess', 'copyFailure', 'invalidContact', 'sendFailed', 'consultationSuccess', 'contactName', 'contactPhone', 'send', 'sending', 'close']) {
    assert.ok(verificationText('en', key));
    assert.ok(!/[À-ỹ]/.test(verificationText('en', key)));
    assert.notEqual(verificationText('en', key), verificationText('vi', key));
  }
});


test('English counts use singular and plural without changing the recorded value', () => {
  assert.equal(verificationText('en', 'daysLeft', { count: 1 }), '1 day remaining');
  assert.equal(verificationText('en', 'daysLeft', { count: 2 }), '2 days remaining');
  assert.equal(verificationText('en', 'renewals', { count: 1 }), 'Renewed 1 time');
  assert.equal(verificationText('en', 'termValue', { count: 1 }), '1 year per registration term');
});

test('địa chỉ khách hàng nằm ngay dưới dòng Doanh nghiệp ở mục 01', () => {
  for (const locale of ['vi', 'en']) {
    const html = renderToStaticMarkup(React.createElement(VerifyView, { cert, checkedAt, locale }));
    const label = verificationText(locale, 'companyAddress');
    assert.ok(html.includes(label), `phải có nhãn "${label}"`);
    assert.ok(html.includes(cert.company_address), 'phải in địa chỉ của khách');
    // Thứ tự: Doanh nghiệp -> Địa chỉ -> Loại chứng nhận
    const at = (needle) => html.indexOf(needle);
    assert.ok(
      at(cert.company_name) < at(label) && at(label) < at(verificationText(locale, 'certificateType')),
      'địa chỉ phải nằm ngay dưới trường Doanh nghiệp, trên Loại chứng nhận'
    );
  }
  const blank = render({ company_address: '' }, 'vi');
  assert.ok(blank.includes(verificationText('vi', 'noAddress')), 'hồ sơ trống địa chỉ phải ghi rõ chưa có thông tin');
  assert.ok(blank.includes(verificationText('vi', 'companyAddress')), 'hồ sơ trống vẫn phải có nhãn Địa chỉ');
  const blankEn = render({ company_address: '' }, 'en');
  assert.ok(blankEn.includes(verificationText('en', 'noAddress')));
  assert.ok(!blankEn.includes(verificationText('vi', 'noAddress')));
  assert.ok(!blank.includes('undefined'), 'không được in undefined');
});

test('trang quét QR tuyệt đối không hiển thị User/Pass của khách', () => {
  const withCreds = { ...cert, portal_user: 'khach-portal', portal_pass: 'MatKhau@123' };
  const safe = publicCertificate(withCreds);
  assert.equal('portal_user' in safe, false);
  assert.equal('portal_pass' in safe, false);
  for (const locale of ['vi', 'en']) {
    const html = renderToStaticMarkup(React.createElement(VerifyView, { cert: safe, checkedAt, locale }));
    assert.equal(html.includes('MatKhau@123'), false, 'không được lộ mật khẩu trên trang QR');
    assert.equal(html.includes('khach-portal'), false, 'không được lộ user trên trang QR');
    assert.equal(html.includes('portal_pass'), false);
    assert.equal(html.includes('portal_user'), false);
  }
});
