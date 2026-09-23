// node --test tests/cache-freshness.test.cjs
// Bảo vệ chống lỗi "sửa hồ sơ rồi mà trang QR vẫn hiện bản cũ":
// Next.js 14 mặc định cache fetch()/GET route handler, nên mọi truy vấn Supabase và
// API công khai phải được đánh dấu không cache.
const { test, after } = require('node:test');
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
for (const ext of ['.ts', '.tsx']) {
  require.extensions[ext] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
}

// Supabase phải được cấu hình trước khi nạp module (client được memo hoá)
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';

const calls = [];
const realFetch = global.fetch;
global.fetch = (url, init = {}) => {
  calls.push({ url: String(url), init });
  return Promise.resolve(new Response(JSON.stringify([]), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  }));
};

const { supabaseAdmin } = require('../lib/supabase.ts');

test('mọi truy vấn Supabase gửi cache: "no-store" để không dùng lại bản cũ', async () => {
  calls.length = 0;
  await supabaseAdmin().from('certificates').select('*').eq('public_code', 'GBBA9ARGWS8L').maybeSingle();
  assert.ok(calls.length >= 1, 'phải có request thật lên Supabase');
  for (const call of calls) {
    assert.equal(call.init.cache, 'no-store', `truy vấn Supabase phải no-store: ${call.url}`);
  }
});

test('hai lần đọc liên tiếp đều gọi database, không trả lại kết quả đã lưu', async () => {
  calls.length = 0;
  const query = () => supabaseAdmin().from('certificates').select('company_address').eq('id', 8).maybeSingle();
  await query();
  await query();
  assert.equal(calls.length, 2, 'mỗi lần đọc phải là một request mới');
});

test('API công khai cho khách quét mã khai báo không cache', () => {
  const api = require('../app/api/public/certificates/[code]/route.ts');
  assert.equal(api.dynamic, 'force-dynamic');
  assert.equal(api.revalidate, 0);
  assert.equal(api.fetchCache, 'force-no-store');
  const src = fs.readFileSync(path.join(root, 'app/api/public/certificates/[code]/route.ts'), 'utf8');
  assert.match(src, /Cache-Control"?:?\s*"?no-store/, 'response phải có header Cache-Control: no-store');
});

test('trang quét QR khai báo không cache dữ liệu hồ sơ', () => {
  const src = fs.readFileSync(path.join(root, 'app/verify/[code]/page.tsx'), 'utf8');
  assert.match(src, /export const dynamic = "force-dynamic"/);
  assert.match(src, /export const revalidate = 0/);
  assert.match(src, /export const fetchCache = "force-no-store"/);
});

after(() => { global.fetch = realFetch; });
