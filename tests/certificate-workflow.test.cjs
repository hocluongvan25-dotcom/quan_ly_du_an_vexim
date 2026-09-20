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
const publicApi = require('../app/api/public/certificates/[code]/route.ts');
const { publicCertificate } = require('../lib/certificate-workflow.ts');
const input = {
  standard: 'FDA', registration_code: 'REG-TEST', duns_code: '123456789', us_agent: 'Agent',
  company_name: 'Original company', company_email: 'original@example.com', scope: 'Original scope',
  service_price: 1000000, registered_at: '2026-01-01', validity_years: 2, created_by: 1,
};
function create(patch = {}) { return db.createCertificate({ ...input, ...patch }); }
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
  for (const field of ['pending_changes', 'service_price', 'company_email', 'created_by']) {
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
