// node --test tests/carry-over.test.cjs
// Kịch bản thật: khách chưa trả VAT đợt 1 (chỉ tạm ứng 9.000.000 trên hóa đơn
// 9.720.000) → 720.000 tự động thành "còn phải thu"; khi thu đợt 2 phải cộng vào
// và ghi rõ trong giấy đề nghị thanh toán.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const { PDFDocument, PDFName, decodePDFRawStream } = require('pdf-lib');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const cwd = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vexim-carry-over-'));
process.chdir(temp);
fs.symlinkSync(path.join(root, 'assets'), path.join(temp, 'assets'), 'dir');
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.ZOHO_SMTP_PASS;
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  return resolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, ...args);
};
for (const ext of ['.ts', '.tsx']) {
  require.extensions[ext] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
}

const db = require('../lib/db-sqlite.ts');
const auth = require('../lib/auth.ts');
auth.getSession = () => ({ id: 1, role: 'admin', name: 'Test Admin' });
const paymentsApi = require('../app/api/invoices/[id]/payments/route.ts');
const { generatePaymentRequestPdf } = require('../lib/payment-request-pdf.ts');
const {
  priorDebtsOf, carriedOverTotal, planPaymentAllocation, totalCollectible, withPriorDebts,
} = require('../lib/accounting.ts');
const {
  paymentRequestParagraphs, carriedOverLines, assertPaymentRequestExportable, PAYMENT_REQUEST_DEFAULTS,
} = require('../lib/payment-request.ts');

after(() => { process.chdir(cwd); fs.rmSync(temp, { recursive: true, force: true }); });

const snapshot = (over = {}) => ({
  ...PAYMENT_REQUEST_DEFAULTS,
  document_no: '01/CV-ĐNTT', recipient_name: 'Công ty TNHH Dr FOODS',
  contract_date: '2026-07-02', contract_value: 18000000, percentage: 50,
  service_description: 'Dịch vụ Đăng ký FDA', transfer_content: '',
  ...over,
});

/** Mỗi hợp đồng gắn với một hồ sơ riêng để các test không lẫn nợ của nhau. */
let refSeq = 0;
function makeCertificate() {
  const id = db.createCertificate({
    standard: 'FDA', registration_code: `QA-CARRY-${++refSeq}`, duns_code: '', us_agent: '',
    service_price: 0, company_name: `Công ty Carry Over ${refSeq}`, company_email: 'x@y.vn',
    company_address: '', portal_user: '', portal_pass: '', scope: '',
    registered_at: '2026-01-01', validity_years: 2, created_by: 1,
  });
  return id;
}

/**
 * Hợp đồng 18.000.000 chưa VAT, chia 2 đợt 50% — đợt 1: 9.000.000 + VAT 8% = 9.720.000.
 */
function makeContract(ref_id = makeCertificate(), contract_no = `FDA-238/2026-${ref_id}`) {
  const first = db.createInvoice({
    ref_type: 'certificate', ref_id, contract_no, installment_no: 1,
    subtotal: 9000000, vat_rate: 8, issue_date: '2026-07-16', payment_request: snapshot(),
  }, 1);
  const second = db.createInvoice({
    ref_type: 'certificate', ref_id, contract_no, installment_no: 2,
    subtotal: 9000000, vat_rate: 8, issue_date: '2026-08-16', payment_request: snapshot(),
  }, 1);
  return { first, second, ref_id, contract_no };
}

/** Khách tạm ứng 9.000.000 cho đợt 1 — chưa trả 720.000 VAT. */
const payAdvance = (id) => db.createPayment(id, { amount: 9000000, note: 'Tạm ứng, chưa gồm VAT' }, 1);

const textOf = (blocks) => blocks.map((b) => b.text).join('\n');

test('khách tạm ứng thiếu VAT: 720.000 tự động thành còn phải thu của đợt 1', () => {
  const { first } = makeContract();
  payAdvance(first);
  const inv = db.getInvoice(first);
  assert.equal(inv.subtotal, 9000000);
  assert.equal(inv.vat_amount, 720000);
  assert.equal(inv.total, 9720000);
  assert.equal(inv.paid_amount, 9000000);
  assert.equal(inv.remaining, 720000, 'VAT chưa trả nằm lại ở còn phải thu');
  assert.equal(inv.state, 'partial');
  assert.deepEqual(inv.prior_debts, []);
  assert.equal(inv.carried_over, 0);
});

