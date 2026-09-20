// Isolated SQLite + mocked Supabase tests; never connects to production.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const cwd = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vexim-invoice-contract-'));
process.chdir(temp);
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
const resolve = Module._resolveFilename;
Module._resolveFilename = function(request, ...args) {
  return resolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, ...args);
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (mod, filename) => {
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
};
// Simulate a pre-migration installation with an already-issued invoice.
fs.mkdirSync('data');
const old = new DatabaseSync('data/vexim.db');
old.exec('PRAGMA foreign_keys=OFF');
const schema = fs.readFileSync(path.join(root, 'lib/db-sqlite.ts'), 'utf8').match(/CREATE TABLE IF NOT EXISTS invoices \([\s\S]*?\);/)[0]
  .replace(/\s+contract_no TEXT NOT NULL DEFAULT '',/, '').replace(/\s+payment_request TEXT,/, '');
old.exec(schema);
old.exec("INSERT INTO invoices (invoice_no,ref_type,ref_id,subtotal,vat_amount,total,issue_date) VALUES ('LEGACY-001','certificate',1,10000000,800000,10800000,'2026-09-20')");
old.close();
const db = require('../lib/db-sqlite.ts');
const auth = require('../lib/auth.ts');
let session = { id: 1, role: 'admin', name: 'Test Admin' };
auth.getSession = () => session;
const createApi = require('../app/api/invoices/route.ts');
const invoiceApi = require('../app/api/invoices/[id]/route.ts');
const PrintPage = require('../app/dashboard/ke-toan/hoa-don/[id]/in/page.tsx').default;
const { normalizeInvoiceContractNo } = require('../lib/accounting.ts');
const data = { ref_type: 'certificate', ref_id: 1, subtotal: 10000000, vat_rate: 8 };
const create = (patch = {}) => db.createInvoice({ ...data, ...patch }, 1);
const request = (body, method = 'POST') => new Request('http://test/api/invoices', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const ctx = id => ({ params: { id: String(id) } });
after(() => { process.chdir(cwd); fs.rmSync(temp, { recursive: true, force: true }); });

test('legacy migration keeps invoice totals and IDs, adds only a blank reference', () => {
  const inv = db.getInvoice(1);
  assert.equal(inv.invoice_no, 'LEGACY-001');
  assert.equal(inv.contract_no, '');
  assert.equal(inv.total, 10800000);
  assert.equal(inv.vat_amount, 800000);
  // A second open runs the migration again safely.
  delete require.cache[require.resolve('../lib/db-sqlite.ts')];
  assert.equal(require('../lib/db-sqlite.ts').getInvoice(1).total, 10800000);
});

test('manual contract number persists, is searchable and does not change VAT', () => {
  const id = create({ contract_no: '  158/2026/HĐDV-VEXIM  ' });
  const inv = db.getInvoice(id);
  assert.equal(inv.contract_no, '158/2026/HĐDV-VEXIM');
  assert.equal(inv.subtotal, 10000000);
  assert.equal(inv.vat_amount, 800000);
  assert.equal(inv.total, 10800000);
  assert.notEqual(inv.invoice_no, inv.contract_no);
  assert.equal(db.listInvoices({ q: 'hđdv-vexim' }).find(i => i.id === id).contract_no, inv.contract_no);
});

test('service invoices snapshot the source number, allow override/clear, never rename the source', () => {
  const ref_id = db.createServiceContract({ service_type: 'AMAZON_OPS', company_name: 'Test company', started_at: '2026-09-20', cycle_months: 6 }, 1);
  const contractNo = db.getServiceContract(ref_id).contract_no;
  const id = create({ ref_type: 'service_contract', ref_id });
  assert.equal(db.getInvoice(id).contract_no, contractNo);
  const override = create({ ref_type: 'service_contract', ref_id, contract_no: 'CLIENT-002' });
  assert.equal(db.getInvoice(override).contract_no, 'CLIENT-002');
  db.updateInvoice(override, { contract_no: '' });
  assert.equal(db.getInvoice(override).contract_no, '');
  assert.equal(db.getServiceContract(ref_id).contract_no, contractNo);
  const raw = new DatabaseSync('data/vexim.db');
  raw.prepare('UPDATE service_contracts SET contract_no=? WHERE id=?').run('SOURCE-RENAMED', ref_id);
  raw.close();
  assert.equal(db.getInvoice(id).contract_no, contractNo, 'historical reference stays fixed');
});

test('optional field does not block old clients and unrelated edits preserve it', () => {
  const id = create();
  assert.equal(db.getInvoice(id).contract_no, '');
  db.updateInvoice(id, { contract_no: 'REF-003' });
  db.updateInvoice(id, { title: 'Updated content' });
  assert.equal(db.getInvoice(id).contract_no, 'REF-003');
  db.updateInvoice(id, { contract_no: '  ' });
  assert.equal(db.getInvoice(id).contract_no, '');
});

test('editing a paid invoice reference preserves all financials; existing restrictions remain', () => {
  const id = create({ contract_no: 'REF-BEFORE' });
  db.createPayment(id, { amount: 500000 }, 1);
  const before = db.getInvoice(id);
  db.updateInvoice(id, { contract_no: 'REF-AFTER' });
  const after = db.getInvoice(id);
  for (const field of ['subtotal','vat_rate','vat_amount','total','paid_amount','remaining','state']) assert.equal(after[field], before[field]);
  assert.deepEqual(after.payments, before.payments);
  assert.throws(() => db.updateInvoice(id, { contract_no: 'SHOULD-NOT-SAVE', subtotal: 2 }), /HAS_PAYMENTS/);
  assert.equal(db.getInvoice(id).contract_no, 'REF-AFTER');
  const cancelled = create(); db.cancelInvoice(cancelled);
  assert.throws(() => db.updateInvoice(cancelled, { contract_no: 'NO' }), /CANCELLED/);
});

test('validation preserves punctuation/Unicode and refuses oversized or non-text values', () => {
  assert.equal(normalizeInvoiceContractNo('  01/HĐ-2026.A  '), '01/HĐ-2026.A');
  assert.equal(normalizeInvoiceContractNo('0'), '0');
  assert.equal(normalizeInvoiceContractNo('x'.repeat(100)).length, 100);
  for (const value of ['x'.repeat(101), 123, {}, 'REF\nSECOND', 'REF\u0000']) assert.throws(() => normalizeInvoiceContractNo(value));
});

test('API admin create/read/update contract number; employee writes remain forbidden', async () => {
  session = { id: 2, role: 'specialist' };
  assert.equal((await createApi.POST(request({ ...data, contract_no: 'FORBIDDEN' }))).status, 403);
  assert.equal((await invoiceApi.PATCH(request({ contract_no: 'FORBIDDEN' }, 'PATCH'), ctx(1))).status, 403);
  session = null;
  assert.equal((await createApi.POST(request(data))).status, 401);
  session = { id: 1, role: 'admin', name: 'Test Admin' };
  const response = await createApi.POST(request({ ...data, contract_no: ' API-REF ' }));
  assert.equal(response.status, 200);
  const { id } = await response.json();
  const got = await invoiceApi.GET(new Request('http://test'), ctx(id));
  assert.equal((await got.json()).item.contract_no, 'API-REF');
  const updated = await invoiceApi.PATCH(request({ contract_no: 'API-EDITED' }, 'PATCH'), ctx(id));
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).item.contract_no, 'API-EDITED');
});

