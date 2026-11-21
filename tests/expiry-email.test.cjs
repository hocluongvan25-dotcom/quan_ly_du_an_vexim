// node --test tests/expiry-email.test.cjs
// Email cảnh báo hết hạn là thông báo tự động của hệ thống quản lý hồ sơ, KHÔNG phải
// email bán hàng: không từ ngữ sale ("gấp", "khẩn cấp", giá ưu đãi...), gọi đúng thuật
// ngữ "Đăng ký FDA" (không phải "chứng nhận"). Nhưng phải ĐÁNH VÀO HẬU QUẢ THẬT của
// doanh nghiệp: khối rủi ro cụ thể (lô hàng bị giữ/từ chối nhập khẩu, buyer tra cứu
// thấy hết hạn) và màu sắc leo thang theo mức cảnh báo (navy → vàng → cam → đỏ).
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

/** Mọi chữ xuất hiện trong email (tiêu đề + HTML + bản text). */
const allText = (data, type) => {
  const email = buildExpiryWarningEmail(data, type);
  return email.subject + '\n' + email.html + '\n' + email.text;
};

test('tiêu đề ngắn, factual; từ mốc cảnh báo mới nêu hậu quả lô hàng', () => {
  const { subject } = buildExpiryWarningEmail(FDA, '7_days');
  assert.equal(
    subject,
    '[Còn 7 ngày] Đăng ký FDA của NGUYEN TRAN COMPANY sắp hết hạn · lô hàng có thể bị từ chối nhập khẩu'
  );
  // Mốc thông tin (90/60/30/14 ngày) giữ tiêu đề trung tính
  assert.equal(
    buildExpiryWarningEmail({ ...FDA, remaining_days: 60 }, '60_days').subject,
    '[Còn 60 ngày] Đăng ký FDA của NGUYEN TRAN COMPANY sắp hết hạn'
  );

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
  const url = `${siteBaseUrl()}/verify/QRCODE123456`;
  assert.ok(email.html.includes(url), 'phải còn link xác minh');
  assert.ok(email.text.includes(url));
  assert.ok(email.html.includes('<a href="tel:0373685634"'), 'phải có hotline liên hệ');
  const links = email.html.match(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g) || [];
  const cta = links.filter((a) => a.includes(url));
  assert.ok(cta.length >= 2, 'email phải có cả dòng link và nút CTA tới trang xác minh');
  assert.ok(cta.some((a) => a.includes('Kiểm tra thông tin hồ sơ')), 'nút CTA phải là "Kiểm tra thông tin hồ sơ"');
});

test('link trong email trỏ đúng trang mà mã QR mở ra, không dùng tên miền chết', () => {
  // Trang QR mã hoá `${origin}/verify/<mã>` với origin là địa chỉ thật đang chạy.
  // Email từng hardcode "verify.vexim.vn" — tên miền không tồn tại, khách bấm vào không mở được.
  const mail = allText(FDA, '30_days');
  assert.equal(mail.includes('verify.vexim.vn'), false, 'không được dùng tên miền verify.vexim.vn');
  assert.match(mail, /https:\/\/vanhanh\.veximglobal\.com\/verify\/QRCODE123456/, 'phải trỏ tới đúng địa chỉ hệ thống đang chạy');
  assert.equal(mail.split(`${DEFAULT_SITE_URL}/verify/`).length - 1 >= 2, true, 'dòng thông tin và nút CTA dùng cùng một link');
});

test('địa chỉ trong link đổi được bằng NEXT_PUBLIC_SITE_URL (khi đổi tên miền)', () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://verify.veximglobal.com/';
    assert.equal(siteBaseUrl(), 'https://verify.veximglobal.com', 'bỏ dấu / ở cuối');
    const mail = allText(FDA, '30_days');
    assert.ok(mail.includes('https://verify.veximglobal.com/verify/QRCODE123456'), 'link phải theo cấu hình');
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previous;
  }
  assert.equal(siteBaseUrl(), DEFAULT_SITE_URL, 'không cấu hình thì quay về tên miền mặc định');
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

test('hồ sơ đã hết hạn: nêu đúng tình trạng và hậu quả, không từ ngữ dọa dẫm', () => {
  const expired = { ...FDA, remaining_days: -12 };
  const email = buildExpiryWarningEmail(expired, 'expired');
  assert.equal(
    email.subject,
    '[Đã hết hạn] Đăng ký FDA của NGUYEN TRAN COMPANY đã hết hiệu lực ngày 05/10/2026 · lô hàng có thể bị từ chối nhập khẩu'
  );
  const mail = expired.subject + email.subject + email.html;
  assert.match(email.html, /Đã hết hiệu lực/);
  assert.match(email.html, /đã hết hiệu lực vào ngày 05\/10\/2026\./);
  assert.doesNotMatch(email.subject + email.html, /KHẨN CẤP/);
  assert.doesNotMatch(email.subject + email.html, /⛔|⚠️/);
  assert.ok(email.html.includes('Số ngày còn lại'), 'bảng vẫn có dòng số ngày còn lại');
});