test('đợt 2 đọc lên thấy ngay 720.000 nợ của đợt 1 và tổng phải thu 10.440.000', () => {
  const { first, second } = makeContract();
  payAdvance(first);
  const secondInv = db.getInvoice(second);

  assert.equal(secondInv.carried_over, 720000, 'phải cộng nợ đợt trước vào đợt 2');
  assert.equal(secondInv.prior_debts.length, 1);
  assert.deepEqual(secondInv.prior_debts[0], {
    invoice_id: first, invoice_no: secondInv.prior_debts[0].invoice_no, installment_no: 1,
    subtotal: 9000000, vat_amount: 720000, total: 9720000, paid_amount: 9000000, remaining: 720000,
  });
  assert.equal(secondInv.remaining, 9720000, 'phần của riêng đợt 2 vẫn nguyên');
  assert.equal(totalCollectible(secondInv), 10440000, '9.720.000 + 720.000 = 10.440.000');
});

test('hóa đơn đã hủy hoặc đợt sau không được tính vào nợ đợt trước', () => {
  const contract = makeContract();
  const { first, second } = contract;
  payAdvance(first);
  // Đợt 3 (sau đợt 2) còn nợ nhưng không được cộng ngược vào đợt 2
  db.createInvoice({
    ref_type: 'certificate', ref_id: contract.ref_id, contract_no: contract.contract_no, installment_no: 3,
    subtotal: 1000000, vat_rate: 8, issue_date: '2026-09-16',
  }, 1);
  assert.equal(db.getInvoice(second).carried_over, 720000, 'chỉ tính đợt TRƯỚC');

  // (Hóa đơn đã thu tiền không hủy được — trường hợp hủy được kiểm ở test helper bên dưới)
});

test('đề nghị thanh toán của đợt 2 ghi rõ khoản nợ và cộng vào tổng', () => {
  const { first, second } = makeContract();
  payAdvance(first);
  const inv = db.getInvoice(second);
  const text = textOf(paymentRequestParagraphs(inv));

  assert.match(text, /Cộng số tiền còn lại của các đợt trước chưa thanh toán:/);
  assert.match(text, /Đợt 1 \(hóa đơn \S+\): còn lại 720\.000 đồng trên tổng 9\.720\.000 đồng\./);
  assert.match(text, /Tổng số tiền còn nợ của các đợt trước: 720\.000 đồng\./);
  assert.match(
    text,
    /Tổng số tiền đề nghị thanh toán đợt này: 10\.440\.000 đồng \(bao gồm 9\.720\.000 đồng của đợt 2 và 720\.000 đồng còn lại của các đợt trước\)\./
  );
  // Không còn câu cũ chỉ ghi số của riêng đợt 2
  assert.equal(/Tổng số tiền đề nghị thanh toán lần 2: 9\.720\.000 đồng\./.test(text), false);
});

test('không có nợ đợt trước thì văn bản giữ nguyên như cũ', () => {
  const { first, second } = makeContract();
  db.createPayment(first, { amount: 9720000 }, 1); // đợt 1 thu đủ, không còn nợ
  const inv = db.getInvoice(second);
  const text = textOf(paymentRequestParagraphs(inv));
  assert.deepEqual(carriedOverLines(inv), []);
  assert.match(text, /Tổng số tiền đề nghị thanh toán lần 2: 9\.720\.000 đồng\./);
  assert.equal(text.includes('các đợt trước'), false);
});

/**
 * Đếm số lệnh vẽ chữ trong PDF. Phông được nhúng nên không đọc được chuỗi ký tự,
 * nhưng số dòng chữ thì đếm được — đủ để chứng minh các dòng "nợ đợt trước" có vào PDF.
 */
async function pdfTextOps(bytes) {
  const doc = await PDFDocument.load(bytes);
  let ops = 0;
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!obj || obj.constructor?.name !== 'PDFRawStream') continue;
    let decoded = '';
    try { decoded = Buffer.from(decodePDFRawStream(obj).decode()).toString('latin1'); } catch { continue; }
    // Chỉ tính luồng nội dung trang; luồng phông (nhị phân) cũng chứa chữ "BT"/"Tj" ngẫu nhiên
    if (!decoded.includes("\nBT\n") || !decoded.includes(" Tf\n")) continue;
    ops += (decoded.match(/^<[0-9A-Fa-f]+> Tj$/gm) || []).length;
  }
  return ops;
}

