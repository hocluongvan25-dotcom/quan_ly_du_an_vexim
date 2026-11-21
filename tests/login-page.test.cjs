/**
 * Kiểm thử trang đăng nhập (jsdom + React thật):
 * - Logo là CHỮ "VeximGlobal", không còn dùng ảnh logo.
 * - Form nằm giữa màn hình (canh giữa cả ngang lẫn dọc) và bề rộng cột cố định.
 * - Vẫn đăng nhập được: gửi đúng email/mật khẩu và điều hướng vào /dashboard.
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
  url: 'http://localhost/login',
  pretendToBeVisual: true,
});
for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'Event', 'MouseEvent', 'Node']) {
  Object.defineProperty(global, key, { value: dom.window[key], configurable: true, writable: true });
}
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
global.IS_REACT_ACT_ENVIRONMENT = true;
// i18n đọc localStorage / document.documentElement.lang
Object.defineProperty(global, 'localStorage', { value: dom.window.localStorage, configurable: true });
dom.window.localStorage.clear();

/* ------------------------ Module con của Next (stub) ----------------------- */
const stubs = fs.mkdtempSync(path.join(os.tmpdir(), 'vexim-login-stubs-'));
fs.writeFileSync(
  path.join(stubs, 'navigation.js'),
  `exports.useRouter = () => ({ replace: (url) => { global.__navigatedTo = url; }, push() {}, refresh() {}, back() {}, prefetch() {} });
   exports.useSearchParams = () => new URLSearchParams("");
   exports.usePathname = () => "/login";`
);
fs.writeFileSync(
  path.join(stubs, 'link.js'),
  `const React = require(${JSON.stringify(require.resolve('react', { paths: [root] }))});
   const Link = ({ href, children, ...rest }) => React.createElement("a", { href, ...rest }, children);
   module.exports = Link; module.exports.default = Link;`
);

const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  if (request === 'next/navigation') return path.join(stubs, 'navigation.js');
  if (request === 'next/link') return path.join(stubs, 'link.js');
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

global.fetch = (url, init) => {
  if (String(url).includes('/api/auth/login')) {
    global.__loginBody = JSON.parse(String(init?.body || '{}'));
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: { id: 1, role: 'admin' } }) });
  }
  return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
};

after(() => fs.rmSync(stubs, { recursive: true, force: true }));

const setNativeValue = (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, value);
};

test('trang đăng nhập: logo bằng chữ, form canh giữa màn hình, đăng nhập vẫn chạy', async () => {
  const container = document.getElementById('root');
  const reactRoot = createRoot(container);
  const LoginPage = require('../app/login/page.tsx').default;

  await act(async () => {
    reactRoot.render(React.createElement(I18nProvider, null, React.createElement(LoginPage)));
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30));
  });

  const html = container.innerHTML;

  /* --- 1. Logo là chữ, không dùng ảnh --- */
  assert.equal(container.querySelectorAll('img').length, 0, 'trang đăng nhập không được còn thẻ <img> logo');
  assert.ok(!html.includes('/logo.png') && !html.includes('/logo-white.png'), 'không tham chiếu file ảnh logo');
  assert.match(container.textContent, /VeximGlobal/, 'phải hiện logo chữ "VeximGlobal"');

  const mark = [...container.querySelectorAll('span')].filter((el) => el.textContent === 'Vexim');
  assert.equal(mark.length, 1, 'tên thương hiệu "Vexim" phải là chữ thật (một phần của logo)');
  assert.match(html, /font-display font-extrabold tracking-tight text-3xl/, 'logo dùng chữ với cỡ lớn');

  /* --- 2. Form nằm giữa màn hình --- */
  const shell = container.firstElementChild;
  assert.match(shell.className, /min-h-screen/, 'khung ngoài phải cao đủ màn hình');
  assert.match(shell.className, /items-center/, 'canh giữa theo chiều dọc');
  assert.match(shell.className, /justify-center/, 'canh giữa theo chiều ngang');
  assert.match(shell.className, /flex/, 'dùng flex để canh giữa');

  const column = shell.querySelector('.max-w-\\[430px\\]');
  assert.ok(column, 'form nằm trong cột có bề rộng giới hạn, canh giữa');
  assert.ok(column.querySelector('form'), 'có form đăng nhập trong cột canh giữa');
  assert.ok(!html.includes('md:grid-cols-2'), 'đã bỏ bố cục 2 cột (form lệch sang phải) trước đây');

  /* --- 3. Đăng nhập vẫn hoạt động --- */
  const [emailInput, passwordInput] = container.querySelectorAll('input');
  assert.equal(emailInput.type, 'email');
  assert.equal(passwordInput.type, 'password');

  await act(async () => {
    setNativeValue(emailInput, 'admin@veximglobal.com');
    emailInput.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    setNativeValue(passwordInput, 'Vexim@Admin2026');
    passwordInput.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });

  await act(async () => {
    container.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30));
  });

  assert.deepEqual(global.__loginBody, { email: 'admin@veximglobal.com', password: 'Vexim@Admin2026' });
  assert.equal(global.__navigatedTo, '/dashboard', 'đăng nhập thành công phải vào dashboard');
});
