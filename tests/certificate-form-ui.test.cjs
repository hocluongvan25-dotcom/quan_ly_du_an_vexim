/**
 * Kiểm thử giao diện form hồ sơ (jsdom + React thật) cho phần đăng nhập của khách:
 * - Có đủ 2 trường User / Pass, nằm trong khối "nội bộ" có nhãn ẩn với QR.
 * - Ô Pass mặc định bị che, bấm con mắt mới hiện.
 * - Lưu form gửi đúng portal_user / portal_pass lên API.
 * - Bảng đối chiếu chờ duyệt che mật khẩu, không in ra chữ rõ.
 * Không kết nối DB thật; fetch được stub bằng hồ sơ giả.
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
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/dashboard/ho-so/8',
  pretendToBeVisual: true,
});
dom.window.scrollTo = () => {};
for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'Event', 'MouseEvent', 'Node']) {
  Object.defineProperty(global, key, { value: dom.window[key], configurable: true, writable: true });
}
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
Object.defineProperty(global, 'localStorage', { value: dom.window.localStorage, configurable: true });
global.localStorage.setItem('vexm-locale', 'vi');
global.IS_REACT_ACT_ENVIRONMENT = true;

/* ------------------------ Module con của Next (stub) ----------------------- */
const stubs = fs.mkdtempSync(path.join(os.tmpdir(), 'vexim-cert-ui-'));
fs.writeFileSync(
  path.join(stubs, 'navigation.js'),
  `exports.useRouter = () => ({ push() {}, replace() {}, refresh() {}, back() {}, prefetch() {} });
   exports.useSearchParams = () => new URLSearchParams("");
   exports.notFound = () => { throw new Error("NOT_FOUND"); };`
);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  if (request === 'next/navigation') return path.join(stubs, 'navigation.js');
  return resolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, ...args);
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (mod, filename) => {
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
};

const React = require('react');
const { createRoot } = require('react-dom/client');
const { act } = require('react-dom/test-utils');
const { I18nProvider } = require('../lib/i18n/context.tsx');
const { CertificateForm } = require('../components/CertificateForm.tsx');

/* --------------------------------- Dữ liệu -------------------------------- */
const CERT = {
  id: 8,
  public_code: 'DEMOQR123456',
  certificate_no: 'VXM-FDA-2026-0008',
  standard: 'FDA',
  registration_code: 'REG-0008',
  duns_code: '123456789',
  us_agent: 'Vexim Global LLC',
  service_price: 18500000,
  company_name: 'CÔNG TY TNHH THỰC PHẨM ABC',
  company_email: 'xuatkhau@abc-food.vn',
  portal_user: 'khach-portal',
  portal_pass: 'MatKhau@123',
  scope: 'Đăng ký cơ sở sản xuất FDA',
  registered_at: '2026-01-01',
  expires_at: '2028-01-01',
  validity_years: 2,
  validity_confirmed: 1,
  status: 'published',
  published_at: '2026-01-02T00:00:00.000Z',
  revenue_recorded: 1,
  renewal_count: 0,
  last_renewed_at: null,
  created_by: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
  created_by_name: 'Administrator',
  pending_changes: null,
};

let current = CERT;
const calls = [];
global.fetch = (url, init) => {
  const target = String(url);
  const method = String(init?.method || 'GET');
  if (target.includes('/api/companies')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ companies: [], items: [] }) });
  }
  if (target.includes('/api/certificates')) {
    if (method === 'GET') return Promise.resolve({ ok: true, json: () => Promise.resolve({ item: current }) });
    const body = JSON.parse(String(init?.body || '{}'));
    calls.push({ method, url: target, body });
    if (method === 'PUT') {
      current = { ...current, ...body, pending_changes: null };
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ item: current }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 8 }) });
  }
  return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
};

const roots = [];
after(async () => {
  // CountdownRing dùng setInterval: phải unmount để tiến trình test thoát được.
  await act(async () => { roots.forEach((r) => r.unmount()); });
  fs.rmSync(stubs, { recursive: true, force: true });
});

/* -------------------------------- Tiện ích -------------------------------- */
const setNativeValue = (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, value);
};

const flush = async (ms = 30) => {
  await act(async () => { await new Promise((r) => setTimeout(r, ms)); });
};

const inputByLabel = (container, label) => {
  const node = [...container.querySelectorAll('label')].find((l) => l.textContent.trim().startsWith(label));
  return node ? node.querySelector('input') : null;
};

