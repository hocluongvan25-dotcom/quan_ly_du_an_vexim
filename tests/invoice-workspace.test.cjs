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
Module._resolveFilename = function (request, ...args) {
  if (request.startsWith('@/')) return resolve.call(this, path.join(root, request.slice(2)), ...args);
  return resolve.call(this, request, ...args);
};
const load = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'next/link') {
    return function Link({ href, children, ...props }) {
      return React.createElement('a', { href, ...props }, children);
    };
  }
  return load.call(this, request, parent, isMain);
};
for (const ext of ['.ts', '.tsx']) {
  require.extensions[ext] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
}

const { default: InvoiceWorkspace } = require('../components/accounting/InvoiceWorkspace.tsx');
const certificates = [
  { id: 15, certificate_no: 'VXM-FDA-2026-0015', standard: 'FDA', company_name: 'Example Foods', status: 'published', service_price: 12_500_000 },
  { id: 16, certificate_no: 'VXM-GACC-2026-0016', standard: 'GACC', company_name: 'Harvest Co.', status: 'draft', service_price: 0 },
];

test('certificate detail only renders the certificate form; invoice controls are in accounting', () => {
  const detail = fs.readFileSync(path.join(root, 'app/dashboard/ho-so/[id]/page.tsx'), 'utf8');
  assert.match(detail, /CertificateForm/);
  assert.doesNotMatch(detail, /InvoiceSection|InvoiceWorkspace|\/api\/invoices/);
  assert.match(fs.readFileSync(path.join(root, 'app/dashboard/ke-toan/hoa-don/moi/page.tsx'), 'utf8'), /InvoiceWorkspace/);
});

test('accounting invoice workspace requires selecting a certificate before loading invoices', () => {
  const html = renderToStaticMarkup(React.createElement(InvoiceWorkspace, {
    certificates,
    initialCertificateId: null,
  }));
  assert.ok(html.includes('Lập và quản lý hóa đơn'));
  assert.ok(html.includes('Chọn hồ sơ chứng nhận'));
  assert.ok(html.includes('Example Foods · FDA · VXM-FDA-2026-0015'));
  assert.ok(html.includes('Harvest Co. · GACC · VXM-GACC-2026-0016'));
  assert.ok(html.includes('Chọn một hồ sơ ở trên'));
  assert.ok(!html.includes('Đang tải hóa đơn'));
});

test('selected record opens its accounting workspace without embedding invoices in record editing', () => {
  const html = renderToStaticMarkup(React.createElement(InvoiceWorkspace, {
    certificates,
    initialCertificateId: 15,
  }));
  assert.ok(html.includes('Example Foods'));
  assert.ok(html.includes('VXM-FDA-2026-0015'));
  assert.ok(html.includes('Phí dịch vụ tham chiếu 12.500.000'));
  assert.ok(html.includes('Xem hồ sơ gốc'));
  assert.ok(html.includes('Đang tải hóa đơn'));
  assert.ok(html.includes('/dashboard/ho-so/15'));
});
