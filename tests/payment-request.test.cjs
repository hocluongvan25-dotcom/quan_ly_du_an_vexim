// Isolated SQLite and mocked cloud only. No production credentials or network.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');
const { PDFDocument, PDFName, decodePDFRawStream } = require('pdf-lib');
const root = path.resolve(__dirname, '..');
const cwd = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vexim-payment-request-'));
process.chdir(temp);
fs.symlinkSync(path.join(root, 'assets'), path.join(temp, 'assets'), 'dir');
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
const db = require('../lib/db-sqlite.ts');
const auth = require('../lib/auth.ts');
let session = { id: 1, role: 'admin', name: 'Test Admin' };
auth.getSession = () => session;
const api = require('../app/api/invoices/route.ts');
const invoiceApi = require('../app/api/invoices/[id]/route.ts');
const pdfApi = require('../app/api/invoices/[id]/payment-request/route.ts');
const helpers = require('../lib/payment-request.ts');
const { generatePaymentRequestPdf } = require('../lib/payment-request-pdf.ts');
const data = { ref_type: 'certificate', ref_id: 1, contract_no: 'GACC-238/2026', installment_no: 1, subtotal: 999, vat_rate: 8, issue_date: '2026-07-16' };
const snapshot = () => ({ ...helpers.PAYMENT_REQUEST_DEFAULTS, document_no: '01/CV-ĐNTT', recipient_name: 'Công ty TNHH Dr FOODS', contract_date: '2026-07-02', contract_value: 28000000, percentage: 50, service_description: 'ký kết Hợp đồng Dịch vụ Đăng ký Mã GACC', transfer_content: 'Thanh toán DV GACC Lần 1 theo hợp đồng GACC-238/2026' });
const create = (patch = {}) => db.createInvoice({ ...data, payment_request: snapshot(), ...patch }, 1);
const request = (body, method = 'POST') => new Request('http://test/api/invoices', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const ctx = id => ({ params: { id: String(id) } });
after(() => { process.chdir(cwd); fs.rmSync(temp, { recursive: true, force: true }); });

test('sample computes 28m × 50% + 8% on server, stores independent JSON snapshot', () => {
  const id = create(); const inv = db.getInvoice(id);
  assert.equal(inv.subtotal, 14000000); assert.equal(inv.vat_amount, 1120000); assert.equal(inv.total, 15120000);
  assert.deepEqual(inv.payment_request, snapshot());
  const raw = new DatabaseSync('data/vexim.db');
  assert.equal(typeof raw.prepare('SELECT payment_request FROM invoices WHERE id=?').get(id).payment_request, 'string');
  raw.prepare('UPDATE certificates SET company_name=? WHERE id=1').run('Renamed source company'); raw.close();
  assert.equal(db.getInvoice(id).payment_request.recipient_name, 'Công ty TNHH Dr FOODS');
  const text = helpers.paymentRequestParagraphs(inv).map(p => p.text).join('\n');
  for (const expected of ['GACC-238/2026','02/07/2026','28.000.000','50%','14.000.000','1.120.000','15.120.000','427313333','Dr FOODS']) assert.ok(text.includes(expected), expected);
});

test('optional/legacy invoices remain usable; enabling later validates fields, unrelated edits preserve snapshot', () => {
  const id = create({ payment_request: null, subtotal: 14000000 });
  assert.equal(db.getInvoice(id).payment_request, null);
  db.updateInvoice(id, { payment_request: snapshot() });
  db.updateInvoice(id, { title: 'Updated invoice' });
  assert.deepEqual(db.getInvoice(id).payment_request, snapshot());
  db.updateInvoice(id, { payment_request: null });
  assert.equal(db.getInvoice(id).payment_request, null);
  assert.equal(db.getInvoice(id).total, 15120000);
});

test('validation rejects missing, overlong, non-text, impossible dates and invalid financial input', () => {
  const normalize = helpers.normalizePaymentRequest;
  for (const patch of [ { recipient_name: '' }, { bank_name: 12 }, { signer_name: 'x'.repeat(101) }, { city: 'a\nb' }, { contract_date: '2026-02-30' }, { contract_value: Infinity }, { contract_value: '28000000' }, { contract_value: -1 }, { percentage: 0 }, { percentage: 101 }, { percentage: 0.111 }, { percentage: NaN } ]) assert.throws(() => normalize({ ...snapshot(), ...patch }));
  assert.throws(() => create({ contract_no: '' }));
  assert.throws(() => create({ issue_date: '2026-06-01' }));
  assert.throws(() => create({ installment_no: 0 }));
  assert.throws(() => create({ vat_rate: 101 }));
  assert.throws(() => create({ due_date: '2026-02-30' }));
  assert.throws(() => create({ subtotal: 28000001, payment_request: { ...snapshot(), percentage: null } }));
  assert.equal(normalize({ ...snapshot(), recipient_name: '  Đặng Văn Ương  ' }).recipient_name, 'Đặng Văn Ương');
  assert.equal(create({ subtotal: 7000000, payment_request: { ...snapshot(), percentage: null } }) > 0, true);
});

test('editing contract value/percentage recalculates amounts, but cannot bypass paid-invoice restrictions', () => {
  const id = create();
  db.updateInvoice(id, { payment_request: { ...snapshot(), contract_value: 40000000, percentage: 25 } });
  assert.equal(db.getInvoice(id).total, 10800000);
  db.createPayment(id, { amount: 1000000 }, 1);
  const before = db.getInvoice(id);
  assert.throws(() => db.updateInvoice(id, { payment_request: snapshot(), contract_no: 'MUST-NOT-SAVE' }), /HAS_PAYMENTS/);
  assert.deepEqual(db.getInvoice(id), before);
  db.updateInvoice(id, { payment_request: { ...before.payment_request, bank_account: '123456' } });
  assert.equal(db.getInvoice(id).total, before.total);
  assert.equal(db.getInvoice(id).payment_request.bank_account, '123456');
});

test('partial payments request only remainder, paid/cancelled/missing data are not exportable', () => {
  const id = create(); db.createPayment(id, { amount: 5000000 }, 1);
  const inv = db.getInvoice(id); helpers.assertPaymentRequestExportable(inv);
  const text = helpers.paymentRequestParagraphs(inv).map(p => p.text).join('\n');
  assert.ok(text.includes('Đã thanh toán: 5.000.000 đồng'));
  assert.ok(text.includes('đề nghị thanh toán còn lại: 10.120.000 đồng'));
  db.createPayment(id, { amount: 10120000 }, 1);
  assert.throws(() => helpers.assertPaymentRequestExportable(db.getInvoice(id)), /thu đủ/);
  const cancelled = create(); db.cancelInvoice(cancelled);
  assert.throws(() => helpers.assertPaymentRequestExportable(db.getInvoice(cancelled)), /đã hủy/);
  assert.throws(() => helpers.assertPaymentRequestExportable(db.getInvoice(create({ payment_request: null }))), /chưa có thông tin/);
});

test('POST/PATCH roundtrip uses server math; PDF endpoint enforces roles and states, returns private attachment', async () => {
  const post = await api.POST(request({ ...data, payment_request: snapshot() })); assert.equal(post.status, 200);
  const { id } = await post.json(); assert.equal(db.getInvoice(id).total, 15120000);
  const edited = await invoiceApi.PATCH(request({ payment_request: { ...snapshot(), bank_name: 'MB Updated' } }, 'PATCH'), ctx(id));
  assert.equal(edited.status, 200); assert.equal((await edited.json()).item.payment_request.bank_name, 'MB Updated');
  session = null; assert.equal((await pdfApi.GET(null, ctx(id))).status, 401);
  session = { id: 2, role: 'specialist' }; assert.equal((await pdfApi.GET(null, ctx(id))).status, 403);
  session = { id: 1, role: 'admin', name: 'Test Admin' };
  assert.equal((await pdfApi.GET(null, ctx('bad'))).status, 400);
  assert.equal((await pdfApi.GET(null, ctx(999999))).status, 404);
  assert.equal((await pdfApi.GET(null, ctx(create({ payment_request: null })))).status, 409);
  const cancelled = create(); db.cancelInvoice(cancelled); assert.equal((await pdfApi.GET(null, ctx(cancelled))).status, 409);
  const paid = create(); db.createPayment(paid, { amount: 15120000 }, 1); assert.equal((await pdfApi.GET(null, ctx(paid))).status, 409);
  const response = await pdfApi.GET(null, ctx(id)); assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/pdf');
  assert.match(response.headers.get('content-disposition'), /^attachment;/);
  assert.match(response.headers.get('cache-control'), /private, no-store/);
  const pdf = Buffer.from(await response.arrayBuffer()); assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  const doc = await PDFDocument.load(pdf);
  assert.equal(doc.getPageCount(), 1, 'sample should fit one A4 page');
  assert.ok(Math.abs(doc.getPage(0).getWidth() - 595.28) < .1);
  assert.ok(Math.abs(doc.getPage(0).getHeight() - 841.89) < .1);
  assert.match(doc.getTitle(), /Giấy đề nghị thanh toán/);
  const resources = doc.getPage(0).node.Resources().lookup(PDFName.of('Font'));
  assert.ok(resources.keys().length >= 3);
  // Regression: subset fonts extracted correct text but lost composite glyphs when rasterized.
  // Require original full fonts; visual raster checks complement this assertion.
  const originalFonts = ['Regular', 'Bold', 'Italic'].map(name => fs.readFileSync(path.join(root, `assets/fonts/Tinos-${name}.ttf`)));
  for (const key of resources.keys()) {
    const font = resources.lookup(key);
    const descendant = font.lookup(PDFName.of('DescendantFonts')).lookup(0);
    const stream = descendant.lookup(PDFName.of('FontDescriptor')).lookup(PDFName.of('FontFile2'));
    const embedded = Buffer.from(decodePDFRawStream(stream).decode());
    assert.ok(originalFonts.some(original => original.equals(embedded)), 'full original font is embedded');
  }
  if (process.env.PAYMENT_REQUEST_SAMPLE_DIR) fs.writeFileSync(path.join(process.env.PAYMENT_REQUEST_SAMPLE_DIR, 'de-nghi-thanh-toan-mau.pdf'), pdf);
});

test('long Unicode data wraps and paginates rather than clipping or shrinking the whole document', async () => {
  const p = { ...snapshot(), service_description: ('Đăng ký xuất khẩu sản phẩm an toàn thực phẩm ').repeat(10), recipient_name: 'Công ty xuất nhập khẩu ' + 'Ư'.repeat(200), transfer_content: 'A'.repeat(300), document_no: 'ĐNTT-'.repeat(20) };
  const inv = db.getInvoice(create({ payment_request: p }));
  const bytes = await generatePaymentRequestPdf(inv); const doc = await PDFDocument.load(bytes);
  assert.ok(doc.getPageCount() > 1); assert.ok(doc.getPageCount() <= 4);
  for (const page of doc.getPages()) assert.ok(Math.abs(page.getWidth() - 595.28) < .1);
  if (process.env.PAYMENT_REQUEST_SAMPLE_DIR) fs.writeFileSync(path.join(process.env.PAYMENT_REQUEST_SAMPLE_DIR, 'de-nghi-thanh-toan-long.pdf'), bytes);
});

test('cloud adapter (mock) stores jsonb snapshots and applies the same recalculation/paid guards', async () => {
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
    const id = await cloud.createInvoice({ ...data, payment_request: snapshot() }, 1);
    assert.deepEqual(tables.invoices[0].payment_request, snapshot());
    assert.equal((await cloud.getInvoice(id)).total, 15120000);
    await cloud.updateInvoice(id, { payment_request: { ...snapshot(), percentage: 25 } });
    assert.equal((await cloud.getInvoice(id)).total, 7560000);
    tables.invoice_payments.push({ id: 1, invoice_id: id, amount: 1000000, paid_at: '2026-07-17', created_by: 1 });
    await assert.rejects(() => cloud.updateInvoice(id, { payment_request: snapshot() }), /HAS_PAYMENTS/);
    assert.equal((await cloud.getInvoice(id)).payment_request.percentage, 25);
    await cloud.updateInvoice(id, { notes: 'Preserve snapshot' });
    assert.equal((await cloud.getInvoice(id)).payment_request.percentage, 25);
    tables.invoices[0].status = 'cancelled';
    await assert.rejects(() => cloud.updateInvoice(id, { payment_request: null }), /CANCELLED/);
    delete tables.invoices[0].payment_request;
    assert.equal((await cloud.getInvoice(id)).payment_request, null);
  } finally { supabase.supabaseAdmin = previous; }
});
