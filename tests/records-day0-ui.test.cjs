// node --test tests/records-day0-ui.test.cjs
// Ngày 0 (hết hạn đúng hôm nay) trên bảng /dashboard/ho-so phải đọc là "Hôm nay",
// không hiện trần "0 ngày"; trạng thái vẫn là "Sắp hết hạn" và filter status=expiring
// phải bắt được hồ sơ này. (Nguyên tắc UTC: ngày 0 là ngày hiệu lực cuối cùng.)
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');

/* ------------------------------- Môi trường DOM ---------------------------- */
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/dashboard/ho-so',
  pretendToBeVisual: true,
});
dom.window.scrollTo = () => {};
for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'HTMLSelectElement', 'HTMLButtonElement', 'Event', 'MouseEvent', 'Node']) {
  Object.defineProperty(global, key, { value: dom.window[key], configurable: true, writable: true });
}
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
Object.defineProperty(global, 'localStorage', { value: dom.window.localStorage, configurable: true });
global.localStorage.setItem('vexm-locale', 'vi');
global.IS_REACT_ACT_ENVIRONMENT = true;

/* ------------------------ Module con của Next (stub) ----------------------- */
const stubs = fs.mkdtempSync(path.join(os.tmpdir(), 'vexim-records-day0-'));
const nav = { url: new URL('http://localhost/dashboard/ho-so') };
nav.setUrl = (url) => { nav.url = new URL(String(url), 'http://localhost'); };
nav.params = () => nav.url.searchParams;
global.__NAV__ = nav;

fs.writeFileSync(
  path.join(stubs, 'navigation.js'),
  `exports.useRouter = () => ({ push() {}, replace(url) { global.__NAV__ && global.__NAV__.setUrl(url); }, refresh() {}, back() {}, prefetch() {} });
   exports.useSearchParams = () => (global.__NAV__ ? global.__NAV__.params() : new URLSearchParams(''));
   exports.notFound = () => { throw new Error("NOT_FOUND"); };`
);
const REACT_PATH = require.resolve('react', { paths: [root] });
fs.writeFileSync(
  path.join(stubs, 'link.js'),
  `const React = require(${JSON.stringify(REACT_PATH)});
   const Link = ({ href, children, ...rest }) => React.createElement("a", { href, ...rest }, children);
   module.exports = Link; module.exports.default = Link;`
);

const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  if (request === 'next/navigation') return path.join(stubs, 'navigation.js');
  if (request === 'next/link') return path.join(stubs, 'link.js');
  return resolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, ...args);
};
for (const ext of ['.ts', '.tsx']) {
  require.extensions[ext] = (mod, filename) => {
    mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, filename);
  };
}

const React = require('react');
const { createRoot } = require('react-dom/client');
const { act } = require('react-dom/test-utils');
const { I18nProvider } = require('../lib/i18n/context.tsx');

/* --------------------------------- Dữ liệu -------------------------------- */
const iso = (daysFromNow) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
};

const base = {
  public_code: 'CODE00000000',
  registration_code: 'REG-0',
  duns_code: '',
  us_agent: '',
  service_price: 0,
  company_email: 'x@y.vn',
  company_address: '',
  portal_user: '',
  portal_pass: '',
  scope: '',
  validity_confirmed: 1,
  status: 'published',
  published_at: '2026-01-01T00:00:00.000Z',
  revenue_recorded: 1,
  renewal_count: 0,
  last_renewed_at: null,
  created_by: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  pending_changes: null,
};

const CERTS = [
  { ...base, id: 1, certificate_no: 'VXM-FDA-2026-0001', standard: 'FDA', company_name: 'HOM NAY FOODS', registration_code: 'FDA-TODAY', registered_at: iso(-730), expires_at: iso(0), validity_years: 2 },
  { ...base, id: 2, certificate_no: 'VXM-GACC-2026-0002', standard: 'GACC', company_name: 'QUA HAN FOODS', registration_code: 'CVNM-PAST', registered_at: iso(-2000), expires_at: iso(-5), validity_years: 5 },
];

global.fetch = async (url) => {
  if (String(url).includes('/api/auth/me')) {
    return { ok: true, json: async () => ({ user: { role: 'admin' } }) };
  }
  return { ok: true, json: async () => ({ items: CERTS }) };
};

/* ------------------------------- Tiện ích UI ------------------------------- */
async function open(search = '') {
  nav.url = new URL(`http://localhost/dashboard/ho-so${search}`);
  dom.window.history.replaceState(null, '', `/dashboard/ho-so${search}`);
  const host = document.createElement('div');
  document.body.appendChild(host);
  const Page = require('../app/dashboard/ho-so/page.tsx').default;
  const root_ = createRoot(host);
  await act(async () => {
    root_.render(React.createElement(I18nProvider, null, React.createElement(Page)));
    await new Promise((r) => setTimeout(r, 30));
  });
  const all = (selector) => Array.from(host.querySelectorAll(selector));
  const rows = () => all('tbody tr').filter((tr) => tr.querySelector('a'));
  return {
    host,
    html: () => host.innerHTML,
    rows: () => rows(),
    companies: () => rows().map((tr) => tr.children[1].textContent.trim()),
    remainingOf: (company) => rows().find((tr) => tr.children[1].textContent.includes(company))?.children[7]?.textContent.trim(),
    statusOf: (company) => rows().find((tr) => tr.children[1].textContent.includes(company))?.children[9]?.textContent.trim(),
    button: (label) => all('button').find((b) => b.textContent.trim() === label),
    click: async (el) => {
      assert.ok(el, 'không tìm thấy phần tử để bấm');
      await act(async () => { el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); });
    },
    close: async () => { await act(async () => root_.unmount()); host.remove(); },
  };
}
after(() => { fs.rmSync(stubs, { recursive: true, force: true }); });

/* ---------------------------------- Tests ---------------------------------- */

test('hồ sơ hết hạn đúng hôm nay: cột Còn lại đọc là "Hôm nay", không hiện "0 ngày"', async () => {
  const ui = await open();
  assert.equal(ui.remainingOf('HOM NAY FOODS'), 'Hôm nay');
  assert.equal(ui.remainingOf('QUA HAN FOODS'), '—', 'quá hạn thì không hiện số ngày âm');
  assert.equal(/>\s*0 ngày</.test(ui.html()), false, 'không được còn ô nào hiện "0 ngày"');
  await ui.close();
});

test('ngày 0 vẫn là "Sắp hết hạn", quá hạn mới là "Hết hạn"; filter expiring bắt được ngày 0', async () => {
  const ui = await open();
  assert.equal(ui.statusOf('HOM NAY FOODS'), 'Sắp hết hạn (≤90 ngày)');
  assert.equal(ui.statusOf('QUA HAN FOODS'), 'Đã hết hạn');

  await ui.click(ui.button('Sắp hết hạn (≤90 ngày) (1)'));
  assert.deepEqual(ui.companies(), ['HOM NAY FOODS'], 'filter sắp hết hạn phải gồm hồ sơ hết hạn hôm nay');
  await ui.close();
});