test('PDF đề nghị thanh toán của đợt 2 có thêm các dòng về khoản nợ đợt trước', async () => {
  const contract = makeContract();
  payAdvance(contract.first);
  const inv = db.getInvoice(contract.second);
  assert.equal(inv.carried_over, 720000);

  // 1) Các dòng nợ phải thực sự được đưa vào trình dựng PDF (bắt tại chỗ gọi)
  const paymentRequest = require('../lib/payment-request.ts');
  const original = paymentRequest.paymentRequestParagraphs;
  let renderedToPdf = [];
  paymentRequest.paymentRequestParagraphs = (input) => {
    const blocks = original(input);
    renderedToPdf = blocks.map((b) => b.text);
    return blocks;
  };
  const withDebtPdf = await generatePaymentRequestPdf(inv);
  paymentRequest.paymentRequestParagraphs = original;

  assert.ok(
    renderedToPdf.some((t) => t.includes("Cộng số tiền còn lại của các đợt trước chưa thanh toán")),
    'PDF phải nhận được dòng nêu khoản nợ đợt trước'
  );
  assert.ok(
    renderedToPdf.some((t) => /Tổng số tiền đề nghị thanh toán đợt này: 10\.440\.000 đồng/.test(t)),
    'PDF phải nhận được tổng tiền gồm cả khoản nợ'
  );

  // 2) Số dòng chữ trên trang PDF cũng phải nhiều hơn bản không có nợ
  const withoutDebtPdf = await generatePaymentRequestPdf({ ...inv, prior_debts: [], carried_over: 0 });

  const doc = await PDFDocument.load(withDebtPdf);
  assert.ok(doc.getPageCount() >= 1);
  for (const page of doc.getPages()) assert.ok(Math.abs(page.getWidth() - 595.28) < 0.1);

  const withDebt = await pdfTextOps(withDebtPdf);
  const withoutDebt = await pdfTextOps(withoutDebtPdf);
  assert.ok(withoutDebt > 20, 'PDF không nợ vẫn có nội dung');
  assert.ok(
    withDebt >= withoutDebt + 3,
    `phải thêm ít nhất 3 dòng (tiêu đề khoản nợ + dòng từng đợt + tổng nợ): có nợ ${withDebt} vs không nợ ${withoutDebt}`
  );
});

test('vẫn xuất được đề nghị khi đợt này đã thu đủ nhưng đợt trước còn nợ', () => {
  const { first, second } = makeContract();
  payAdvance(first);
  db.createPayment(second, { amount: 9720000 }, 1);
  const inv = db.getInvoice(second);
  assert.equal(inv.remaining, 0, 'đợt 2 đã thu đủ');
  assert.equal(totalCollectible(inv), 720000, 'vẫn còn 720.000 của đợt 1 phải thu');
  assert.doesNotThrow(() => assertPaymentRequestExportable(inv));
  const text = textOf(paymentRequestParagraphs(inv));
  assert.match(text, /Tổng số tiền đề nghị thanh toán đợt này: 720\.000 đồng/);
});

