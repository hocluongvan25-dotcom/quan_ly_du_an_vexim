const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);
const { nextInstallmentDefaults, nextInvoiceInstallment } = require('../lib/invoice-installments.ts');
const { PAYMENT_REQUEST_DEFAULTS, preparePaymentRequest, requestTransferContent } = require('../lib/payment-request.ts');
const first = (patch = {}) => ({
  id: 1, invoice_no: 'INV-001', contract_no: 'GACC-238/2026', ref_type: 'certificate', ref_id: 1,
  installment_no: 1, subtotal: 14000000, vat_rate: 8, vat_amount: 1120000, total: 15120000,
  paid_amount: 0, remaining: 15120000, status: 'issued', notes: 'Ghi chú riêng',
  payment_request: { ...PAYMENT_REQUEST_DEFAULTS, document_no: '01/CV-ĐNTT', recipient_name: 'Dr FOODS',
    contract_date: '2026-07-02', contract_value: 28000000, percentage: 50,
    service_description: 'DV GACC', bank_account: '001234567', transfer_content: 'Thanh toán lần 1' }, ...patch,
});

test('second installment copies persisted metadata and defaults to 100% minus first installment', () => {
  const source = first(); const before = structuredClone(source);
  const next = nextInstallmentDefaults([source]);
  assert.equal(next.kind, 'ready'); assert.equal(next.remaining, 14000000);
  assert.equal(next.payment_request.percentage, 50); assert.equal(next.source.vat_rate, 8);
  for (const [key, value] of Object.entries(source.payment_request)) {
    if (!['document_no', 'transfer_content', 'percentage'].includes(key)) assert.equal(next.payment_request[key], value, key);
  }
  assert.equal(next.payment_request.document_no, ''); assert.equal(next.payment_request.transfer_content, '');
  assert.match(requestTransferContent({ ...source, installment_no: 2, payment_request: next.payment_request }), /lần 2/);
  assert.deepEqual(source, before, 'first invoice is never mutated');
});

test('70% first -> 30% second; payments never influence the unbilled contract amount', () => {
  const inv = first(); inv.subtotal = 19600000; inv.payment_request.percentage = 70;
  for (const paid_amount of [0, 5000000, 21168000]) {
    const next = nextInstallmentDefaults([{ ...inv, paid_amount }]);
    assert.equal(next.remaining, 8400000); assert.equal(next.payment_request.percentage, 30);
  }
});

test('cancelled invoices are excluded from amounts and templates without reusing their numbers', () => {
  const cancelled = first({ id: 2, installment_no: 2, status: 'cancelled', subtotal: 14000000 });
  cancelled.payment_request.bank_account = 'DO-NOT-COPY';
  const next = nextInstallmentDefaults([cancelled, first()]);
  assert.equal(next.remaining, 14000000); assert.equal(next.payment_request.bank_account, '001234567');
  assert.equal(nextInvoiceInstallment([first(), cancelled]), 3);
  assert.equal(nextInstallmentDefaults([cancelled]), null);
  assert.equal(nextInstallmentDefaults([]), null);
});

test('sums active installments only for the same contract/source; supports more than two installments', () => {
  const one = first({ subtotal: 7000000 }); one.payment_request.percentage = 25;
  const two = first({ id: 2, installment_no: 2, subtotal: 8400000 }); two.payment_request.percentage = 30;
  const unrelated = first({ id: 0, contract_no: 'DIFFERENT-CONTRACT', subtotal: 10000000 });
  const otherSource = first({ id: 0, ref_id: 9, subtotal: 9999999 });
  const next = nextInstallmentDefaults([one, unrelated, otherSource, two]);
  assert.equal(next.invoiced, 15400000); assert.equal(next.remaining, 12600000); assert.equal(next.payment_request.percentage, 45);
});

test('fully invoiced or over-invoiced contracts do not suggest a new positive amount', () => {
  for (const subtotal of [14000000, 15000000]) {
    const next = nextInstallmentDefaults([first(), first({ id: 2, installment_no: 2, subtotal })]);
    assert.equal(next.kind, 'complete'); assert.equal(next.remaining, 0); assert.equal(next.payment_request.percentage, null);
  }
});

test('manual amounts infer a percentage only when it reproduces the exact remainder', () => {
  const inv = first({ subtotal: 7000000 }); inv.payment_request.percentage = null;
  const next = nextInstallmentDefaults([inv]); assert.equal(next.remaining, 21000000); assert.equal(next.payment_request.percentage, 75);
  inv.subtotal = 1234567;
  const exact = nextInstallmentDefaults([inv]); assert.equal(exact.remaining, 26765433); assert.equal(exact.payment_request.percentage, null);
  const prepared = preparePaymentRequest(exact.payment_request, { ...inv, issue_date: '2026-09-20', installment_no: 2, subtotal: exact.remaining });
  assert.equal(prepared.subtotal + inv.subtotal, 28000000, 'server preserves exact integer VND');
});

test('percentage rounding cannot overbill the final installment by one dong', () => {
  const inv = first({ subtotal: 1 }); inv.payment_request.contract_value = 3; inv.payment_request.percentage = 50;
  const next = nextInstallmentDefaults([inv]); assert.equal(next.remaining, 2);
  assert.equal(next.payment_request.percentage, 50); // 3 × 50%, rounded = 2; exact complement is valid.
  inv.subtotal = 2;
  const remainder = nextInstallmentDefaults([inv]); assert.equal(remainder.remaining, 1);
  assert.equal(remainder.payment_request.percentage, null, '50% would round to 2, not the remaining 1');
});

test('missing snapshots or contract numbers require manual review rather than invented details', () => {
  assert.equal(nextInstallmentDefaults([first({ payment_request: null })]).kind, 'missing');
  assert.equal(nextInstallmentDefaults([first({ contract_no: '' })]).kind, 'missing');
  const oldSecond = first({ id: 2, installment_no: 2, subtotal: 7000000, payment_request: null });
  const next = nextInstallmentDefaults([first(), oldSecond]);
  assert.equal(next.kind, 'ready'); assert.equal(next.remaining, 7000000); assert.equal(next.payment_request.bank_account, '001234567');
});

test('conflicting contract snapshots or malformed amounts stop automatic calculation', () => {
  const second = first({ id: 2, installment_no: 2 }); second.payment_request.contract_value = 40000000;
  assert.equal(nextInstallmentDefaults([first(), second]).kind, 'conflict');
  second.payment_request.contract_value = 28000000; second.payment_request.contract_date = '2026-08-01';
  assert.equal(nextInstallmentDefaults([first(), second]).kind, 'conflict');
  for (const subtotal of [NaN, Infinity, -1, 1.5]) assert.equal(nextInstallmentDefaults([first({ subtotal })]).kind, 'conflict');
});
