// node --test tests/renewal-notice.test.cjs
// Hai lỗi đã từng xảy ra ở production:
//  1. Gia hạn xong không gửi email nào cho khách.
//  2. Sau khi gia hạn, mọi cảnh báo của KỲ HẠN MỚI bị chặn ("Already sent") vì bản ghi
//     thông báo của kỳ hạn cũ vẫn còn — khách không bao giờ nhận được cảnh báo nữa.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cwd = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vexim-renewal-notice-'));
process.chdir(temp);
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.ZOHO_SMTP_PASS; // email ở chế độ mock, không gửi ra ngoài
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
const { scanAndNotifyExpiry, notifyCertificateRenewed, currentTermStart, certificateRecipients } = require('../lib/expiry-checker.ts');
const { buildRenewalConfirmationEmail } = require('../lib/email.ts');
const { siteBaseUrl } = require('../lib/site-url.ts');
after(() => { process.chdir(cwd); fs.rmSync(temp, { recursive: true, force: true }); });

const iso = (days) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const admin = () => db.listUsers().find((u) => u.role === 'admin').id;

let seq = 0;
function makeCertificate({ remaining = 90, email = 'khach@example.com', company = 'Công ty Gia Hạn' } = {}) {
  const id = db.createCertificate({
    standard: 'FDA',
    registration_code: `QA-RENEW-${++seq}`,
    duns_code: '',
    us_agent: 'Vexim Global LLC',
    service_price: 0,
    company_name: `${company} ${seq}`,
    company_email: email,
    company_address: '',
    portal_user: '',
    portal_pass: '',
    scope: '',
    registered_at: iso(remaining - 730),
    validity_years: 2,
    created_by: admin(),
  });
  db.publishCertificate(id);
  raw().prepare('UPDATE certificates SET expires_at = ? WHERE id = ?').run(iso(remaining), id);
  return db.getCertificate(id);
}
const raw = () => new DatabaseSync(path.join(temp, 'data', 'vexim.db'));
const scanRow = (result, certificate_no) =>
  result.details.find((d) => d.certificate_no === certificate_no);

test('cảnh báo trong CÙNG kỳ hạn vẫn chỉ gửi một lần cho mỗi mốc', async () => {
  const cert = makeCertificate({ remaining: 90 });
  const first = await scanAndNotifyExpiry();
  assert.equal(scanRow(first, cert.certificate_no).sent, true, 'mốc 90 ngày phải gửi lần đầu');

  const second = await scanAndNotifyExpiry();
  const row = scanRow(second, cert.certificate_no);
  assert.equal(row.sent, false, 'không được gửi lặp trong cùng kỳ hạn');
  assert.equal(row.error, 'Already sent');
});

test('gia hạn xong: KHÔNG chặn cảnh báo của kỳ hạn mới', async () => {
  const cert = makeCertificate({ remaining: 90 });
  // Kỳ hạn cũ đã gửi đủ 8 mốc
  for (const type of ['90_days', '60_days', '30_days', '14_days', '7_days', '3_days', '1_day', 'expired']) {
    db.createExpiryNotification({
      certificate_id: cert.id, company_name: cert.company_name,
      notification_type: type, recipient_email: 'khach@example.com', status: 'sent',
    });
  }
  assert.equal(scanRow(await scanAndNotifyExpiry(), cert.certificate_no).sent, false, 'kỳ hạn cũ thì vẫn bị chặn');

  const renewed = db.renewCertificate(cert.id, 0, 2);
  assert.equal(renewed.renewal_count, 1);
  assert.ok(renewed.last_renewed_at, 'phải ghi lại mốc gia hạn');

  // Thời gian trôi tới mốc 90 ngày của KỲ HẠN MỚI
  raw().prepare('UPDATE certificates SET expires_at = ? WHERE id = ?').run(iso(90), cert.id);
  const afterRenewal = scanRow(await scanAndNotifyExpiry(), cert.certificate_no);
  assert.equal(afterRenewal.sent, true, 'kỳ hạn mới phải được gửi cảnh báo lại từ đầu');
  assert.equal(afterRenewal.error, undefined);

  // Và mốc quá hạn của kỳ hạn mới cũng phải gửi được
  raw().prepare('UPDATE certificates SET expires_at = ? WHERE id = ?').run(iso(-1), cert.id);
  const expired = scanRow(await scanAndNotifyExpiry(), cert.certificate_no);
  assert.equal(expired.type, 'expired');
  assert.equal(expired.sent, true, 'email "đã hết hạn" của kỳ hạn mới cũng không được bị chặn');
});

