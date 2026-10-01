/**
 * Kiểm thử bộ lọc trang danh sách hồ sơ (jsdom + React thật):
 * - Lọc theo trạng thái (còn hiệu lực / sắp hết hạn / đã hết hạn / chờ duyệt / nháp)
 * - Lọc theo tiêu chuẩn (FDA / GACC) và kỳ hạn hợp đồng
 * - Sắp xếp: hết hạn gần nhất / công ty A–Z / mới tạo gần đây
 * - Ô tìm kiếm theo công ty, số hồ sơ, mã đăng ký, DUNS
 * - Bộ lọc nằm trên URL (?status=...&standard=...) để chia sẻ được link
 * Không kết nối DB thật; fetch được stub bằng danh sách hồ sơ giả.
 */
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
const stubs = fs.mkdtempSync(path.join(os.tmpdir(), 'vexim-records-ui-'));
/** "Địa chỉ thanh địa chỉ" giả để kiểm tra bộ lọc có được ghi lên URL không. */
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
  { ...base, id: 1, certificate_no: 'VXM-FDA-2026-0001', standard: 'FDA', company_name: 'ALPHA FOODS', registration_code: 'FDA-AAA', duns_code: '123456789', registered_at: iso(-300), expires_at: iso(400), validity_years: 2, created_at: '2026-01-01T00:00:00.000Z' },
  { ...base, id: 2, certificate_no: 'VXM-FDA-2026-0002', standard: 'FDA', company_name: 'BETA SEAFOOD', registration_code: 'FDA-BBB', registered_at: iso(-700), expires_at: iso(45), validity_years: 2, created_at: '2026-03-01T00:00:00.000Z' },
  { ...base, id: 3, certificate_no: 'VXM-GACC-2026-0003', standard: 'GACC', company_name: 'GAMMA FRUIT', registration_code: 'CVNM-CCC', registered_at: iso(-2000), expires_at: iso(-10), validity_years: 5, created_at: '2026-02-01T00:00:00.000Z' },
  { ...base, id: 4, certificate_no: 'VXM-FDA-2026-0004', standard: 'FDA', company_name: 'DELTA SPICE', registration_code: 'FDA-DDD', registered_at: iso(-800), expires_at: iso(-60), validity_years: 1, status: 'draft', created_at: '2026-05-01T00:00:00.000Z' },
  { ...base, id: 5, certificate_no: 'VXM-FDA-2026-0005', standard: 'FDA', company_name: 'EPSILON TEA', registration_code: 'FDA-EEE', registered_at: iso(-100), expires_at: iso(900), validity_years: 3, created_at: '2026-06-01T00:00:00.000Z', pending_changes: { company_address: 'Địa chỉ mới' } },
];

global.fetch = async (url) => {
  if (String(url).includes('/api/auth/me')) {
    return { ok: true, json: async () => ({ user: { role: 'admin' } }) };
  }
  return { ok: true, json: async () => ({ items: CERTS }) };
};

/* ------------------------------- Tiện ích UI ------------------------------- */
/** Mỗi test render vào một container riêng để test hỏng không làm nhiễm test sau. */
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
  const q = (selector) => host.querySelector(selector);
  const all = (selector) => Array.from(host.querySelectorAll(selector));
  const rows = () => all('tbody tr').filter((tr) => tr.querySelector('a'));
  const api = {
    host,
    html: () => host.innerHTML,
    rows: () => rows(),
    companies: () => rows().map((tr) => tr.children[1].textContent.trim()),
    codes: () => rows().map((tr) => tr.children[0].textContent.trim()),
    button: (label) => all('button').find((b) => b.textContent.trim() === label),
    buttonStartingWith: (prefix) => all('button').find((b) => b.textContent.trim().startsWith(prefix)),
    input: () => q('input'),
    select: () => q('select'),
    click: async (el) => {
      assert.ok(el, 'không tìm thấy phần tử để bấm');
      await act(async () => { el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); });
    },
    type: async (value) => {
      const input = q('input');
      await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, value);
        input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      });
    },
    choose: async (value) => {
      const select = q('select');
      await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLSelectElement.prototype, 'value').set;
        setter.call(select, value);
        select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      });
    },
    close: async () => { await act(async () => root_.unmount()); host.remove(); },
  };
  return api;
}
after(() => { fs.rmSync(stubs, { recursive: true, force: true }); });

/* ---------------------------------- Tests ---------------------------------- */

