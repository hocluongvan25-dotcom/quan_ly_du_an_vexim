// node --test tests/expiry-email.test.cjs
// Validate that customer notices are informative, regulatory-accurate, and clearly
// distinguish the Vexim service record from the facility's actual FDA/GACC status.
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
const { EXPIRY_STAGE_ORDER, EXPIRY_STAGE_PRESENTATION } = require('../lib/expiry-notice.ts');
const { siteBaseUrl, DEFAULT_SITE_URL } = require('../lib/site-url.ts');

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

/** All customer-visible email text (subject, HTML and plain-text fallback). */
const allText = (data, type) => {
  const email = buildExpiryWarningEmail(data, type);
  return email.subject + '\n' + email.html + '\n' + email.text;
};

test('subject and summary identify the Vexim service milestone, not an unverified FDA expiry', () => {
  const email = buildExpiryWarningEmail(FDA, '7_days');
  assert.equal(email.subject, '[Còn 7 ngày] Dịch vụ Vexim theo dõi hồ sơ Đăng ký FDA của NGUYEN TRAN COMPANY sắp kết thúc');
  assert.match(email.html, /dự kiến kết thúc vào ngày 05\/10\/2026/);
  assert.match(email.html, /Mốc kết thúc kỳ dịch vụ \(Vexim\)/);
  assert.match(email.html, /kỳ hạn dịch vụ\/hồ sơ Vexim/i);
  assert.match(email.html, /không phải trạng thái thời gian thực trên FDA Industry Systems/);
  assert.doesNotMatch(email.subject + email.html, /Đăng ký FDA của NGUYEN TRAN COMPANY đã hết hiệu lực/);
});

test('FDA risk disclosure is specific, conditional, sourced, and not alarmist', () => {
  const mail = allText({ ...FDA, remaining_days: 30 }, '30_days');
  assert.match(mail, /FDA xem cơ sở là chưa đăng ký/);
  assert.match(mail, /có thể bị giữ tại cửa khẩu hoặc cơ sở bảo đảm/);
  assert.match(mail, /có thể làm chậm thông quan\/giao hàng/);
  assert.match(mail, /phát sinh chi phí logistics/);
  assert.match(mail, /Food Facility Registration thuộc diện áp dụng gia hạn hai năm một lần/);
  assert.match(mail, /1\/10–31\/12 của năm chẵn/);
  assert.match(mail, /FDA không thu phí đăng ký\/gia hạn/);
  assert.match(mail, /phí Vexim \(nếu có\) là phí dịch vụ riêng theo hợp đồng/);
  assert.match(mail, /U\.S\. Agent đã đồng ý đảm nhiệm vai trò này/);
  assert.match(mail, /cập nhật trong 60 ngày/);
  assert.match(mail, /FDA: chu kỳ gia hạn Food Facility Registration/);
  assert.match(mail, /FDA: U\.S\. Agent và cập nhật đăng ký cơ sở nước ngoài/);
  assert.match(mail, /https:\/\/www\.fda\.gov\/food\/hfp-constituent-updates\/fda-reminds-food-facilities-biennial-renewal-requirements/);
  assert.match(mail, /hồ sơ Vexim hiện ghi U\.S\. Agent là Vexim Global LLC/);
  assert.match(mail, /doanh nghiệp cần thống nhất phương án thay thế\/cập nhật với FDA/);

  // Service expiry is not represented as an automatic cancellation, but a lapse in a required agent service is flagged.
  assert.match(mail, /Hợp đồng dịch vụ hết hạn tự nó không xác nhận đăng ký FDA đã hết hạn/);
  assert.doesNotMatch(mail, /chắc chắn bị từ chối|sẽ bị cấm xuất khẩu|tự động bị hủy/i);
});

