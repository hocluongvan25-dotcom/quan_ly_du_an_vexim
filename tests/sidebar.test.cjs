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
Module._resolveFilename = function(request, ...args) {
  return resolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, ...args);
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (mod, filename) => {
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
};
const { getTranslation } = require('../lib/i18n/translations.ts');
let locale = 'vi', pathname = '/dashboard/ke-toan/hoa-don/1', cookie;
const user = { id: 1, role: 'admin', name: 'Quản trị Vexim', email: 'admin@example.test' };
const load = Module._load;
Module._load = function(request, ...args) {
  if (request === 'next/navigation') return { usePathname: () => pathname, useRouter: () => ({ replace() {} }), redirect() { throw new Error('redirect'); } };
  if (request === 'next/headers') return { cookies: () => ({ get: () => cookie === undefined ? undefined : { value: cookie } }) };
  if (request === '@/lib/auth') return { getSession: () => user };
  if (request === '@/components/DashboardHeader') return { DashboardHeader: () => React.createElement('header', null, 'Header') };
  if (request === '@/lib/i18n/context') return { useI18n: () => ({ locale, setLocale() {}, t: key => getTranslation(locale, key, key) }) };
  return load.call(this, request, ...args);
};
const { Sidebar } = require('../components/Sidebar.tsx');
const { MobileNav } = require('../components/MobileNav.tsx');
const Layout = require('../app/dashboard/layout.tsx').default;
const { isSidebarCollapsed, sidebarPreferenceCookie, isSidebarItemActive } = require('../lib/sidebar-preference.ts');
const render = props => renderToStaticMarkup(React.createElement(Sidebar, { user, ...props }));

test('only the known cookie value collapses the sidebar; persistence is dashboard-scoped', () => {
  assert.equal(isSidebarCollapsed('collapsed'), true);
  for (const value of [undefined, '', 'expanded', 'true', '<script>']) assert.equal(isSidebarCollapsed(value), false);
  assert.equal(sidebarPreferenceCookie(true), 'vexim-sidebar=collapsed; Path=/dashboard; Max-Age=31536000; SameSite=Lax');
  assert.match(sidebarPreferenceCookie(false, true), /^vexim-sidebar=expanded;.*; Secure$/);
});

test('active states cover nested dossiers/services/accounting without matching unrelated prefixes', () => {
  assert.equal(isSidebarItemActive('/dashboard', '/dashboard'), true);
  assert.equal(isSidebarItemActive('/dashboard/ho-so', '/dashboard'), false);
  for (const route of ['ho-so', 'dich-vu', 'bao-gia', 'ke-toan', 'doanh-nghiep']) assert.equal(isSidebarItemActive(`/dashboard/${route}/12`, `/dashboard/${route}`), true);
  assert.equal(isSidebarItemActive('/dashboard/ho-so-other', '/dashboard/ho-so'), false);
  assert.equal(isSidebarItemActive('/dashboard/crm/co-hoi/1', '/dashboard/crm'), false);
  assert.equal(isSidebarItemActive('/dashboard/crm/co-hoi/1', '/dashboard/crm/pipeline'), true);
});

test('expanded desktop is 228px with full branding, labels, account and collapse control', () => {
  locale = 'vi'; const html = render();
  assert.match(html, /w-\[228px\]/); assert.match(html, /data-collapsed="false"/);
  assert.match(html, /Thu gọn thanh menu/); assert.match(html, /aria-expanded="true"/);
  assert.match(html, /Vexim.*Global/); assert.match(html, /Quản trị Vexim/);
  assert.match(html, /Kế Toán Thu Chi/); assert.match(html, /aria-current="page"/);
});

test('collapsed desktop is 64px but retains accessible link/logout names and full text brand', () => {
  const html = render({ initialCollapsed: true });
  assert.match(html, /w-\[64px\]/); assert.match(html, /data-collapsed="true"/);
  assert.match(html, /Mở rộng thanh menu/); assert.match(html, /aria-expanded="false"/);
  assert.match(html, /class="sr-only">Kế Toán Thu Chi/);
  assert.match(html, /class="sr-only">Đăng xuất/);
  assert.match(html, /Vexim.*Global/); assert.doesNotMatch(html, /<img/);
  assert.match(html, /aria-label="Quản trị Vexim/);
});

test('mobile always stays expanded and never exposes the desktop collapse toggle', () => {
  const html = render({ initialCollapsed: true, mobile: true });
  assert.match(html, /data-sidebar="mobile"/); assert.match(html, /w-\[268px\]/);
  assert.match(html, /data-collapsed="false"/);
  assert.doesNotMatch(html, /Mở rộng thanh menu|Thu gọn thanh menu/);
  const trigger = renderToStaticMarkup(React.createElement(MobileNav, { user }));
  assert.match(trigger, /aria-label="Mở menu"/); assert.match(trigger, /aria-expanded="false"/);
});

test('admin-only links remain hidden for specialists in either sidebar size', () => {
  for (const initialCollapsed of [true, false]) {
    const html = render({ user: { ...user, role: 'specialist' }, initialCollapsed });
    for (const route of ['ke-toan', 'nguoi-dung', 'doanh-thu', 'tong-quan']) assert.ok(!html.includes(`href="/dashboard/${route}"`));
    assert.ok(html.includes('href="/dashboard/ho-so"')); assert.ok(html.includes('href="/dashboard/dich-vu"'));
    // Nhân viên cũng lập được báo giá — đây không phải mục chỉ dành cho admin.
    assert.ok(html.includes('href="/dashboard/bao-gia"')); assert.ok(html.includes('Báo Giá Dịch Vụ'));
  }
});

test('new controls have English as well as Vietnamese labels', () => {
  locale = 'en'; assert.match(render(), /Collapse sidebar/); assert.match(render({ initialCollapsed: true }), /Expand sidebar/);
  assert.match(render(), /Main navigation/); locale = 'vi';
});

test('server layout restores the saved width on first render, avoiding a hydration flash', () => {
  cookie = 'collapsed';
  assert.match(renderToStaticMarkup(Layout({ children: 'Content' })), /data-collapsed="true"/);
  cookie = undefined;
  assert.match(renderToStaticMarkup(Layout({ children: 'Content' })), /data-collapsed="false"/);
});
