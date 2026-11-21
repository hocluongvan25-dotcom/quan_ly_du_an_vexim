/**
 * Kiểm thử tra cứu công khai:
 * - Tìm theo số đăng ký (có/không dấu gạch) và theo tên doanh nghiệp (có/không dấu).
 * - Tình trạng: còn hiệu lực, sắp hết hạn, hết hiệu lực.
 * - Không lộ dữ liệu nội bộ: phí dịch vụ, email, tài khoản cổng khách hàng.
 * - Hồ sơ nháp và hồ sơ chưa xác nhận hiệu lực không xuất hiện như hồ sơ còn hiệu lực.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
for (const ext of ['.ts', '.tsx']) {
  require.extensions[ext] = (mod, filename) => {
    mod._compile(
      ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
        },
      }).outputText,
      filename,
    );
  };
}
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  return resolveFilename.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, ...args);
};

const lookup = require('../lib/public-lookup.ts');

const DAY = 24 * 60 * 60 * 1000;
const iso = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);

const record = (overrides = {}) => ({
  id: 1,
  public_code: 'FACE12345678',
  certificate_no: 'VXM-FDA-2026-001',
  standard: 'FDA',
  registration_code: '17200998877',
  duns_code: '123456789',
  us_agent: '',
  service_price: 12000000,
  company_name: 'Bình Minh Seafood Co., Ltd',
  company_email: 'secret@example.com',
  company_address: 'Hà Nội',
  portal_user: 'portal-user',
  portal_pass: 'portal-pass',
  scope: 'Thủy sản',
  registered_at: iso(-400),
  expires_at: iso(400),
  validity_years: 2,
  validity_confirmed: 1,
  status: 'published',
  published_at: iso(-390),
  revenue_recorded: 1,
  renewal_count: 0,
  last_renewed_at: null,
  created_by: 1,
  created_at: iso(-400),
  updated_at: iso(-1),
  ...overrides,
});

test('bỏ dấu tiếng Việt và ký tự phân cách khi so khớp', () => {
  assert.equal(lookup.normalizeText('Bình Minh  SEAFOOD'), 'binh minh seafood');
  assert.equal(lookup.normalizeText('Đăng ký FDA'), 'dang ky fda');
  assert.equal(lookup.normalizeCode('VN-GACC-330 987.65432'), 'vngacc33098765432');
});

test('tìm theo tên doanh nghiệp, không phân biệt dấu và chữ hoa', () => {
  const items = [record()];
  assert.equal(lookup.searchPublicRecords(items, 'FDA', 'binh minh').length, 1);
  assert.equal(lookup.searchPublicRecords(items, 'FDA', 'BÌNH MINH').length, 1);
  assert.equal(lookup.searchPublicRecords(items, 'FDA', 'minh seafood').length, 1);
  assert.equal(lookup.searchPublicRecords(items, 'FDA', 'mekong').length, 0);
});

test('tìm theo số đăng ký, có hoặc không có dấu gạch', () => {
  const gacc = record({ standard: 'GACC', registration_code: 'VN-GACC-33098765432', public_code: 'F8P8EABZEHB9' });
  assert.equal(lookup.searchPublicRecords([gacc], 'GACC', 'VN-GACC-33098765432').length, 1);
  assert.equal(lookup.searchPublicRecords([gacc], 'GACC', 'vngacc33098765432').length, 1);
  assert.equal(lookup.searchPublicRecords([gacc], 'GACC', '3309876').length, 1);
  assert.equal(lookup.searchPublicRecords([gacc], 'GACC', '999999999').length, 0);
});

test('chỉ trả về đúng loại mã đang chọn', () => {
  const items = [record(), record({ id: 2, standard: 'GACC', registration_code: 'VN-GACC-44012345678', public_code: 'FGACC0000001' })];
  assert.equal(lookup.searchPublicRecords(items, 'FDA', 'co').length, 1);
  assert.equal(lookup.searchPublicRecords(items, 'GACC', 'co').length, 1);
  assert.equal(lookup.searchPublicRecords(items, 'GACC', 'binh')[0].standard, 'GACC');
});

test('tình trạng còn hiệu lực, sắp hết hạn và hết hiệu lực', () => {
  assert.equal(lookup.certificateLookupStatus(record({ expires_at: iso(400) })), 'valid');
  assert.equal(lookup.certificateLookupStatus(record({ expires_at: iso(30) })), 'expiring');
  assert.equal(lookup.certificateLookupStatus(record({ expires_at: iso(-1) })), 'expired');
  assert.equal(lookup.certificateLookupStatus(record({ expires_at: iso(400), validity_confirmed: 0 })), 'expired');
});

test('hồ sơ nháp không xuất hiện trong tra cứu', () => {
  const items = [record({ status: 'draft' })];
  assert.equal(lookup.searchPublicRecords(items, 'FDA', 'binh minh').length, 0);
});

test('mỗi hồ sơ trả về đúng bốn trường công bố và mã công khai', () => {
  const [item] = lookup.searchPublicRecords([record()], 'FDA', 'binh minh');
  assert.deepEqual(Object.keys(item).sort(), [
    'company_name',
    'expires_at',
    'public_code',
    'standard',
    'status',
  ]);
  assert.equal(item.company_name, 'Bình Minh Seafood Co., Ltd');
  assert.equal(item.standard, 'FDA');
  assert.equal(item.status, 'valid');
  assert.equal(item.expires_at, iso(400));
  assert.equal(item.public_code, 'FACE12345678');

  /* Không lộ dữ liệu nội bộ dưới bất kỳ dạng nào. */
  const serialized = JSON.stringify(item);
  assert.ok(!serialized.includes('secret@example.com'));
  assert.ok(!serialized.includes('portal-user'));
  assert.ok(!serialized.includes('12000000'));
  assert.ok(!serialized.includes('17200998877'));
});

test('giới hạn số kết quả và định dạng ngày dd/mm/yyyy', () => {
  const many = Array.from({ length: 9 }, (_, index) =>
    record({ id: index + 1, public_code: `FACE0000000${index}` }),
  );
  assert.equal(lookup.searchPublicRecords(many, 'FDA', 'binh minh').length, lookup.LOOKUP_RESULT_LIMIT);
  assert.equal(lookup.formatLookupDate('2026-12-31'), '31/12/2026');
  assert.equal(lookup.formatLookupDate(iso(0)), new Date().toISOString().slice(0, 10).split('-').reverse().join('/'));
});

test('API tra cứu chỉ trả các trường công khai và không cache', () => {
  const source = fs.readFileSync(path.join(root, 'app/api/public/lookup/route.ts'), 'utf8');
  assert.match(source, /export const dynamic = "force-dynamic"/);
  assert.match(source, /no-store/);
  assert.match(source, /searchPublicRecords/, 'dùng chung logic lọc với unit test');
  assert.ok(!source.includes('service_price'));
  assert.ok(!source.includes('portal_'));
});