test('FDA reminder action becomes more direct as the deadline approaches', () => {
  const early = allText({ ...FDA, remaining_days: 90 }, '90_days');
  assert.match(early, /chủ động lập kế hoạch/);
  const near = allText({ ...FDA, remaining_days: 7 }, '7_days');
  assert.match(near, /Ưu tiên xác minh trạng thái đăng ký chính thức/);
  assert.match(near, /trước khi chốt lịch giao hàng/);
  const expired = allText({ ...FDA, remaining_days: -2 }, 'expired');
  assert.match(expired, /Trước khi bố trí lô hàng tiếp theo/);
});

test('expired and expiry-day notices state the Vexim milestone without asserting official FDA status', () => {
  const expired = buildExpiryWarningEmail({ ...FDA, remaining_days: -12 }, 'expired');
  assert.equal(expired.subject, '[Quá mốc dịch vụ Vexim] Hồ sơ theo dõi Đăng ký FDA của NGUYEN TRAN COMPANY · 05/10/2026');
  assert.match(expired.html, /Đã qua mốc hết hạn ghi nhận tại Vexim/);
  assert.match(expired.html, /Thời gian đến mốc Vexim ghi nhận/);
  assert.match(expired.html, /Đã qua mốc/);
  assert.doesNotMatch(expired.subject + expired.html, /Đăng ký FDA[^<.]{0,80}đã hết hiệu lực/);
  assert.doesNotMatch(expired.html, /-12 ngày/);

  const today = buildExpiryWarningEmail({ ...FDA, remaining_days: 0 }, '1_day');
  assert.equal(today.subject, '[Dịch vụ Vexim đến hạn hôm nay] Hồ sơ Đăng ký FDA của NGUYEN TRAN COMPANY');
  assert.match(today.html, /Mốc hết hạn ghi nhận tại Vexim là hôm nay/);
  assert.match(today.html, /MỐC THÔNG BÁO: HẾT HẠN HÔM NAY/);
  assert.match(today.html, /Hôm nay \(0 ngày\)/);
  assert.doesNotMatch(today.html, /-\d+ ngày/);
});

test('FDA wording uses the correct registration terminology and the Vexim CTA is not presented as an official portal', () => {
  const mail = allText(FDA, '14_days');
  assert.match(mail, /Đăng ký FDA của NGUYEN TRAN COMPANY/);
  assert.match(mail, /FDA Registration No\./);
  assert.doesNotMatch(mail, /chứng nhận/i);
  assert.match(mail, /Hồ sơ trên hệ thống Vexim/);
  assert.match(mail, /Xem hồ sơ đang theo dõi tại Vexim/);
  assert.match(mail, /FDA Industry Systems/);
});

test('notification emails use a distinct color for every reminder batch', () => {
  const warningStages = EXPIRY_STAGE_ORDER;
  const colors = warningStages.map((type) => EXPIRY_STAGE_PRESENTATION[type].email.accent);
  assert.equal(new Set(colors).size, warningStages.length, 'mỗi mốc cần một màu riêng');

  const daysForStage = { '90_days': 90, '60_days': 60, '30_days': 30, '14_days': 14, '7_days': 7, '3_days': 3, '1_day': 1, expired: -1 };
  for (const type of warningStages) {
    const mail = buildExpiryWarningEmail({ ...FDA, remaining_days: daysForStage[type] }, type);
    const color = EXPIRY_STAGE_PRESENTATION[type].email.accent;
    assert.ok(mail.html.includes(`background:${color}`), `${type} phải dùng màu ở header`);
    assert.ok(mail.html.includes(`MỐC THÔNG BÁO: ${EXPIRY_STAGE_PRESENTATION[type].labelVi.toLocaleUpperCase('vi-VN')}`));
  }
});

test('GACC has a qualified operational risk note without incorrectly applying FDA requirements', () => {
  const mail = allText(GACC, '30_days');
  assert.match(mail, /Rủi ro nếu hồ sơ đăng ký chính thức không được duy trì/);
  assert.match(mail, /có thể ảnh hưởng tiến độ khai báo, thông quan và giao hàng/);
  assert.match(mail, /hệ thống đăng ký hiện hành/);
  assert.doesNotMatch(mail, /Food Facility Registration|FDA Industry Systems|U\.S\. Agent/);
  assert.doesNotMatch(mail, /https:\/\/www\.fda\.gov/);
});

