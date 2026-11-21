/**
 * Kiểm thử đồng hồ đếm ngược "Hiệu lực chứng nhận" (node --test tests/countdown.test.cjs)
 * Lỗi đã gặp: kỳ hạn 1 năm (365 ngày) lại hiện 366 ngày, và số ngày ở vòng tròn lệch với ô NGÀY bên dưới;
 * hồ sơ chưa xuất bản thì hiện cả kỳ hạn như thể còn nguyên dù đã quá hạn.
 */
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
  return resolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, ...args);
};
for (const ext of ['.ts', '.tsx']) {
  require.extensions[ext] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
}

const { countdownFor, remainingDays, todayUtcIso } = require('../lib/utils.ts');
const { CountdownRing } = require('../components/CountdownRing.tsx');
const { I18nProvider } = require('../lib/i18n/context.tsx');

const utc = (iso, hour = 9) => new Date(`${iso}T${String(hour).padStart(2, '0')}:00:00Z`);
const render = (registeredAt, expiresAt, running = true) =>
  renderToStaticMarkup(React.createElement(I18nProvider, null,
    React.createElement(CountdownRing, { registeredAt, expiresAt, running })));

/* Giao diện dùng đồng hồ thật, nên các test render phải dựng mốc ngày theo hôm nay */
const todayIso = new Date().toISOString().slice(0, 10);
const shiftDays = (iso, days) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const bigNumber = (html) => Number((html.match(/text-2xl font-extrabold text-navy-900">(\d+)</) || [])[1]);
const partNumbers = (html) => [...html.matchAll(/tabular-nums">(\d+)</g)].map((m) => Number(m[1]));

test('kỳ hạn 1 năm đăng ký hôm nay là 365 ngày, không phải 366', () => {
  const now = utc('2025-02-10', 0);
  const state = countdownFor('2025-02-10', '2026-02-10', now);

  assert.equal(state.days, 365, 'kỳ hạn 365 ngày phải hiện 365, không cộng thêm ngày hết hạn');
  assert.equal(state.expired, false);
  assert.equal(state.lastDay, false);

  // Giao diện thật: đăng ký hôm nay, hết hạn đúng 1 năm sau
  const expiry = shiftDays(todayIso, 365);
  const html = render(todayIso, expiry, true);
  assert.equal(bigNumber(html), 365, 'ô giữa vòng tròn phải là 365');
  assert.doesNotMatch(html, />366</, 'không được hiện 366 ngày');
  assert.deepEqual(partNumbers(html), [365, ...partNumbers(html).slice(1)], 'phần NGÀY phải khớp vòng tròn');
  assert.equal(partNumbers(html)[0], 365, 'ô NGÀY phải là 365');
});

test('số ngày ở đồng hồ luôn khớp remainingDays() dùng ở danh sách và ô "Số ngày còn lại"', () => {
  const cases = [
    ['2026-09-22', '2027-09-22'], // kỳ hạn 1 năm, đăng ký hôm nay
    ['2026-01-01', '2028-01-01'], // 2 năm, gần hết kỳ hạn
    ['2025-02-10', '2026-02-10'], // đã quá hạn
    ['2026-09-22', '2026-09-23'], // ngày mai hết hạn
    ['2026-09-22', '2026-09-22'], // hết hạn hôm nay
  ];
  for (const [registeredAt, expiresAt] of cases) {
    const now = utc('2026-09-22', 10);
    const state = countdownFor(registeredAt, expiresAt, now);
    const expected = Math.max(0, remainingDays(expiresAt, now));
    assert.equal(state.days, expected, `${registeredAt} → ${expiresAt}: số ngày không khớp remainingDays()`);
    if (expected > 0) assert.equal(state.lastDay, false);
  }
});

test('hồ sơ đã quá hạn: hết hạn thật, không hiện lại cả kỳ hạn', () => {
  const now = utc('2026-09-22', 10); // hôm nay 22/09/2026
  const past = countdownFor('2025-02-10', '2026-02-10', now);
  assert.equal(past.days, 0, 'quá hạn thì không còn ngày nào');
  assert.equal(past.expired, true, 'phải nhận là đã hết hạn');
  assert.equal(past.hours + past.minutes + past.seconds, 0, 'đồng hồ phải về 0');

  // Hồ sơ nháp (chưa xuất bản) trước đây hiện cả kỳ hạn như thể còn nguyên
  const html = render(shiftDays(todayIso, -365), shiftDays(todayIso, -1), false);
  assert.equal(bigNumber(html), 0, 'hồ sơ nháp quá hạn phải hiện 0 ngày');
  assert.doesNotMatch(html, />36[0-9]</, 'không được hiện lại cả kỳ hạn 365 ngày');
  assert.match(html, /Expired|Đã hết hạn/, 'phải ghi rõ đã hết hạn');
  assert.doesNotMatch(html, /remaining|Còn \d+ ngày/, 'không được nói còn ngày nào');
});

test('hết hạn hôm nay: ghi "Hết hạn hôm nay" và đồng hồ đếm tới cuối ngày', () => {
  const now = utc('2026-09-22', 10);
  const state = countdownFor('2025-09-22', '2026-09-22', now);
  assert.equal(state.days, 0);
  assert.equal(state.lastDay, true);
  assert.equal(state.expired, false, 'ngày hết hạn vẫn còn hợp lệ trong ngày');
  assert.ok(state.hours >= 13 && state.hours <= 14, `10:00 còn ~13 giờ tới hết ngày, nhận ${state.hours}`);
  assert.equal(state.remainMs, 13 * 3600 * 1000 + 59 * 60 * 1000 + 59999, 'còn đúng tới 23:59:59.999 cùng ngày');

  const html = render(shiftDays(todayIso, -365), todayIso, true);
  assert.equal(bigNumber(html), 0);
  assert.match(html, /Expires today|Hết hạn hôm nay/);
  assert.doesNotMatch(html, /Còn 0 ngày|0 days remaining/);
  assert.doesNotMatch(html, /Expired|Đã hết hạn/, 'hôm nay vẫn còn hợp lệ, chưa phải đã hết hạn');
  const [days, hours] = partNumbers(html);
  assert.equal(days, 0);
  assert.ok(hours >= 0 && hours <= 23, `giờ còn lại phải trong ngày, nhận ${hours}`);
});

test('vòng tròn thể hiện đúng tỷ lệ thời gian đã dùng', () => {
  // Nửa kỳ hạn 2 năm: còn lại ~1 năm => khoảng 50%
  const now = utc('2027-01-01', 0);
  const state = countdownFor('2026-01-01', '2028-01-01', now);
  const pct = state.remainMs / state.totalMs;
  assert.ok(pct > 0.48 && pct < 0.52, `tỷ lệ còn lại phải ~50%, nhận ${(pct * 100).toFixed(1)}%`);
  assert.equal(state.days, remainingDays('2028-01-01', now));
});

test('số ngày không phụ thuộc giờ trong ngày hay múi giờ', () => {
  const expiresAt = '2027-09-22';
  const expected = remainingDays(expiresAt, utc('2026-09-22', 0));
  for (const hour of [0, 5, 12, 23]) {
    assert.equal(countdownFor('2026-09-22', expiresAt, utc('2026-09-22', hour)).days, expected,
      `lúc ${hour}h phải cùng số ngày`);
  }
  assert.equal(todayUtcIso(utc('2026-09-22', 23)), '2026-09-22');
});

test('câu chữ tiếng Việt của đồng hồ đếm ngược', () => {
  const { getTranslation } = require('../lib/i18n/translations.ts');
  assert.equal(getTranslation('vi', 'countdown.remaining', ''), 'Còn {days} ngày');
  assert.equal(getTranslation('vi', 'countdown.expired', ''), 'Đã hết hạn');
  assert.equal(getTranslation('vi', 'countdown.lastDay', ''), 'Hết hạn hôm nay');
  assert.equal(getTranslation('en', 'countdown.lastDay', ''), 'Expires today');
  for (const key of ['remaining', 'expired', 'lastDay']) {
    assert.ok(getTranslation('vi', `countdown.${key}`, ''), `thiếu khoá vi ${key}`);
    assert.ok(getTranslation('en', `countdown.${key}`, ''), `thiếu khoá en ${key}`);
  }
});