test('email phải nêu rủi ro cụ thể khi hồ sơ hết hạn (đánh vào hậu quả thật)', () => {
  // FDA — 60 ngày: đã nêu hậu quả nhưng giọng thông tin
  const low = allText(FDA, '60_days');
  assert.match(low, /Vì sao nên gia hạn trước ngày hết hạn/);
  assert.match(low, /có thể bị từ chối nhập khẩu \(refused entry\) khi đến cảng Mỹ/);

  // FDA — 7 ngày: rủi ro chặt theo hạn cụ thể
  const high = allText(FDA, '7_days');
  assert.match(high, /Rủi ro nếu không gia hạn trước ngày 05\/10\/2026/);
  assert.match(high, /Chỉ còn 7 ngày để gia hạn trước khi số đăng ký FDA mất hiệu lực\./);
  assert.match(high, /buyer/i, 'phải nêu buyer tra cứu trạng thái đăng ký');

  // FDA — đã hết hạn: rủi ro đang hiện hữu
  const expiredMail = allText({ ...FDA, remaining_days: -12 }, 'expired');
  assert.match(expiredMail, /Rủi ro của doanh nghiệp lúc này/);
  assert.match(expiredMail, /đang trên đường sang Mỹ có nguy cơ bị giữ tại cảng/);

  // GACC — hậu quả theo luật Trung Quốc, không dùng nội dung FDA
  const gacc = allText(GACC, '14_days');
  assert.match(gacc, /không còn dùng được để khai báo thông quan vào Trung Quốc/);
  assert.equal(gacc.includes('refused entry'), false, 'thuật ngữ refused entry chỉ dùng cho FDA');
  const gaccHigh = allText(GACC, '3_days');
  assert.match(gaccHigh, /hết hạn là không khai được/);

  // Bản text cũng có khối rủi ro
  const textEmail = buildExpiryWarningEmail(FDA, '30_days');
  assert.match(textEmail.text, /VÌ SAO NÊN GIA HẠN TRƯỚC NGÀY HẾT HẠN/);
  assert.ok(textEmail.text.includes('- '));
});

test('màu sắc leo thang theo mức cảnh báo: navy → vàng → cam → đỏ', () => {
  const htmlFor = (data, type) => buildExpiryWarningEmail(data, type).html;

  // 90/60 ngày: trung tính, không có màu cảnh báo
  const low = htmlFor(FDA, '60_days');
  assert.ok(low.includes('background:#334155'), 'dải màu trên đầu là xanh trung tính');
  assert.ok(low.includes('#F1F5F9'), 'khối trạng thái nền xám trung tính');
  assert.ok(!low.includes('#FFFBEB') && !low.includes('#FFF7ED') && !low.includes('#FEF2F2'), '60 ngày không được mang màu cảnh báo');

  // 30/14 ngày: vàng hổ phách
  const medium = htmlFor(FDA, '30_days');
  assert.ok(medium.includes('background:#F59E0B'), 'dải màu vàng');
  assert.ok(medium.includes('#FFFBEB') && medium.includes('#B45309'), 'khối trạng thái + accent vàng hổ phách');

  // 7/3/1 ngày: cam
  const high = htmlFor(FDA, '7_days');
  assert.ok(high.includes('background:#EA580C'), 'dải màu cam');
  assert.ok(high.includes('#C2410C'), 'số đếm ngược + nút CTA màu cam');

  // đã hết hạn: đỏ
  const critical = htmlFor({ ...FDA, remaining_days: -12 }, 'expired');
  assert.ok(critical.includes('background:#DC2626'), 'dải màu đỏ');
  assert.ok(critical.includes('#B91C1C'), 'accent đỏ');
  assert.match(critical, /ĐÃ HẾT HẠN/, 'đếm ngược hiển thị chữ đã hết hạn');
});

test('CTA theo mức cảnh báo: mốc cao đưa nút gọi hotline lên trước, nút xác minh vẫn còn', () => {
  const high = buildExpiryWarningEmail(FDA, '3_days');
  assert.ok(high.html.includes('Gia hạn ngay · 0373 685 634'), 'nút gọi hotline nổi bật ở mốc cao');
  assert.ok(high.html.includes('background:#C2410C'), 'nút gọi mang màu cảnh báo');
  assert.equal((high.html.match(/Kiểm tra thông tin hồ sơ/g) || []).length >= 2, true, 'vẫn còn nút + dòng link tới trang xác minh');

  const low = buildExpiryWarningEmail(FDA, '60_days');
  assert.ok(low.html.includes('background:#0B1837; color:#ffffff; padding:12px 20px'), 'mốc thấp giữ nút xác minh navy làm CTA chính');
  assert.ok(low.html.includes('href="tel:0373685634"'), 'mốc thấp vẫn có hotline trong khối liên hệ');
});

test('ngày hết hạn (còn 0 ngày) không hiện "Còn 1 ngày" hay số ngày âm', () => {
  const email = buildExpiryWarningEmail({ ...FDA, remaining_days: 0 }, '1_day');
  assert.equal(email.subject, '[Hết hạn hôm nay] Đăng ký FDA của NGUYEN TRAN COMPANY hết hiệu lực hôm nay · lô hàng có thể bị từ chối nhập khẩu');
  assert.match(email.html, /Hết hiệu lực hôm nay/);
  assert.doesNotMatch(email.html, /-\d+ ngày/, 'không hiện số ngày âm');
  assert.doesNotMatch(email.subject + email.html + email.text, /Chỉ còn 0 ngày/, 'ngày 0 không đọc kiểu "Chỉ còn 0 ngày"');
  assert.match(email.html, /Rủi ro khi hồ sơ hết hạn trong hôm nay/, 'khối rủi ro đổi văn phong cho ngày 0');
  assert.match(email.html, /Ngày hết hạn là hôm nay \(05\/10\/2026\)/);

  const gacc = buildExpiryWarningEmail({ ...GACC, remaining_days: 0 }, '1_day');
  assert.doesNotMatch(gacc.subject + gacc.html + gacc.text, /Chỉ còn 0 ngày/);
  assert.match(gacc.html, /hết hôm nay, số đăng ký GACC ngưng hiệu lực/);
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