test('table keeps the correct identifiers and omits FDA-only fields from GACC email', () => {
  const mail = allText({ ...FDA, remaining_days: 14 }, '14_days');
  const labels = [
    'Thông tin hồ sơ Vexim đang theo dõi',
    'Doanh nghiệp', 'NGUYEN TRAN COMPANY',
    'Mã hồ sơ Vexim', 'VXM-FDA-2026-0015',
    'FDA Registration No.', '18900123456',
    'D-U-N-S', '112223333', 'U.S. Agent', 'Vexim Global LLC',
    'Ngày đăng ký ghi nhận', '05/10/2024',
    'Mốc kết thúc kỳ dịch vụ (Vexim)', '05/10/2026',
    'Kỳ hạn dịch vụ/hồ sơ Vexim', '2 năm',
    'Thời gian đến mốc Vexim ghi nhận', '14 ngày',
    'Hồ sơ trên hệ thống Vexim',
  ];
  for (const label of labels) assert.ok(mail.includes(label), `thiếu "${label}"`);

  const gacc = allText({ ...GACC, remaining_days: 14 }, '14_days');
  assert.equal(gacc.includes('D-U-N-S'), false);
  assert.equal(gacc.includes('U.S. Agent'), false);
  assert.ok(gacc.includes('CVNM31012609200198'));
});

test('Vexim QR-verification link is consistent and the CTA identifies it as a Vexim record', () => {
  const email = buildExpiryWarningEmail(FDA, '60_days');
  const url = `${siteBaseUrl()}/verify/QRCODE123456`;
  assert.ok(email.html.includes(url));
  assert.ok(email.text.includes(url));
  assert.ok(email.html.includes('<a href="tel:0373685634"'));
  assert.ok(email.html.includes('Xem hồ sơ đang theo dõi tại Vexim'));
  assert.equal(email.html.includes('verify.vexim.vn'), false);
  assert.ok(email.html.includes('https://vanhanh.veximglobal.com/verify/QRCODE123456'));
});

test('Vexim verification URL follows NEXT_PUBLIC_SITE_URL', () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://verify.veximglobal.com/';
    assert.equal(siteBaseUrl(), 'https://verify.veximglobal.com');
    const mail = allText(FDA, '30_days');
    assert.ok(mail.includes('https://verify.veximglobal.com/verify/QRCODE123456'));
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previous;
  }
  assert.equal(siteBaseUrl(), DEFAULT_SITE_URL);
});

test('auto-email footer keeps Vexim sender/contact and renewal labels are factual', () => {
  const mail = allText(FDA, '90_days');
  assert.match(mail, /Email được gửi tự động từ hệ thống quản lý hồ sơ FDA\/GACC của Vexim Global\./);
  assert.match(mail, /Thời gian gửi:/);
  assert.match(mail, /Mã hồ sơ: VXM-FDA-2026-0015/);
  assert.match(mail, /Mã tra cứu: QRCODE123456/);
  assert.match(mail, /VEXIM GLOBAL CO\., LTD/);
  assert.match(mail, /0373 685 634/);
  assert.match(mail, /contact@veximglobal\.com/);
  assert.match(mail, /www\.veximglobal\.com/);

  for (const type of [...EXPIRY_STAGE_ORDER, 'renewal_reminder']) {
    const label = getNotificationLabel(type);
    assert.ok(label.vi && label.en);
    assert.doesNotMatch(label.vi, /gấp|khẩn cấp/i);
    assert.doesNotMatch(label.en, /urgent|critical/i);
  }
  assert.equal(getNotificationLabel('7_days').vi, 'Còn 7 ngày');
  assert.equal(getNotificationLabel('1_day').vi, 'Còn 1 ngày');
});