const typeInto = async (input, value) => {
  await act(async () => {
    setNativeValue(input, value);
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  await flush(10);
};

async function renderForm(initial) {
  current = initial;
  const container = document.getElementById('root');
  // Mỗi lần render phải unmount hồ sơ cũ, tránh React giữ state của test trước.
  if (roots[0]) await act(async () => { roots[0].unmount(); });
  const reactRoot = createRoot(container);
  roots[0] = reactRoot;
  await act(async () => {
    reactRoot.render(React.createElement(I18nProvider, null,
      React.createElement(CertificateForm, { key: initial.id, initial, role: 'admin' })));
  });
  await flush(60);
  return { container, reactRoot };
}

/* ---------------------------------- Test ---------------------------------- */
test('form hồ sơ có 2 trường User/Pass nội bộ, mặc định che mật khẩu và gửi lên API', async () => {
  calls.length = 0;
  const { container } = await renderForm(CERT);

  const userInput = inputByLabel(container, 'User');
  const passInput = inputByLabel(container, 'Pass');
  assert.ok(userInput, 'thiếu ô User của khách');
  assert.ok(passInput, 'thiếu ô Pass của khách');
  assert.equal(userInput.value, 'khach-portal');
  assert.equal(passInput.value, 'MatKhau@123');

  // Mặc định phải che mật khẩu
  assert.equal(passInput.type, 'password', 'ô Pass phải bị che mặc định');
  const section = container.textContent;
  assert.match(section, /Đăng nhập tài khoản khách \(nội bộ\)/);
  assert.match(section, /Chỉ lưu nội bộ — ẩn với QR/);
  assert.match(section, /không trả về ở trang quét mã QR/);

  // Không có ô nào lộ mật khẩu khi chưa bấm con mắt
  assert.ok(![...container.querySelectorAll('input')].some((i) => i.type !== 'password' && i.value === 'MatKhau@123'));

  // Bấm con mắt mới hiện
  const eye = [...container.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Hiện mật khẩu');
  assert.ok(eye, 'thiếu nút hiện mật khẩu');
  await act(async () => { eye.click(); });
  await flush(10);
  assert.equal(inputByLabel(container, 'Pass').type, 'text', 'bấm con mắt phải hiện được mật khẩu');
  const hideEye = [...container.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Ẩn mật khẩu');
  await act(async () => { hideEye.click(); });
  await flush(10);
  assert.equal(inputByLabel(container, 'Pass').type, 'password', 'bấm lại phải che mật khẩu');

  // Lưu form → payload gửi đúng 2 trường nội bộ
  await typeInto(inputByLabel(container, 'User'), 'khach-portal-2');
  await typeInto(inputByLabel(container, 'Pass'), 'MatKhauMoi@456');
  const save = [...container.querySelectorAll('button')].find((b) => b.textContent.includes('Lưu thay đổi'));
  assert.ok(save, 'thiếu nút lưu thay đổi');
  await act(async () => { save.click(); });
  await flush(60);

  const put = calls.find((c) => c.method === 'PUT');
  assert.ok(put, 'form phải gọi PUT /api/certificates/8');
  assert.equal(put.body.portal_user, 'khach-portal-2');
  assert.equal(put.body.portal_pass, 'MatKhauMoi@456');
  assert.equal(put.body.company_name, CERT.company_name);
});

test('bảng đối chiếu chờ admin duyệt che mật khẩu, không in chữ rõ', async () => {
  const pending = {
    ...CERT,
    pending_changes: {
      ...CERT,
      portal_user: 'khach-portal-2',
      portal_pass: 'MatKhauMoi@456',
      expires_at: CERT.expires_at,
    },
  };
  const { container } = await renderForm(pending);
  const text = container.textContent;
  assert.match(text, /Xem thay đổi \(đã xuất bản → đề xuất\)/);
  assert.ok(!text.includes('MatKhauMoi@456'), 'không được in mật khẩu mới dạng chữ rõ');
  assert.ok(!text.includes('MatKhau@123'), 'không được in mật khẩu cũ dạng chữ rõ');
  assert.match(text, /Tài khoản khách \(Pass\)/);
  assert.match(text, /••••••/, 'phải hiện dấu chấm thay cho mật khẩu');
  // User không phải mật khẩu nên vẫn xem được để đối chiếu
  assert.match(text, /khach-portal-2/);
});
