// node --test tests/expiry-email.test.cjs
// Email cảnh báo hết hạn phải là thông báo tự động của hệ thống quản lý hồ sơ,
// không phải email bán hàng: tiêu đề ngắn - factual, không thúc ép, không lẫn
// nội dung sales, và gọi đúng thuật ngữ "Đăng ký FDA" (không phải "chứng nhận").
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
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

const { buildExpiryWarningEmail, getNotificationLabel } = require('../lib/email.ts');

const FDA = {
  certificate_no: 'VXM-FDA-2026-0015',
  company_name: 'NGUYEN TRAN COMPANY',
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
const GACC = {
  ...FDA,
  certificate_no: 'VXM-GACC-2026-0004',
  standard: 'GACC',
  registration_code: 'CVNM31012609200198',
  validity_years: 5,
  duns_code: '',
  us_agent: '',
};

/** Mọi chữ xuất hiện trong email (tiêu đề + HTML + bản text). */
const allText = (data, type) => {
  const email = buildExpiryWarningEmail(data, type);
  return email.subject + '\n' + email.html + '\n' + email.text;
};

test('tiêu đề ngắn, factual, không lặp số ngày và không hối thúc', () => {
  const { subject } = buildExpiryWarningEmail(FDA, '7_days');
  assert.equal(subject, '[Còn 7 ngày] Đăng ký FDA của NGUYEN TRAN COMPANY sắp hết hạn');

  const mail = allText(FDA, '7_days');
  assert.doesNotMatch(mail, /cần gia hạn gấp/i);
  assert.doesNotMatch(mail, /khẩn cấp/i);
  assert.doesNotMatch(mail, /còn 7 ngày[^.]{0,3}còn 7 ngày/i, 'không lặp "còn 7 ngày" hai lần');
});

test('gọi đúng thuật ngữ đăng ký FDA, không dùng chữ "chứng nhận"', () => {
  const mail = allText(FDA, '30_days');
  assert.match(mail, /Đăng ký FDA của NGUYEN TRAN COMPANY/);
  assert.match(mail, /FDA Registration No\./);
  assert.doesNotMatch(mail, /Chứng nhận FDA/i, 'FDA facility registration không gọi là "chứng nhận"');
  assert.doesNotMatch(mail, /chứng nhận/i, 'không dùng chữ "chứng nhận" ở bất kỳ đâu trong email');

  const gacc = allText(GACC, '30_days');
  assert.match(gacc, /Đăng ký GACC của NGUYEN TRAN COMPANY/);
  assert.match(gacc, /GACC Registration No\./);
  assert.doesNotMatch(gacc, /Chứng nhận GACC/i);
});

test('nội dung chính đúng văn phong thông báo, không phải nhắc bán hàng', () => {
  const mail = allText(FDA, '7_days');
  assert.match(
    mail,
    /Đăng ký FDA của NGUYEN TRAN COMPANY dự kiến hết hạn vào ngày 05\/10\/2026\./,
    'phải nói rõ ngày hết hạn dạng dd/mm/yyyy'
  );
  assert.match(mail, /vui lòng chuẩn bị và kiểm tra thủ tục gia hạn trước ngày hết hạn\./);
  assert.match(mail, /Nếu cần gia hạn/);
  assert.match(mail, /Vui lòng liên hệ Vexim để kiểm tra hồ sơ hiện tại, xác nhận thông tin đăng ký và báo phí gia hạn\./);

  // Không còn nội dung bán hàng / thúc ép
  for (const banned of [
    'Hành động cần thiết',
    'phí gấp',
    'giá ưu đãi',
    'Chuẩn bị phí gia hạn',
    'Không xuất khẩu lô hàng mới',
    'thu hồi mã',
    'FDA hiệu lực 1-10 năm theo hợp đồng',
    'GACC cố định 5 năm',
    'tư vấn gia hạn',
  ]) {
    assert.equal(mail.includes(banned), false, `không được có "${banned}" trong email cảnh báo`);
  }
});

test('giữ bảng thông tin hồ sơ với nhãn chuẩn', () => {
  const mail = allText({ ...FDA, remaining_days: 14 }, '14_days');
  const labels = [
    'Thông tin hồ sơ',
    'Doanh nghiệp',
    'NGUYEN TRAN COMPANY',
    'Mã hồ sơ Vexim',
    'VXM-FDA-2026-0015',
    'FDA Registration No.',
    '18900123456',
    'D-U-N-S',
    '112223333',
    'U.S. Agent',
    'Vexim Global LLC',
    'Ngày đăng ký',
    '05/10/2024',
    'Ngày hết hạn',
    '05/10/2026',
    'Kỳ hạn đăng ký',
    'Số ngày còn lại',
    '14 ngày',
    'Kiểm tra thông tin hồ sơ',
  ];
  for (const label of labels) assert.ok(mail.includes(label), `thiếu "${label}"`);

  // GACC không có DUNS / US Agent
  const gacc = allText({ ...GACC, remaining_days: 14 }, '14_days');
  assert.equal(gacc.includes('D-U-N-S'), false);
  assert.equal(gacc.includes('U.S. Agent'), false);
  assert.ok(gacc.includes('CVNM31012609200198'));
});

test('giữ link xác minh làm trust element, có CTA rõ ràng', () => {
  const email = buildExpiryWarningEmail(FDA, '60_days');
  const url = 'https://verify.vexim.vn/verify/QRCODE123456';
  assert.ok(email.html.includes(url), 'phải còn link xác minh');
  assert.ok(email.text.includes(url));
  assert.ok(email.html.includes('<a href="tel:0373685634"'), 'phải có hotline liên hệ');
  const cta = email.html.match(/<a href="https:\/\/verify\.vexim\.vn[^>]*>([^<]+)<\/a>/g) || [];
  assert.ok(cta.some((a) => a.includes('Kiểm tra thông tin hồ sơ')), 'nút CTA phải là "Kiểm tra thông tin hồ sơ"');
});

test('footer giữ tính hệ thống: gửi tự động, thời gian, mã tra cứu, pháp nhân, liên hệ', () => {
  const mail = allText(FDA, '90_days');
  assert.match(
    mail,
    /Email được gửi tự động từ hệ thống quản lý hồ sơ FDA\/GACC của Vexim Global\./
  );
  assert.ok(mail.includes('Thời gian gửi:'));
  assert.ok(mail.includes('Mã hồ sơ: VXM-FDA-2026-0015'));
  assert.ok(mail.includes('Mã tra cứu: QRCODE123456'));
  assert.ok(mail.includes('VEXIM GLOBAL CO., LTD'));
  assert.ok(mail.includes('0373 685 634'));
  assert.ok(mail.includes('contact@veximglobal.com'));
  assert.ok(mail.includes('www.veximglobal.com'));
});

test('hồ sơ đã hết hạn: nói đúng tình trạng, không hù dọa', () => {
  const expired = { ...FDA, remaining_days: -12 };
  const email = buildExpiryWarningEmail(expired, 'expired');
  assert.equal(
    email.subject,
    '[Đã hết hạn] Đăng ký FDA của NGUYEN TRAN COMPANY đã hết hiệu lực ngày 05/10/2026'
  );
  const mail = expired.subject + email.subject + email.html;
  assert.match(email.html, /Đã hết hiệu lực/);
  assert.match(email.html, /đã hết hiệu lực vào ngày 05\/10\/2026\./);
  assert.doesNotMatch(email.subject + email.html, /KHẨN CẤP/);
  assert.doesNotMatch(email.subject + email.html, /⛔|⚠️/);
  assert.ok(email.html.includes('Số ngày còn lại'), 'bảng vẫn có dòng số ngày còn lại');
});

test('ngày hết hạn (còn 0 ngày) không hiện "Còn 1 ngày" hay số ngày âm', () => {
  const email = buildExpiryWarningEmail({ ...FDA, remaining_days: 0 }, '1_day');
  assert.equal(email.subject, '[Hết hạn hôm nay] Đăng ký FDA của NGUYEN TRAN COMPANY hết hiệu lực hôm nay');
  assert.match(email.html, /Hết hiệu lực hôm nay/);
  assert.doesNotMatch(email.html, /-\d+ ngày/, 'không hiện số ngày âm');
});

test('nhãn trạng thái trung tính cho mọi mốc, không có "gấp/khẩn cấp"', () => {
  for (const type of ['90_days', '60_days', '30_days', '14_days', '7_days', '3_days', '1_day', 'expired', 'renewal_reminder']) {
    const label = getNotificationLabel(type);
    assert.ok(label.vi && label.en);
    assert.doesNotMatch(label.vi, /gấp|khẩn cấp/i, `nhãn ${type} không được hối thúc`);
    assert.doesNotMatch(label.en, /urgent|critical/i);
  }
  assert.equal(getNotificationLabel('7_days').vi, 'Còn 7 ngày');
  assert.equal(getNotificationLabel('1_day').vi, 'Còn 1 ngày');
});