test('thông báo kỳ hạn cũ không chặn kỳ hạn mới, nhưng thông báo trong kỳ hiện tại thì chặn', () => {
  const cert = makeCertificate({ remaining: 90 });
  // Gửi trước mốc gia hạn (kỳ hạn cũ)
  db.createExpiryNotification({ certificate_id: cert.id, company_name: cert.company_name, notification_type: '90_days', recipient_email: 'a@b.vn' });
  raw().prepare("UPDATE expiry_notifications SET sent_at = '2025-01-01 00:00:00' WHERE certificate_id = ?").run(cert.id);
  db.renewCertificate(cert.id, 0, 2);
  const termStart = currentTermStart(db.getCertificate(cert.id));
  assert.equal(db.hasNotificationBeenSent(cert.id, '90_days', termStart), false, 'bản ghi cũ không được chặn');

  // Thông báo gửi sau khi gia hạn (trong kỳ hiện tại) thì phải chặn
  db.createExpiryNotification({ certificate_id: cert.id, company_name: cert.company_name, notification_type: '30_days', recipient_email: 'a@b.vn' });
  assert.equal(db.hasNotificationBeenSent(cert.id, '30_days', currentTermStart(db.getCertificate(cert.id))), true);
});

test('kỳ hạn hiện tại tính từ lần gia hạn gần nhất, chưa gia hạn thì từ ngày đăng ký', () => {
  const fresh = makeCertificate({ remaining: 400 });
  assert.equal(currentTermStart(fresh), fresh.registered_at);
  const renewed = db.renewCertificate(fresh.id, 0, 2);
  assert.equal(currentTermStart(renewed), renewed.last_renewed_at);
});

test('gia hạn xong: gửi email xác nhận cho khách và ghi lại lịch sử thông báo', async () => {
  const cert = makeCertificate({ remaining: 30, email: 'khach-xac-nhan@example.com' });
  const recipients = await certificateRecipients(cert);
  assert.ok(recipients.includes('khach-xac-nhan@example.com'), 'khách phải nằm trong danh sách nhận');
  assert.ok(recipients.some((r) => r.includes('veximglobal.com')), 'admin phải nhận bản sao');

  const renewed = db.renewCertificate(cert.id, 0, 2);
  const result = await notifyCertificateRenewed(renewed);
  assert.equal(result.sent, true, 'email xác nhận phải gửi được');
  assert.deepEqual(result.recipients, recipients);

  const rows = raw()
    .prepare("SELECT notification_type, status, recipient_email FROM expiry_notifications WHERE certificate_id = ? ORDER BY id DESC LIMIT 1")
    .get(cert.id);
  assert.equal(rows.notification_type, 'renewal_reminder', 'phải ghi vào lịch sử là email gia hạn');
  assert.equal(rows.status, 'sent');
  assert.ok(rows.recipient_email.includes('khach-xac-nhan@example.com'));

  // Email lỗi không được làm hỏng việc gia hạn: hồ sơ vẫn đã được gia hạn bình thường
  assert.equal(renewed.status, 'published');
  assert.equal(renewed.expires_at, db.getCertificate(cert.id).expires_at);
});

test('nội dung email xác nhận gia hạn: đúng hồ sơ, đúng kỳ hạn mới, cùng văn phong hệ thống', () => {
  const cert = makeCertificate({ remaining: 30, company: 'CÔNG TY XÁC NHẬN' });
  const renewed = db.renewCertificate(cert.id, 0, 2);
  const mail = buildRenewalConfirmationEmail({
    certificate_no: renewed.certificate_no,
    company_name: renewed.company_name,
    standard: renewed.standard,
    registration_code: renewed.registration_code,
    registered_at: renewed.registered_at,
    expires_at: renewed.expires_at,
    validity_years: renewed.validity_years,
    remaining_days: 730,
    public_code: renewed.public_code,
    duns_code: renewed.duns_code,
    us_agent: renewed.us_agent,
    renewal_count: renewed.renewal_count,
  });
  const [y, m, d] = renewed.expires_at.split('-');
  assert.equal(mail.subject, `[Đã gia hạn] Đăng ký FDA của ${renewed.company_name} có hiệu lực đến ${d}/${m}/${y}`);
  const all = mail.subject + mail.html + mail.text;
  for (const needle of [
    'Xác nhận gia hạn đăng ký',
    'Mã hồ sơ Vexim', renewed.certificate_no,
    'FDA Registration No.',
    'Ngày hết hạn (mới)',
    'Kỳ hạn đăng ký', '2 năm',
    'Số lần gia hạn', '1 lần',
    'Kiểm tra thông tin hồ sơ',
    `${siteBaseUrl()}/verify/${renewed.public_code}`,
    'Email được gửi tự động từ hệ thống quản lý hồ sơ FDA/GACC của Vexim Global.',
  ]) assert.ok(all.includes(needle), `thiếu "${needle}"`);

  for (const banned of ['chứng nhận', 'phí gấp', 'giá ưu đãi', 'hành động cần thiết', 'khẩn cấp']) {
    assert.equal(all.toLowerCase().includes(banned), false, `không được có "${banned}"`);
  }
  assert.equal(/\u26a0|\u26d4/.test(all), false, 'không dùng emoji cảnh báo');
});
