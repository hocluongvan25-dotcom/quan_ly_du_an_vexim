// Run with Node 22+: node --test tests/certificate-workflow.test.cjs
// Uses an isolated temporary SQLite database, never the working app database.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const originalCwd = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vexim-certificate-test-'));
process.chdir(temp);
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  return resolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, ...args);
};
require.extensions['.ts'] = (mod, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  mod._compile(result.outputText, filename);
};
const db = require('../lib/db-sqlite.ts');
const auth = require('../lib/auth.ts');
let session = null;
auth.getSession = () => session;
const api = require('../app/api/certificates/[id]/route.ts');
const createApi = require('../app/api/certificates/route.ts');
const publicApi = require('../app/api/public/certificates/[code]/route.ts');
const { publicCertificate } = require('../lib/certificate-workflow.ts');
const input = {
  standard: 'FDA', registration_code: 'REG-TEST', duns_code: '123456789', us_agent: 'Agent',
  company_name: 'Original company', company_email: 'original@example.com', scope: 'Original scope',
  service_price: 1000000, registered_at: '2026-01-01', validity_years: 2, created_by: 1,
  portal_user: 'khach-hang-portal', portal_pass: 'MatKhau@123',
};
function create(patch = {}) { return db.createCertificate({ ...input, ...patch }); }
function expiryFromStandardForTest(registeredAt, years) {
  const [y, m, d] = registeredAt.split('-').map(Number);
  return new Date(Date.UTC(y + years, m - 1, d)).toISOString().slice(0, 10);
}
function ctx(id) { return { params: { id: String(id) } }; }
function put(id, body) {
  return api.PUT(new Request(`http://test/api/certificates/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }), ctx(id));
}
after(() => {
  process.chdir(originalCwd);
  fs.rmSync(temp, { recursive: true, force: true });
});

test('published edits wait for approval; QR, public data and revenue stay unchanged', async () => {
  const id = create();
  const original = db.publishCertificate(id);
  db.updateCertificate(id, { ...original, company_name: 'Proposed company', service_price: 2000000 });
  const pending = db.getCertificate(id);
  assert.equal(pending.company_name, original.company_name);
  assert.equal(pending.service_price, original.service_price);
  assert.equal(pending.pending_changes.company_name, 'Proposed company');
  assert.equal(pending.public_code, original.public_code);
  assert.equal(pending.validity_confirmed, 1);
  assert.equal(pending.status, 'published');
  assert.equal(pending.published_at, original.published_at);
  const response = await publicApi.GET(new Request('http://test'), { params: { code: original.public_code } });
  const publicItem = (await response.json()).item;
  assert.equal(publicItem.company_name, original.company_name);
  for (const field of ['pending_changes', 'service_price', 'company_email', 'created_by', 'portal_user', 'portal_pass']) {
    assert.equal(field in publicItem, false);
    assert.equal(field in publicCertificate(pending), false);
  }
  const approved = db.publishCertificate(id, pending.updated_at);
  assert.equal(approved.company_name, 'Proposed company');
  assert.equal(approved.service_price, 2000000);
  assert.equal(approved.pending_changes, null);
  assert.equal(approved.public_code, original.public_code);
  assert.equal(approved.published_at, original.published_at);
});

test('thông tin đăng nhập của khách chỉ lưu nội bộ: không lên QR, API công khai hay email', async () => {
  session = { id: 1, email: 'specialist@veximglobal.com', name: 'Specialist', role: 'specialist' };
  const id = create();
  const saved = db.getCertificate(id);
  assert.equal(saved.portal_user, 'khach-hang-portal');
  assert.equal(saved.portal_pass, 'MatKhau@123');
  assert.deepEqual(db.listCertificates().find((c) => c.id === id).portal_pass, 'MatKhau@123');

  const published = db.publishCertificate(id);

  // 1. Allowlist công khai tuyệt đối không chứa 2 trường này
  const publicPayload = publicCertificate(published);
  assert.equal('portal_user' in publicPayload, false);
  assert.equal('portal_pass' in publicPayload, false);

  // 2. JSON thật của API công khai (khách quét QR gọi) không chứa user/pass
  const res = await publicApi.GET(new Request('http://test'), { params: { code: published.public_code } });
  const text = await res.text();
  assert.equal(text.includes('MatKhau@123'), false, 'mật khẩu không được lộ trong API công khai');
  assert.equal(text.includes('khach-hang-portal'), false, 'user không được lộ trong API công khai');
  assert.equal('portal_pass' in JSON.parse(text).item, false);

  // 3. Sửa qua API cũng đi theo luồng duyệt: bản công khai giữ nguyên tới khi admin duyệt
  const body = {
    standard: published.standard, registration_code: published.registration_code,
    duns_code: published.duns_code, us_agent: published.us_agent,
    service_price: published.service_price, company_name: published.company_name,
    company_email: published.company_email, scope: published.scope,
    registered_at: published.registered_at, validity_years: published.validity_years,
    expected_updated_at: published.updated_at,
    portal_user: 'khach-hang-portal-2', portal_pass: 'MatKhauMoi@456',
  };
  const putRes = await put(id, body);
  assert.equal(putRes.status, 200);
  const pending = db.getCertificate(id);
  assert.equal(pending.portal_pass, 'MatKhau@123', 'chưa duyệt thì bản đang lưu không đổi');
  assert.equal(pending.pending_changes.portal_pass, 'MatKhauMoi@456');
  assert.equal(pending.public_code, published.public_code);

  const approved = db.publishCertificate(id, pending.updated_at);
  assert.equal(approved.portal_user, 'khach-hang-portal-2');
  assert.equal(approved.portal_pass, 'MatKhauMoi@456');
  assert.deepEqual(approved.public_code, published.public_code);
});

test('maskCredential chỉ hiện dấu chấm khi đối chiếu bản chờ duyệt', () => {
  session = null;
  const { maskCredential } = require('../lib/certificate-workflow.ts');
  assert.equal(maskCredential('MatKhau@123'), '••••••••••');
  assert.equal(maskCredential('1234567890123456'), '••••••••••');
  assert.equal(maskCredential(''), '');
  assert.equal(maskCredential('   '), '');
});

test('no-op save/publish and repeated reads do not reset QR, dates or timestamps', () => {
  const id = create();
  const original = db.publishCertificate(id);
  db.updateCertificate(id, original);
  assert.deepEqual(db.getCertificate(id), original);
  assert.deepEqual(db.publishCertificate(id), original);
  assert.deepEqual(db.getCertificateByPublicCode(original.public_code).public_code, original.public_code);
});

test('renewed expiry survives metadata edits, approval and repeat publishing', () => {
  const id = create();
  db.publishCertificate(id);
  const renewed = db.renewCertificate(id, 200000, 2);
  assert.notEqual(renewed.expires_at, '2028-01-01');
  db.updateCertificate(id, { ...renewed, scope: 'Updated scope' });
  assert.equal(db.getCertificate(id).pending_changes.expires_at, renewed.expires_at);
  const approved = db.publishCertificate(id);
  assert.equal(approved.expires_at, renewed.expires_at);
  assert.equal(approved.renewal_count, renewed.renewal_count);
  assert.equal(approved.service_price, renewed.service_price);
  assert.equal(db.publishCertificate(id).expires_at, renewed.expires_at);
});

test('date edits remain pending, and expiry changes only on approval', () => {
  const id = create();
  const original = db.publishCertificate(id);
  db.updateCertificate(id, { ...original, registered_at: '2027-01-01' });
  const pending = db.getCertificate(id);
  assert.equal(pending.expires_at, original.expires_at);
  assert.notEqual(pending.pending_changes.expires_at, original.expires_at);
  assert.equal(db.publishCertificate(id).expires_at, pending.pending_changes.expires_at);
});

test('draft edits are saved and stay private; legacy confirmation uses approval', async () => {
  const id = create();
  db.updateCertificate(id, { ...input, company_name: 'Draft edited' });
  const draft = db.getCertificate(id);
  assert.equal(draft.status, 'draft');
  assert.equal(draft.company_name, 'Draft edited');
  const response = await publicApi.GET(new Request('http://test'), { params: { code: draft.public_code } });
  assert.equal(response.status, 404);
  assert.equal(db.confirmValidity(id).status, 'published');
});

test('stale approval/save rejected and reverting pending edits is a no-publication change', () => {
  const id = create();
  const original = db.publishCertificate(id);
  db.updateCertificate(id, { ...original, scope: 'Pending scope' });
  assert.throws(() => db.publishCertificate(id, original.updated_at), /CONFLICT/);
  assert.throws(() => db.updateCertificate(id, original, original.updated_at), /CONFLICT/);
  const pending = db.getCertificate(id);
  db.updateCertificate(id, { ...original, ...pending.pending_changes });
  assert.equal(db.getCertificate(id).updated_at, pending.updated_at);
  db.updateCertificate(id, original);
  const reverted = db.getCertificate(id);
  assert.equal(reverted.pending_changes, null);
  assert.equal(reverted.public_code, original.public_code);
  assert.equal(reverted.company_name, original.company_name);
});

test('renewal cannot bypass approval of drafts or pending edits', () => {
  const id = create();
  assert.throws(() => db.renewCertificate(id), /APPROVAL_REQUIRED/);
  const published = db.publishCertificate(id);
  db.updateCertificate(id, { ...published, scope: 'Pending' });
  assert.throws(() => db.renewCertificate(id), /APPROVAL_REQUIRED/);
});

test('API: staff may edit but cannot publish/confirm/renew, admin must review current version', async () => {
  const id = create();
  const original = db.publishCertificate(id);
  session = null;
  assert.equal((await put(id, input)).status, 401);
  session = { id: 2, role: 'specialist' };
  for (const action of ['publish', 'confirm', 'renew']) {
    assert.equal((await put(id, { action, expected_updated_at: original.updated_at })).status, 403);
  }
  assert.equal((await put(id, { ...original, scope: 'Staff edit', expected_updated_at: original.updated_at })).status, 200);
  const pending = db.getCertificate(id);
  assert.equal(pending.scope, original.scope);
  assert.equal(pending.pending_changes.scope, 'Staff edit');
  session = { id: 1, role: 'admin' };
  assert.equal((await put(id, { action: 'publish' })).status, 400);
  assert.equal((await put(id, { action: 'publish', expected_updated_at: original.updated_at })).status, 409);
  assert.equal((await put(id, { action: 'publish', expected_updated_at: pending.updated_at })).status, 200);
  assert.equal(db.getCertificate(id).scope, 'Staff edit');
  const get = await api.GET(new Request('http://test'), ctx(id));
  assert.equal(get.headers.get('cache-control'), 'no-store');
});

test('thời hạn hợp đồng chọn 1-10 năm: ngày hết hạn tự tính, không còn cố định 2/5 năm', () => {
  const types = require('../lib/types.ts');
  const { expiryFromStandard, getValidityYears } = require('../lib/utils.ts');

  // Mặc định giữ nguyên: FDA 2 năm, GACC 5 năm
  assert.equal(types.getDefaultValidity('FDA'), 2);
  assert.equal(types.getDefaultValidity('GACC'), 5);
  assert.deepEqual(types.getValidityOptionsForStandard('FDA'), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(types.getValidityOptionsForStandard('GACC'), [5], 'GACC chỉ có 5 năm, không cho chọn');
  assert.equal(types.canChooseValidityYears('FDA'), true);
  assert.equal(types.canChooseValidityYears('GACC'), false, 'GACC không được cho chọn số năm');
  assert.equal(types.isValidValidityYearsForStandard(4, 'GACC'), false);
  assert.equal(types.isValidValidityYearsForStandard(5, 'GACC'), true);
  assert.equal(types.resolveValidityYears(4, 'GACC'), 5, 'GACC gửi số năm khác vẫn về 5');
  assert.equal(types.isInvalidValidityInput(4, 'GACC'), true);
  assert.equal(types.isInvalidValidityInput(5, 'GACC'), false);
  assert.equal(types.resolveValidityYears(undefined, 'FDA'), 2);
  assert.equal(types.resolveValidityYears('', 'GACC'), 5);
  assert.equal(types.resolveValidityYears(3, 'FDA'), 3);
  assert.equal(types.isInvalidValidityInput(''), false, 'bỏ trống thì lấy mặc định, không phải lỗi');
  assert.equal(types.isInvalidValidityInput(0), true);
  assert.equal(types.isInvalidValidityInput(11), true);
  assert.equal(types.isInvalidValidityInput('abc'), true);

  // Mọi số năm 1-10 đều tính được ngày hết hạn
  assert.equal(expiryFromStandard('2026-01-01', 'FDA', 1), '2027-01-01');
  assert.equal(expiryFromStandard('2026-01-01', 'FDA', 3), '2029-01-01');
  assert.equal(expiryFromStandard('2026-01-01', 'GACC', 4), '2031-01-01', 'GACC luôn tính 5 năm');
  assert.equal(expiryFromStandard('2026-01-01', 'FDA', 10), '2036-01-01');

  // Lưu thật: FDA 3 năm và GACC 4 năm
  const fda = db.getCertificate(create({ validity_years: 3, registered_at: '2026-01-01' }));
  assert.equal(fda.validity_years, 3);
  assert.equal(fda.expires_at, '2029-01-01');
  assert.equal(getValidityYears(fda), 3);

  const gacc = db.getCertificate(create({ standard: 'GACC', validity_years: 4, registered_at: '2026-01-01' }));
  assert.equal(gacc.validity_years, 5, 'GACC luôn 5 năm, không nhận 4');
  assert.equal(gacc.expires_at, '2031-01-01');
  assert.equal(getValidityYears(gacc), 5);

  // Sửa số năm của hồ sơ nháp -> tính lại ngày hết hạn ngay
  db.updateCertificate(fda.id, { ...fda, validity_years: 7 });
  const widened = db.getCertificate(fda.id);
  assert.equal(widened.validity_years, 7);
  assert.equal(widened.expires_at, '2033-01-01');

  // Hồ sơ đã xuất bản: đổi số năm phải chờ duyệt, ngày công khai chưa đổi
  const published = db.publishCertificate(fda.id);
  db.updateCertificate(fda.id, { ...published, validity_years: 2 });
  const pending = db.getCertificate(fda.id);
  assert.equal(pending.expires_at, published.expires_at);
  assert.equal(pending.pending_changes.validity_years, 2);
  const approved = db.publishCertificate(fda.id, pending.updated_at);
  assert.equal(approved.validity_years, 2);
  assert.equal(approved.expires_at, '2028-01-01');
});

test('API tạo/sửa/gia hạn nhận số năm 1-10 và từ chối giá trị ngoài khoảng', async () => {
  session = { id: 1, role: 'admin' };
  const post = (body) => createApi.POST(new Request('http://test/api/certificates', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }));
  const base = {
    standard: 'FDA', registration_code: 'REG-YEARS', company_name: 'Công ty chọn năm',
    scope: 'Phạm vi', registered_at: '2026-01-01',
  };

  assert.equal((await post({ ...base, validity_years: 11 })).status, 400);
  assert.equal((await post({ ...base, validity_years: 0 })).status, 400);
  assert.equal((await post({ ...base, validity_years: 'nhiều' })).status, 400);

  const created = await post({ ...base, validity_years: 6 });
  assert.equal(created.status, 200);
  const id = (await created.json()).id;
  const six = db.getCertificate(id);
  assert.equal(six.validity_years, 6);
  assert.equal(six.expires_at, '2032-01-01');

  // Bỏ trống -> mặc định theo tiêu chuẩn (FDA 2 năm)
  const defaulted = await post({ ...base, registration_code: 'REG-YEARS-2', company_name: 'Công ty mặc định' });
  assert.equal(db.getCertificate((await defaulted.json()).id).validity_years, 2);

  // Sửa qua API với số năm 9
  const published = db.publishCertificate(id);
  const putRes = await put(id, { ...published, validity_years: 9, expected_updated_at: published.updated_at });
  assert.equal(putRes.status, 200);
  assert.equal(db.getCertificate(id).pending_changes.validity_years, 9);
  assert.equal((await put(id, { ...published, validity_years: 12 })).status, 400);

  // Gia hạn theo số năm chọn (7 năm) - chỉ áp dụng cho FDA
  const approved = db.publishCertificate(id);
  const renewed = await put(id, { action: 'renew', validity_years: 7, renew_years: 7, extra_fee: 0, expected_updated_at: approved.updated_at });
  assert.equal(renewed.status, 200);
  const afterRenew = db.getCertificate(id);
  assert.equal(afterRenew.validity_years, 7);
  assert.equal(afterRenew.expires_at, expiryFromStandardForTest(approved.expires_at, 7));
  assert.equal((await put(id, { action: 'renew', validity_years: 15 })).status, 400);
});

test('GACC là 5 năm cố định: API không nhận số năm khác, ngày hết hạn luôn +5', async () => {
  session = { id: 1, role: 'admin' };
  const post = (body) => createApi.POST(new Request('http://test/api/certificates', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }));
  const base = { standard: 'GACC', registration_code: 'REG-GACC-FIX', company_name: 'Công ty GACC', scope: 'Phạm vi', registered_at: '2026-01-01' };

  for (const years of [1, 4, 6, 10]) {
    const res = await post({ ...base, validity_years: years });
    assert.equal(res.status, 400, `GACC không được nhận ${years} năm`);
    assert.match((await res.json()).error, /GACC cố định 5 năm/);
  }

  const ok = await post({ ...base, validity_years: 5 });
  assert.equal(ok.status, 200);
  const gacc = db.getCertificate((await ok.json()).id);
  assert.equal(gacc.validity_years, 5);
  assert.equal(gacc.expires_at, '2031-01-01');

  // Bỏ trống cũng là 5 năm
  const blank = await post({ ...base, registration_code: 'REG-GACC-FIX-2' });
  assert.equal(db.getCertificate((await blank.json()).id).validity_years, 5);

  // Sửa/sửa hồ sơ GACC sang số năm khác bị chặn, gia hạn cũng vậy
  const published = db.publishCertificate(gacc.id);
  const edited = await put(gacc.id, { ...published, validity_years: 3, expected_updated_at: published.updated_at });
  assert.equal(edited.status, 400);
  assert.match((await edited.json()).error, /GACC cố định 5 năm/);
  const renewed = await put(gacc.id, { action: 'renew', validity_years: 3, renew_years: 3, expected_updated_at: published.updated_at });
  assert.equal(renewed.status, 400);
  assert.match((await renewed.json()).error, /GACC cố định 5 năm/);
  assert.equal(db.getCertificate(gacc.id).validity_years, 5, 'GACC giữ nguyên 5 năm');

  // Gia hạn hợp lệ cho GACC: vẫn 5 năm
  const okRenew = await put(gacc.id, { action: 'renew', validity_years: 5, renew_years: 5, extra_fee: 0, expected_updated_at: published.updated_at });
  assert.equal(okRenew.status, 200);
  const afterRenew = db.getCertificate(gacc.id);
  assert.equal(afterRenew.validity_years, 5);
  assert.equal(afterRenew.expires_at, '2036-01-01');
});

test('GACC and expired published certificates keep their QR during review', () => {
  const id = create({ standard: 'GACC', validity_years: 5, registered_at: '2010-01-01' });
  const original = db.publishCertificate(id);
  assert.equal(original.status, 'expired');
  db.updateCertificate(id, { ...original, company_name: 'GACC edit' });
  const pending = db.getCertificate(id);
  assert.equal(pending.public_code, original.public_code);
  assert.equal(pending.pending_changes.duns_code, '');
  assert.equal(pending.pending_changes.us_agent, '');
  assert.equal(db.publishCertificate(id).status, 'expired');
});

test('Supabase adapter contract (mocked client): staging, approval, no-op and concurrent-write protection', async () => {
  const cloud = require('../lib/db-supabase.ts');
  const supabase = require('../lib/supabase.ts');
  const originalClient = supabase.supabaseAdmin;
  const id = create();
  let row = { ...db.publishCertificate(id), expires_at: '2030-01-01', renewal_count: 1 };
  let writes = 0;
  let beforeWrite;
  supabase.supabaseAdmin = () => ({
    from(table) {
      if (table !== 'certificates') throw new Error('Company sync excluded from mock');
      const filters = [];
      let payload;
      return {
        select() { return this; },
        eq(key, value) { filters.push([key, value]); return this; },
        update(value) { payload = value; return this; },
        async maybeSingle() {
          if (payload && beforeWrite) { beforeWrite(); beforeWrite = undefined; }
          if (!filters.every(([key, value]) => row[key] === value)) return { data: null, error: null };
          if (payload) { row = { ...row, ...structuredClone(payload) }; writes++; }
          return { data: structuredClone(row), error: null };
        },
      };
    },
  });
  try {
    const original = await cloud.getCertificate(id);
    await cloud.updateCertificate(id, original);
    await cloud.publishCertificate(id);
    assert.equal(writes, 0);
    await cloud.updateCertificate(id, { ...original, scope: 'Cloud pending' }, original.updated_at);
    assert.equal(row.scope, original.scope);
    assert.equal(row.pending_changes.scope, 'Cloud pending');
    assert.equal(row.pending_changes.expires_at, '2030-01-01');
    const pending = await cloud.getCertificate(id);
    await cloud.publishCertificate(id, pending.updated_at);
    assert.equal(row.scope, 'Cloud pending');
    assert.equal(row.pending_changes, null);
    assert.equal(row.public_code, original.public_code);
    assert.equal(row.published_at, original.published_at);
    assert.equal(row.expires_at, '2030-01-01');
    const latest = await cloud.getCertificate(id);
    await cloud.updateCertificate(id, { ...latest, scope: 'Needs review' });
    beforeWrite = () => { row.updated_at = '2040-01-01T00:00:00.000Z'; };
    await assert.rejects(cloud.publishCertificate(id), /CONFLICT/);
    assert.equal(row.pending_changes.scope, 'Needs review');
    assert.equal(row.scope, 'Cloud pending');
  } finally {
    supabase.supabaseAdmin = originalClient;
  }
});