test('printed invoice shows the stored reference and safely escapes text', async () => {
  session = { id: 1, role: 'admin', name: 'Test Admin' };
  const id = create({ contract_no: 'PRINT/<REF>&2026' });
  const html = renderToStaticMarkup(await PrintPage(ctx(id)));
  assert.ok(html.includes('Số hợp đồng:'));
  assert.ok(html.includes('PRINT/&lt;REF&gt;&amp;2026'));
  assert.ok(!html.includes('<REF>'));
  assert.ok(html.includes('10.800.000'));
});

test('Supabase adapter (mock): create, snapshot default, update and read reference without touching totals', async () => {
  const cloud = require('../lib/db-supabase.ts');
  const supabase = require('../lib/supabase.ts');
  const previous = supabase.supabaseAdmin;
  const tables = {
    certificates: [{ id: 1, certificate_no: 'CERT-001', company_name: 'Company', standard: 'FDA' }],
    service_contracts: [{ id: 1, contract_no: 'SOURCE-001', company_name: 'Company', service_type: 'AMAZON_OPS' }],
    staff_users: [{ id: 1, name: 'Admin', email: 'test@example.com', role: 'admin' }],
    invoices: [], invoice_payments: [],
  };
  supabase.supabaseAdmin = () => ({ from(table) {
    let filters = [], payload, mode = 'read', max, ordering = [];
    const query = {
      select() { return this; }, eq(key, value) { filters.push(r => r[key] === value); return this; },
      like(key, value) { filters.push(r => String(r[key]).startsWith(value.replace(/%$/, ''))); return this; },
      order(key, opts) { ordering.push([key, opts?.ascending]); return this; }, limit(n) { max = n; return this; },
      insert(value) { mode = 'insert'; payload = value; return this; }, update(value) { mode = 'update'; payload = value; return this; },
      execute(single = false) {
        let rows = tables[table].filter(r => filters.every(f => f(r)));
        if (mode === 'insert') { const row = { id: tables[table].length + 1, status: 'issued', ...structuredClone(payload) }; tables[table].push(row); rows = [row]; }
        if (mode === 'update') rows.forEach(r => Object.assign(r, structuredClone(payload)));
        for (const [key, asc] of ordering.reverse()) rows = rows.toSorted((a,b) => String(a[key]).localeCompare(String(b[key])) * (asc ? 1 : -1));
        if (max) rows = rows.slice(0,max);
        return { data: structuredClone(single ? rows[0] || null : rows), error: null, count: rows.length };
      },
      single() { return Promise.resolve(this.execute(true)); }, maybeSingle() { return Promise.resolve(this.execute(true)); },
      then(resolve, reject) { return Promise.resolve(this.execute()).then(resolve,reject); },
    };
    return query;
  }});
  try {
    const id = await cloud.createInvoice({ ...data, contract_no: ' CLOUD/001 ' }, 1);
    assert.equal((await cloud.getInvoice(id)).contract_no, 'CLOUD/001');
    assert.equal((await cloud.listInvoices({ q: 'cloud/001' })).length, 1);
    const total = tables.invoices[0].total;
    await cloud.updateInvoice(id, { contract_no: 'CLOUD/EDIT' });
    assert.equal((await cloud.getInvoice(id)).contract_no, 'CLOUD/EDIT');
    assert.equal(tables.invoices[0].total, total);
    await cloud.updateInvoice(id, { notes: 'Keep reference' });
    assert.equal((await cloud.getInvoice(id)).contract_no, 'CLOUD/EDIT');
    const service = await cloud.createInvoice({ ...data, ref_type: 'service_contract' }, 1);
    assert.equal((await cloud.getInvoice(service)).contract_no, 'SOURCE-001');
    await cloud.updateInvoice(service, { contract_no: '' });
    assert.equal((await cloud.getInvoice(service)).contract_no, '');
    delete tables.invoices[0].contract_no;
    assert.equal((await cloud.getInvoice(id)).contract_no, '', 'old API row has safe empty fallback');
  } finally { supabase.supabaseAdmin = previous; }
});
