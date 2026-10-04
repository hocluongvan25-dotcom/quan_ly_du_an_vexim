// node scripts/preview-expiry-emails.cjs
// Render email cảnh báo hết hạn RA FILE HTML để xem trực quan:
//  - "Trước" lấy từ lib/email.ts ở commit HEAD (git show)
//  - "Sau" lấy từ lib/email.ts hiện tại
// Kết quả ghi vào email-previews/index.html (mở bằng static server để xem).
const { test } = require('node:test'); // noop giữ parity với tests
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
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

// Bản "trước": ghi lib/email.ts ở HEAD ra thư mục gốc để require tương đối ('./site-url') hoạt động
const beforeFile = path.join(root, 'lib', '.email-before-preview.ts'); // để require('./site-url') của bản cũ vẫn trỏ đúng lib/site-url
fs.writeFileSync(beforeFile, execSync('git show HEAD:lib/email.ts', { cwd: root, maxBuffer: 10 * 1024 * 1024 }));
const before = require(beforeFile);
const after = require(path.join(root, 'lib/email.ts'));

const FDA = {
  certificate_no: 'VXM-FDA-2026-0015',
  company_name: 'CÔNG TY TNHH THỰC PHẨM AN PHÁT',
  standard: 'FDA',
  registration_code: '18900123456',
  registered_at: '2024-10-05',
  expires_at: '2026-10-05',
  validity_years: 2,
  remaining_days: 7,
  public_code: 'QRCODE123456',
  duns_code: '112223333',
  us_agent: 'Vexim Global LLC',
};
const GACC = { ...FDA, certificate_no: 'VXM-GACC-2026-0004', standard: 'GACC', registration_code: 'CVNM31012609200198', validity_years: 5, duns_code: '', us_agent: '' };

const esc = (s) => s; // nội dung email đã là HTML an toàn từ builder
const section = (title, note, email) => `
  <section style="margin:40px auto; max-width:720px">
    <div style="display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; margin-bottom:10px">
      <h2 style="margin:0; font-size:16px; color:#0f172a">${title}</h2>
      <span style="font-size:12px; color:#64748b">${note}</span>
    </div>
    <div style="font-size:11px; color:#475569; background:#ffffff; border:1px dashed #cbd5e1; border-radius:10px 10px 0 0; border-bottom:none; padding:8px 14px; word-break:break-all"><b>Tiêu đề:</b> ${esc(email.subject)}</div>
    <div style="background:#f1f5f9; padding:18px 10px 26px; border-radius:0 0 10px 10px; border:1px dashed #cbd5e1; border-top:none">${email.html}</div>
  </section>`;

const h1 = (t, sub) => `<header style="max-width:720px; margin:48px auto 0; padding:0 8px">
  <h1 style="margin:0; font-size:22px; color:#0f172a">${t}</h1>
  <p style="margin:6px 0 0; font-size:13px; color:#475569; line-height:1.6">${sub}</p></header>`;

const parts = [`<!doctype html><html lang="vi"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Preview — Email cảnh báo hết hạn Vexim</title></head>
<body style="margin:0; background:#e2e8f0; font-family:Inter,Arial,sans-serif">`,
  h1('Email cảnh báo hết hạn — trước / sau', 'Bản "Trước" render từ lib/email.ts ở commit HEAD. Bản "Sau" là đề xuất mới: khối rủi ro nêu hậu quả thật + màu sắc leo thang navy → vàng → cam → đỏ + số đếm ngược lớn + CTA gọi hotline ở mốc cao.'),

  h1('1 · Bản TRƯỚC (đang chạy)', 'Chỉ nêu sự thật "còn bao nhiêu ngày", chưa nói hậu quả — mọi mốc đều navy, chỉ đổi đỏ khi đã hết hạn.'),
  section('Trước — FDA · còn 60 ngày', 'mốc thông tin', before.buildExpiryWarningEmail({ ...FDA, remaining_days: 60 }, '60_days')),
  section('Trước — FDA · còn 7 ngày', 'trông gần như giống hệt mốc 60 ngày', before.buildExpiryWarningEmail(FDA, '7_days')),
  section('Trước — FDA · đã hết hạn', 'mới đổi sang đỏ', before.buildExpiryWarningEmail({ ...FDA, remaining_days: -12 }, 'expired')),

  h1('2 · Bản SAU (đề xuất)', 'Mỗi mốc một cấp độ thị giác: thông tin → chú ý → cảnh báo → sự việc đã xảy ra; khối rủi ro nói hậu quả thật (refused entry, buyer tra cứu, hải quan Trung Quốc).'),
  section('Sau — FDA · còn 60 ngày', 'urgency LOW · navy trung tính', after.buildExpiryWarningEmail({ ...FDA, remaining_days: 60 }, '60_days')),
  section('Sau — FDA · còn 30 ngày', 'urgency MEDIUM · vàng hổ phách', after.buildExpiryWarningEmail({ ...FDA, remaining_days: 30 }, '30_days')),
  section('Sau — FDA · còn 7 ngày', 'urgency HIGH · cam + CTA gọi hotline', after.buildExpiryWarningEmail(FDA, '7_days')),
  section('Sau — FDA · còn 1 ngày', 'urgency HIGH', after.buildExpiryWarningEmail({ ...FDA, remaining_days: 1 }, '1_day')),
  section('Sau — FDA · đã hết hạn', 'urgency CRITICAL · đỏ', after.buildExpiryWarningEmail({ ...FDA, remaining_days: -12 }, 'expired')),
  section('Sau — GACC · còn 7 ngày', 'rủi ro theo luật hải quan Trung Quốc', after.buildExpiryWarningEmail(GACC, '7_days')),
  section('Sau — GACC · đã hết hạn', 'không khai được tờ khai hải quan', after.buildExpiryWarningEmail(GACC, 'expired')),

  '</body></html>'];

const outDir = path.join(root, 'email-previews');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), parts.join('\n'));
fs.unlinkSync(beforeFile);
console.log('Wrote', path.join(outDir, 'index.html'));