test('phân bổ tiền thu: khách trả 10.440.000 ở đợt 2 thì gạch nợ đợt 1 trước', () => {
  const { first, second } = makeContract();
  payAdvance(first);
  const result = db.createPayment(second, { amount: 10440000, allocate_prior: true, note: 'Thu đủ 2 đợt' }, 1);

  assert.deepEqual(result.allocations, [
    { invoice_id: first, invoice_no: db.getInvoice(first).invoice_no, installment_no: 1, amount: 720000 },
    { invoice_id: second, invoice_no: db.getInvoice(second).invoice_no, installment_no: 2, amount: 9720000 },
  ]);
  assert.equal(db.getInvoice(first).remaining, 0, 'đợt 1 hết nợ');
  assert.equal(db.getInvoice(first).state, 'paid');
  assert.equal(db.getInvoice(second).remaining, 0, 'đợt 2 thu đủ');
  assert.equal(db.getInvoice(second).state, 'paid');

  // Lịch sử thu tiền ghi rõ khoản nào là phân bổ trả nợ đợt trước
  const firstPayments = db.listPayments(first);
  assert.equal(firstPayments.length, 2);
  assert.match(firstPayments[1].note, /Phân bổ trả nợ đợt 1 \(thu ở đợt 2/);
  assert.match(firstPayments[1].note, /Thu đủ 2 đợt/);
});

test('không bật phân bổ thì tiền vẫn nằm ở đợt đang thu (giữ hành vi cũ)', () => {
  const { first, second } = makeContract();
  payAdvance(first);
  db.createPayment(second, { amount: 10440000 }, 1);
  assert.equal(db.getInvoice(second).paid_amount, 10440000);
  assert.equal(db.getInvoice(first).remaining, 720000, 'đợt 1 vẫn còn nợ khi không phân bổ');
});

test('phân bổ cũ nhất trước khi có nhiều đợt cùng nợ', () => {
  const debt = (installment_no, remaining) => ({
    invoice_id: installment_no, invoice_no: `VXM-${installment_no}`, installment_no,
    subtotal: remaining, vat_amount: 0, total: remaining, paid_amount: 0, remaining,
  });
  const debts = [debt(3, 300000), debt(1, 100000), debt(2, 200000)];
  const plan = planPaymentAllocation(250000, { invoice_id: 9, invoice_no: 'VXM-9', installment_no: 4, remaining: 500000 }, debts);
  assert.deepEqual(plan, [
    { invoice_id: 1, invoice_no: 'VXM-1', installment_no: 1, amount: 100000 },
    { invoice_id: 2, invoice_no: 'VXM-2', installment_no: 2, amount: 150000 },
  ], 'trả hết đợt 1 rồi mới sang đợt 2, chưa tới đợt 3 và đợt hiện tại');
});

test('helper tính nợ: bỏ hóa đơn đã hủy, đợt sau, đợt đã thu đủ', () => {
  const rows = [
    { id: 1, invoice_no: 'A', installment_no: 1, status: 'issued', total: 9720000, paid_amount: 9000000, remaining: 720000 },
    { id: 2, invoice_no: 'B', installment_no: 2, status: 'issued', total: 9720000, paid_amount: 0, remaining: 9720000 },
    { id: 3, invoice_no: 'C', installment_no: 3, status: 'cancelled', total: 500000, paid_amount: 0, remaining: 500000 },
    { id: 4, invoice_no: 'D', installment_no: 4, status: 'issued', total: 500000, paid_amount: 500000, remaining: 0 },
  ];
  const debts = priorDebtsOf({ id: 99, installment_no: 5 }, rows);
  assert.deepEqual(debts.map((d) => d.invoice_no), ['A', 'B']);
  assert.equal(carriedOverTotal(debts), 10440000);
  assert.equal(totalCollectible(withPriorDebts({ id: 99, installment_no: 5, remaining: 100000 }, rows)), 10540000);
});

test('API ghi nhận thu tiền trả về phân bổ và số liệu cập nhật', async () => {
  const { first } = makeContract();
  payAdvance(first);
  const second = db.createInvoice({
    ref_type: 'certificate', ref_id: makeCertificate(), contract_no: 'FDA-999/2026', installment_no: 2,
    subtotal: 9000000, vat_rate: 8, issue_date: '2026-08-16', payment_request: snapshot({ contract_value: 18000000 }),
  }, 1);
  const req = new Request(`http://test/api/invoices/${second}/payments`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 9720000, allocate_prior: true, method: 'Chuyển khoản' }),
  });
  const res = await paymentsApi.POST(req, { params: { id: String(second) } });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(body.allocations.map((a) => a.amount), [9720000]);
  assert.equal(body.item.paid_amount, 9720000);
});

test('cùng hồ sơ nhưng KHÁC số hợp đồng thì không cấn trừ nợ của nhau', () => {
  const contract = makeContract();
  payAdvance(contract.first);
  // Hợp đồng gia hạn khác trên cùng hồ sơ, cũng đánh số đợt 2 nhưng không liên quan
  const other = db.createInvoice({
    ref_type: 'certificate', ref_id: contract.ref_id, contract_no: 'FDA-999/2026-GIA-HAN', installment_no: 2,
    subtotal: 5000000, vat_rate: 8, issue_date: '2026-08-20',
  }, 1);
  assert.equal(db.getInvoice(other).carried_over, 0, 'khác hợp đồng thì không gom nợ');
  assert.equal(db.getInvoice(contract.second).carried_over, 720000, 'hợp đồng gốc vẫn thấy nợ của chính nó');
  assert.equal(db.getInvoice(contract.second).prior_debts.length, 1);
});

test('hóa đơn không có số hợp đồng thì gom theo hồ sơ (dữ liệu cũ)', () => {
  const contract = makeContract();
  payAdvance(contract.first);
  const legacy = db.createInvoice({
    ref_type: 'certificate', ref_id: contract.ref_id, contract_no: '', installment_no: 2,
    subtotal: 1000000, vat_rate: 8, issue_date: '2026-08-25',
  }, 1);
  assert.equal(db.getInvoice(legacy).carried_over, 720000, 'không có số hợp đồng thì dùng quan hệ hồ sơ');
});

test('đợt 2 trong cùng hợp đồng khác hồ sơ không bị lẫn nợ', () => {
  const { first } = makeContract();
  payAdvance(first);
  const other = db.createInvoice({
    ref_type: 'certificate', ref_id: makeCertificate(), contract_no: 'FDA-777/2026', installment_no: 2,
    subtotal: 9000000, vat_rate: 8, issue_date: '2026-08-16',
  }, 1);
  assert.equal(db.getInvoice(other).carried_over, 0, 'chỉ cùng ref_type + ref_id mới tính là cùng hợp đồng');
});