test('certificateRecordState: một định nghĩa trạng thái dùng chung cho cả hệ thống', () => {
  const { certificateRecordState, EXPIRING_SOON_DAYS } = require('../lib/certificate-workflow.ts');
  const at = (days) => iso(days);
  const cert = (over = {}) => ({ status: 'published', validity_confirmed: 1, pending_changes: null, expires_at: at(200), ...over });

  assert.equal(EXPIRING_SOON_DAYS, 90);
  assert.equal(certificateRecordState(cert({ status: 'draft' })), 'draft');
  assert.equal(certificateRecordState(cert({ pending_changes: { company_address: 'x' } })), 'pending');
  assert.equal(certificateRecordState(cert({ expires_at: at(-1) })), 'expired');
  assert.equal(certificateRecordState(cert({ expires_at: at(0) })), 'expiring', 'hết hạn hôm nay vẫn tính là sắp hết hạn');
  assert.equal(certificateRecordState(cert({ expires_at: at(90) })), 'expiring', 'đúng 90 ngày là ngưỡng sắp hết hạn');
  assert.equal(certificateRecordState(cert({ expires_at: at(91) })), 'valid');
  assert.equal(certificateRecordState(cert({ expires_at: at(900) })), 'valid');
});

test('trang Toàn cảnh dùng cùng định nghĩa và dẫn sang danh sách đã lọc sẵn', () => {
  const src = fs.readFileSync(path.join(root, 'app/dashboard/page.tsx'), 'utf8');
  assert.match(src, /certificateRecordState/, 'phải dùng chung định nghĩa trạng thái');
  assert.equal(/const valid = items\.filter\(\(i\) => remainingDays/.test(src), false, 'không tự định nghĩa lại');
  assert.match(src, /href="\/dashboard\/ho-so\?status=valid"/, 'ô "Còn hiệu lực" phải bấm được');
  assert.match(src, /href="\/dashboard\/ho-so\?status=expiring"/, 'ô "Sắp hết hạn" phải bấm được');
});

test('hiển thị đủ 5 hồ sơ, mặc định xếp theo hạn gần nhất', async () => {
  const ui = await open();
  assert.equal(ui.rows().length, 5);
  // Hạn gần nhất trước: DELTA (-60) → GAMMA (-10) → BETA (+45) → ALPHA (+400) → EPSILON (+900)
  assert.deepEqual(ui.companies(), ['DELTA SPICE', 'GAMMA FRUIT', 'BETA SEAFOOD', 'ALPHA FOODS', 'EPSILON TEA']);
  assert.equal(ui.select().value, 'expiry');
  await ui.close();
});

test('lọc theo từng trạng thái, nút đang chọn được tô đậm', async () => {
  const ui = await open();

  await ui.click(ui.button('Sắp hết hạn (≤90 ngày) (1)'));
  assert.deepEqual(ui.companies(), ['BETA SEAFOOD']);
  assert.equal(ui.button('Sắp hết hạn (≤90 ngày) (1)').className.includes('bg-navy-900'), true);

  // Hồ sơ nháp được tính là "Bản nháp" chứ không phải "Đã hết hạn"
  await ui.click(ui.button('Đã hết hạn (1)'));
  assert.deepEqual(ui.companies(), ['GAMMA FRUIT']);

  await ui.click(ui.button('Chờ duyệt (1)'));
  assert.deepEqual(ui.companies(), ['EPSILON TEA']);

  await ui.click(ui.button('Bản nháp (1)'));
  assert.deepEqual(ui.companies(), ['DELTA SPICE']);

  await ui.click(ui.button('Còn hiệu lực (1)'));
  assert.deepEqual(ui.companies(), ['ALPHA FOODS']);

  // Bấm lại nút đang chọn = bỏ lọc trạng thái
  await ui.click(ui.button('Còn hiệu lực (1)'));
  assert.equal(ui.rows().length, 5);
  await ui.close();
});

test('lọc theo tiêu chuẩn và kỳ hạn hợp đồng', async () => {
  const ui = await open();

  await ui.click(ui.button('GACC'));
  assert.deepEqual(ui.companies(), ['GAMMA FRUIT']);

  await ui.click(ui.button('FDA'));
  assert.deepEqual(ui.codes().sort(), ['VXM-FDA-2026-0001', 'VXM-FDA-2026-0002', 'VXM-FDA-2026-0004', 'VXM-FDA-2026-0005']);

  await ui.click(ui.button('1 năm'));
  assert.deepEqual(ui.companies(), ['DELTA SPICE']);

  await ui.click(ui.button('3 năm'));
  assert.deepEqual(ui.companies(), ['EPSILON TEA']);

  await ui.close();
});

test('kết hợp nhiều bộ lọc cùng lúc', async () => {
  const ui = await open();
  await ui.click(ui.button('FDA'));
  await ui.click(ui.button('2 năm'));
  await ui.click(ui.button('Sắp hết hạn (≤90 ngày) (1)'));
  assert.deepEqual(ui.companies(), ['BETA SEAFOOD']);
  await ui.close();
});

test('sắp xếp theo công ty A–Z và mới tạo gần đây', async () => {
  const ui = await open();

  await ui.choose('company');
  assert.deepEqual(ui.companies(), ['ALPHA FOODS', 'BETA SEAFOOD', 'DELTA SPICE', 'EPSILON TEA', 'GAMMA FRUIT']);

  await ui.choose('newest');
  assert.deepEqual(ui.companies(), ['EPSILON TEA', 'DELTA SPICE', 'BETA SEAFOOD', 'GAMMA FRUIT', 'ALPHA FOODS']);

  await ui.close();
});

test('tìm kiếm theo công ty, số hồ sơ, mã đăng ký và DUNS', async () => {
  const ui = await open();

  await ui.type('gamma');
  assert.deepEqual(ui.companies(), ['GAMMA FRUIT']);

  await ui.type('0002');
  assert.deepEqual(ui.companies(), ['BETA SEAFOOD']);

  await ui.type('FDA-AAA');
  assert.deepEqual(ui.companies(), ['ALPHA FOODS']);

  await ui.type('123456789');
  assert.deepEqual(ui.companies(), ['ALPHA FOODS']);

  await ui.close();
});

test('bộ lọc được ghi lên URL và nút Xoá lọc đưa về mặc định', async () => {
  const ui = await open();
  await ui.click(ui.buttonStartingWith('Sắp hết hạn'));
  await ui.click(ui.button('GACC'));
  await ui.click(ui.button('5 năm'));
  const params = new URLSearchParams(dom.window.location.search);
  assert.equal(params.get('status'), 'expiring');
  assert.equal(params.get('standard'), 'GACC');
  assert.equal(params.get('term'), '5');
  assert.equal(ui.rows().length, 0, 'GACC + 5 năm + sắp hết hạn thì không còn hồ sơ nào');
  assert.ok(ui.html().includes('Không tìm thấy hồ sơ phù hợp'), 'phải hiện thông báo rỗng');

  await ui.click(ui.button('Xoá lọc'));
  assert.equal(dom.window.location.search, '', 'xoá lọc thì URL sạch');
  assert.equal(ui.rows().length, 5);
  await ui.close();
});

test('mở link đã lọc sẵn thì áp dụng đúng bộ lọc', async () => {
  const ui = await open('?status=expired&standard=GACC');
  assert.deepEqual(ui.companies(), ['GAMMA FRUIT'], 'chỉ hồ sơ GACC đã hết hạn');
  assert.equal(ui.button('Đã hết hạn (1)').className.includes('bg-navy-900'), true, 'nút lọc phải phản ánh URL');
  assert.equal(ui.button('GACC').className.includes('bg-navy-900'), true);
  await ui.close();
});

test('số lượng trên nút lọc tính theo các bộ lọc khác, không theo chính nó', async () => {
  const ui = await open();
  await ui.click(ui.button('GACC'));
  assert.ok(ui.button('Tất cả (1)'), 'chỉ còn 1 hồ sơ GACC');
  assert.ok(ui.button('Đã hết hạn (1)'));
  assert.ok(ui.button('Còn hiệu lực (0)'));
  await ui.close();
});

test('nhãn trạng thái trong bảng hiển thị tiếng Việt, không còn nhãn tiếng Anh', async () => {
  const ui = await open();
  const html = ui.html();
  for (const label of ['Còn hiệu lực', 'Sắp hết hạn (≤90 ngày)', 'Đã hết hạn', 'Chờ duyệt', 'Bản nháp']) {
    assert.ok(html.includes(label), `thiếu nhãn "${label}"`);
  }
  for (const english of ['>VALID<', '>Expiring Soon<', '>Published<', '>Draft<']) {
    assert.equal(html.includes(english), false, `không được còn nhãn tiếng Anh ${english}`);
  }
  await ui.close();
});
