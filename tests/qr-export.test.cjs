const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { QRCodeSVG } = require('qrcode.react');

const filename = path.resolve(__dirname, '../lib/qr-export.ts');
const compiled = new Module(filename, module);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { buildQrExport, qrLabelLayout, QR_EXPORT_SIZE, QR_MARGIN_MODULES, QR_LABEL_FONT_SIZE } = compiled.exports;

const url = 'https://vanhanh.veximglobal.com/verify/TEST12345678';
const qr = renderToStaticMarkup(React.createElement(QRCodeSVG, {
  value: url, size: QR_EXPORT_SIZE, level: 'H', marginSize: QR_MARGIN_MODULES,
  fgColor: '#000000', bgColor: '#ffffff',
}));
const moduleCount = Number(qr.match(/viewBox="0 0 (\d+) /)[1]);

test('download contains only self-contained QR and certificate caption', () => {
  const label = 'VXM-FDA-2026-0012';
  const result = buildQrExport(qr, label, moduleCount, 380);
  assert.equal(result.width, 900);
  assert.equal(result.height, 964);
  assert.ok(result.svg.includes(qr), 'QR matrix is kept intact');
  assert.equal((result.svg.match(/<text\b/g) || []).length, 1);
  assert.ok(result.svg.includes(`>${label}</text>`));
  assert.ok(!/<image\b|<a\b|<foreignObject\b|href=|VEXIM GLOBAL|0373|Ngoa Long|Scan to verify/.test(result.svg));
  assert.ok(!result.svg.includes(url), 'URL is encoded in QR, not printed as extra text');
  assert.ok(result.svg.includes('fill="#ffffff"'));
});

test('ordinary labels stay centered at their natural size', () => {
  const layout = qrLabelLayout(moduleCount, 380);
  assert.equal(layout.fontSize, QR_LABEL_FONT_SIZE);
  assert.equal(layout.width, 380);
  const result = buildQrExport(qr, 'VXM-GACC-2026-0002', moduleCount, 380);
  assert.ok(result.svg.includes('text-anchor="middle"'));
  assert.ok(result.svg.includes('x="450"'));
});

test('long certificate numbers shrink without truncation, within the QR matrix width', () => {
  const label = 'VXM-FDA-' + '1234567890'.repeat(40);
  const layout = qrLabelLayout(moduleCount, 8000);
  assert.ok(layout.fontSize < QR_LABEL_FONT_SIZE);
  assert.ok(layout.width <= layout.maxWidth + 1e-9);
  assert.ok(layout.maxWidth < QR_EXPORT_SIZE, 'respect the quiet zone on both sides');
  const result = buildQrExport(qr, label, moduleCount, 8000);
  assert.ok(result.svg.includes(`>${label}</text>`));
  assert.ok(result.svg.includes(`textLength="${layout.width}"`));
  assert.ok(result.svg.includes('lengthAdjust="spacingAndGlyphs"'));
  const y = Number(result.svg.match(/<text[^>]* y="([^"]+)"/)[1]);
  assert.ok(y > QR_EXPORT_SIZE && y < result.height);
});

test('missing or blank certificate number exports a square QR with no substitute slogan', () => {
  const result = buildQrExport(qr, '  ', moduleCount, 0);
  assert.equal(result.height, QR_EXPORT_SIZE);
  assert.ok(!result.svg.includes('<text'));
});

test('XML-special characters in a certificate number are escaped, never markup', () => {
  const result = buildQrExport(qr, 'VXM<&"\'><image href="evil"/>', moduleCount, 500);
  assert.ok(result.svg.includes('VXM&lt;&amp;&quot;&apos;&gt;&lt;image'));
  assert.ok(!result.svg.includes('<image'));
});

test('quiet-zone sizing works across QR versions and rejects invalid dimensions', () => {
  for (const cells of [29, 45, 65, 185]) {
    const layout = qrLabelLayout(cells, 1200);
    assert.equal(layout.maxWidth, 900 * (cells - 8) / cells);
    assert.ok(layout.width <= layout.maxWidth + 1e-9);
  }
  for (const [cells, width] of [[0, 10], [8, 10], [NaN, 10], [45, -1], [45, Infinity]]) {
    assert.throws(() => qrLabelLayout(cells, width), /Invalid QR/);
  }
});
