// Isolated SQLite + mocked Supabase tests; never connects to production.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const cwd = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vexim-quotes-'));
process.chdir(temp);
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  return resolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, ...args);
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (mod, filename) => {
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
};
const db = require('../lib/db-sqlite.ts');
const store = require('../lib/db.ts');
const auth = require('../lib/auth.ts');
// Users must exist in the isolated DB: quotes.created_by is a real foreign key.
const STAFF_A = Number(db.createUser({ email: 'nhanvien.a@veximglobal.com', name: 'Nhân viên A', password: 'Test@1234', role: 'specialist' }));
const STAFF_B = Number(db.createUser({ email: 'nhanvien.b@veximglobal.com', name: 'Nhân viên B', password: 'Test@1234', role: 'specialist' }));
const ADMIN = 1;
let session = { id: ADMIN, role: 'admin', name: 'Test Admin' };
auth.getSession = () => session;
const quotes = require('../lib/quotes.ts');
const templates = require('../lib/quote-templates.ts');
const { QUOTE_DEFAULTS: QUOTE_DEFAULTS_FOR_TEST } = require('../lib/quotes.ts');
const { moneyInWords, numberToVietnameseWords } = require('../lib/money-words.ts');
const { generateQuotePdf } = require('../lib/quote-pdf.ts');
const listApi = require('../app/api/quotes/route.ts');
const priceListApi = require('../app/api/quote-templates/route.ts');
const priceItemApi = require('../app/api/quote-templates/[key]/route.ts');
const itemApi = require('../app/api/quotes/[id]/route.ts');
const pdfApi = require('../app/api/quotes/[id]/pdf/route.ts');
const ctx = (id) => ({ params: { id: String(id) } });
const keyCtx = (key) => ({ params: { key } });
const request = (body, method = 'POST') =>
  new Request('http://test/api/quotes', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const bare = (path, method = 'GET') => new Request(`http://test${path}`, { method });
after(() => { process.chdir(cwd); fs.rmSync(temp, { recursive: true, force: true }); });

const quickCreate = (patch = {}) => {
  const input = {
    template_key: 'FDA', company_name: 'CÔNG TY ABC', issue_date: '2026-09-21', valid_until: '2026-10-06', ...patch,
  };
  const template = templates.getQuoteTemplate(input.template_key);
  return db.createQuote(quotes.prepareQuoteInput({
    ...input,
    // Giống API: không gửi hạng mục/hồ sơ thì lấy nguyên mẫu dịch vụ.
    items: input.items || templates.templateItems(input.template_key),
    documents: input.documents === undefined ? template.documents : input.documents,
    scope: input.scope === undefined ? template.scope : input.scope,
    terms: input.terms === undefined ? template.terms : input.terms,
  }), ADMIN);
};

test('đọc số tiền thành chữ đúng chuẩn tiếng Việt', () => {
  assert.equal(numberToVietnameseWords(0), 'Không');
  assert.equal(numberToVietnameseWords(15000), 'Mười lăm nghìn');
  assert.equal(numberToVietnameseWords(1005000), 'Một triệu không trăm lẻ năm nghìn');
  assert.equal(numberToVietnameseWords(1250000), 'Một triệu hai trăm năm mươi nghìn');
  assert.equal(moneyInWords(128040000), 'Một trăm hai mươi tám triệu không trăm bốn mươi nghìn đồng');
  assert.equal(moneyInWords(1_000_000_000), 'Một tỷ đồng');
});

test('DB cũ (bảng quotes chưa có cột documents) tự nâng cấp, giữ nguyên báo giá đã lưu', () => {
  const { DatabaseSync } = require('node:sqlite');
  const id = quickCreate();
  const raw = new DatabaseSync('data/vexim.db');
  raw.exec('PRAGMA foreign_keys=OFF');
  raw.exec(`CREATE TABLE quotes_old AS SELECT * FROM quotes`);
  raw.exec('DROP TABLE quotes');
  raw.exec(`CREATE TABLE quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT, quote_no TEXT NOT NULL UNIQUE, template_key TEXT NOT NULL,
    service_name TEXT NOT NULL DEFAULT '', title TEXT NOT NULL DEFAULT '', company_name TEXT NOT NULL DEFAULT '',
    company_address TEXT NOT NULL DEFAULT '', company_tax_code TEXT NOT NULL DEFAULT '', contact_name TEXT NOT NULL DEFAULT '',
    contact_title TEXT NOT NULL DEFAULT '', contact_phone TEXT NOT NULL DEFAULT '', contact_email TEXT NOT NULL DEFAULT '',
    items TEXT NOT NULL DEFAULT '[]', scope TEXT NOT NULL DEFAULT '[]', terms TEXT NOT NULL DEFAULT '[]',
    timeline TEXT NOT NULL DEFAULT '', payment_terms TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '',
    subtotal INTEGER NOT NULL DEFAULT 0, discount_percent REAL NOT NULL DEFAULT 0, discount_amount INTEGER NOT NULL DEFAULT 0,
    vat_rate REAL NOT NULL DEFAULT 8, vat_amount INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL DEFAULT 0,
    optional_total INTEGER NOT NULL DEFAULT 0, issue_date TEXT NOT NULL, valid_until TEXT,
    status TEXT NOT NULL DEFAULT 'draft', opportunity_id INTEGER, created_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  raw.exec(`INSERT INTO quotes (quote_no, template_key, company_name, items, issue_date, subtotal, vat_amount, total)
    SELECT quote_no, template_key, company_name, items, issue_date, subtotal, vat_amount, total FROM quotes_old`);
  raw.exec('DROP TABLE quotes_old');
  raw.close();
  // Mở lại DB để chạy migration
  const Module2 = require('node:module');
  const dbPath = require.resolve('../lib/db-sqlite.ts');
  delete require.cache[dbPath];
  const fresh = require('../lib/db-sqlite.ts');
  const quote = fresh.getQuote(id);
  assert.equal(quote.company_name, 'CÔNG TY ABC');
  assert.equal(quote.total, db.getQuote(id).total);
  assert.deepEqual(quote.documents, []);
});

test('mẫu báo giá có đủ 4 dịch vụ với hạng mục, đơn giá và điều khoản dựng sẵn', () => {
  assert.deepEqual(templates.QUOTE_TEMPLATES.map((t) => t.key), ['FDA', 'GACC', 'SALE_EXPORT', 'AMAZON_OPS']);
  for (const template of templates.QUOTE_TEMPLATES) {
    assert.ok(template.items.length >= 1, `${template.key} thiếu hạng mục`);
    assert.ok(template.options.length >= 1, `${template.key} thiếu hạng mục tùy chọn`);
    assert.ok(template.scope.length >= 3 && template.terms.length >= 3, `${template.key} thiếu phạm vi/điều khoản`);
    assert.ok(template.items.every((i) => i.qty > 0 && i.unit_price > 0), `${template.key} có dòng 0 đồng`);
    assert.ok(template.payment_terms.length > 20 && template.timeline.length > 20);
  }
});

test('nhân viên tạo báo giá chỉ với thông tin khách hàng — hạng mục lấy từ mẫu', async () => {
  session = { id: STAFF_A, role: 'specialist', name: 'Nhân viên A' };
  const response = await listApi.POST(request({ template_key: 'GACC', company_name: 'CÔNG TY GACC', contact_name: 'Anh B' }));
  assert.equal(response.status, 200);
  const { id } = await response.json();
  const quote = db.getQuote(id);
  assert.equal(quote.template_key, 'GACC');
  assert.equal(quote.service_name, 'Đăng ký GACC (Trung Quốc)');
  assert.equal(quote.status, 'draft');
  assert.equal(quote.created_by, STAFF_A);
  const expected = templates.templateItems('GACC');
  assert.deepEqual(quote.items.map((i) => i.name), expected.map((i) => i.name));
  assert.equal(quote.subtotal, expected.reduce((sum, i) => sum + i.qty * i.unit_price, 0));
  assert.equal(quote.total, quote.subtotal + quote.vat_amount);
  assert.match(quote.quote_no, /^VXM-BG-\d{4}-\d{4}$/);
  assert.ok(quote.scope.length >= 3 && quote.terms.length >= 3);
  // Nhân viên không gửi ngày hết hiệu lực / VAT → lấy theo dịch vụ trong bảng giá
  const template = templates.getQuoteTemplate('GACC');
  assert.equal(quote.issue_date, new Date().toISOString().slice(0, 10), 'ngày báo giá mặc định là hôm nay');
  assert.equal(quote.valid_until, quotes.quoteValidUntil(quote.issue_date, template.validity_days));
  assert.equal(quote.vat_rate, template.vat_rate);
  assert.ok(quote.documents.length >= 3, 'hồ sơ cần cung cấp lấy từ mẫu');
  assert.deepEqual(quote.documents, templates.getQuoteTemplate('GACC').documents);
});

test('báo giá không gửi VAT/hiệu lực vẫn lấy đúng mặc định của dịch vụ trong bảng giá', async () => {
  session = { id: ADMIN, role: 'admin', name: 'Test Admin' };
  const edited = { ...(await store.loadQuoteTemplate('SALE_EXPORT')), validity_days: 30, vat_rate: 10 };
  assert.equal((await priceItemApi.PUT(request(edited, 'PUT'), keyCtx('SALE_EXPORT'))).status, 200);

  const id = (await (await listApi.POST(request({
    template_key: 'SALE_EXPORT', company_name: 'KHÁCH MẶC ĐỊNH', issue_date: '2026-09-21',
  }))).json()).id;
  const quote = db.getQuote(id);
  assert.equal(quote.valid_until, quotes.quoteValidUntil('2026-09-21', 30), 'hiệu lực lấy từ bảng giá');
  assert.equal(quote.vat_rate, 10, 'VAT lấy từ bảng giá');
  assert.equal(quote.total, Math.round(quote.subtotal * 1.1));

  // Hiệu lực vượt 180 ngày vẫn bị chặn khi client tự gửi lên
  const tooLong = await listApi.POST(request({
    template_key: 'SALE_EXPORT', company_name: 'KHÁCH QUÁ HẠN', issue_date: '2026-09-21', valid_until: '2027-12-31',
  }));
  assert.equal(tooLong.status, 400);

  await store.resetQuoteTemplate('SALE_EXPORT');
  assert.equal((await store.loadQuoteTemplate('SALE_EXPORT')).validity_days, templates.getQuoteTemplate('SALE_EXPORT').validity_days);
});

test('server tự tính lại tiền: bỏ qua tổng do client gửi lên, có chiết khấu và hạng mục tùy chọn', async () => {
  session = { id: 1, role: 'admin', name: 'Test Admin' };
  const items = [
    { name: 'Hạng mục chính', unit: 'Gói', qty: 2, unit_price: 10_000_000 },
    { name: 'Hạng mục tùy chọn', unit: 'Năm', qty: 1, unit_price: 7_000_000, optional: true },
  ];
  const id = quickCreate({ items, discount_percent: 10, vat_rate: 8, subtotal: 1, total: 1, vat_amount: 1 });
  const quote = db.getQuote(id);
  assert.equal(quote.subtotal, 20_000_000);
  assert.equal(quote.discount_amount, 2_000_000);
  assert.equal(quote.vat_amount, Math.round(18_000_000 * 0.08));
  assert.equal(quote.total, 18_000_000 + quote.vat_amount);
  assert.equal(quote.optional_total, 7_000_000, 'hạng mục tùy chọn không cộng vào tổng');
  assert.equal(quote.total_in_words, moneyInWords(quote.total));
  assert.equal(quote.state, 'draft');
  assert.equal(quote.days_left, quotes.quoteDaysLeft({ valid_until: quote.valid_until }), 'số ngày còn lại tính từ hiệu lực');
});

test('kiểm tra dữ liệu: chặn hạng mục sai, ngày/hiệu lực sai và dịch vụ lạ', () => {
  const base = { template_key: 'FDA', company_name: 'ABC', issue_date: '2026-09-21' };
  const mustThrow = (input, pattern) => assert.throws(() => quotes.prepareQuoteInput(input), pattern);
  mustThrow({ ...base, items: [] }, /ít nhất 01 hạng mục/);
  mustThrow({ ...base, items: [{ name: 'A', qty: 0, unit_price: 1 }] }, /số lượng/);
  mustThrow({ ...base, items: [{ name: 'A', qty: 1, unit_price: 1.5 }] }, /đơn giá/);
  mustThrow({ ...base, items: [{ name: '', qty: 1, unit_price: 1000 }] }, /nội dung/);
  mustThrow({ ...base, items: [{ name: 'A', qty: 1, unit_price: 0, optional: true }] }, /ít nhất 01 hạng mục chính/);
  mustThrow({ ...base, items: [{ name: 'A', qty: 1, unit_price: 1000 }], discount_percent: 120 }, /Chiết khấu/);
  mustThrow({ ...base, items: [{ name: 'A', qty: 1, unit_price: 1000 }], vat_rate: -1 }, /VAT/);
  mustThrow({ ...base, items: [{ name: 'A', qty: 1, unit_price: 1000 }], valid_until: '2026-09-20' }, /sau ngày báo giá/);
  mustThrow({ ...base, items: [{ name: 'A', qty: 1, unit_price: 1000 }], valid_until: '2027-09-21' }, /tối đa 180 ngày/);
  mustThrow({ template_key: 'UNKNOWN', company_name: 'ABC', items: [{ name: 'A', qty: 1, unit_price: 1 }] }, /Dịch vụ không hợp lệ/);
  mustThrow({ ...base, company_name: '   ', items: [{ name: 'A', qty: 1, unit_price: 1000 }] }, /Tên công ty/);
  // Ghi chú/xuống dòng trong hạng mục không được chứa ký tự điều khiển
  mustThrow({ ...base, items: [{ name: 'A\u0000B', qty: 1, unit_price: 1000 }] }, /không hợp lệ/);
});

test('bản nháp sửa được; bản đã gửi khách bị khóa và phải nhân bản mới sửa được', () => {
  const id = quickCreate();
  db.updateQuote(id, quotes.prepareQuoteInput({
    template_key: 'FDA', company_name: 'CÔNG TY ABC (đổi tên)', issue_date: '2026-09-21',
    items: templates.templateItems('FDA'), discount_percent: 5, vat_rate: 8,
  }));
  assert.equal(db.getQuote(id).company_name, 'CÔNG TY ABC (đổi tên)');
  assert.equal(db.getQuote(id).discount_amount, Math.round(db.getQuote(id).subtotal * 0.05));

  db.setQuoteStatus(id, 'sent');
  const sent = db.getQuote(id);
  assert.equal(sent.state, 'sent');
  assert.throws(() => db.updateQuote(id, quotes.prepareQuoteInput({
    template_key: 'FDA', company_name: 'Đổi trộm', issue_date: '2026-09-21', items: templates.templateItems('FDA'),
  })), /LOCKED_QUOTE/);
  assert.throws(() => db.setQuoteStatus(id, 'draft'), /INVALID_STATUS/);
  assert.equal(db.getQuote(id).company_name, 'CÔNG TY ABC (đổi tên)');

  db.setQuoteStatus(id, 'accepted');
  assert.equal(db.getQuote(id).state, 'accepted');

  const copyId = db.duplicateQuote(id, STAFF_B);
  const copy = db.getQuote(copyId);
  assert.notEqual(copy.quote_no, sent.quote_no);
  assert.equal(copy.status, 'draft');
  assert.equal(copy.company_name, sent.company_name);
  assert.deepEqual(copy.items, sent.items);
  assert.equal(copy.total, sent.total);
  assert.equal(copy.opportunity_id, sent.opportunity_id);
  assert.equal(quotes.canDeleteQuote(db.getQuote(id), 'specialist'), false);
  assert.equal(quotes.canDeleteQuote(db.getQuote(id), 'admin'), true);
  assert.equal(quotes.canDeleteQuote(copy, 'specialist'), true);
});

test('báo giá hết hiệu lực được hiển thị đúng trạng thái', () => {
  const id = quickCreate({ issue_date: '2026-01-01', valid_until: '2026-01-16' });
  const quote = db.getQuote(id);
  assert.equal(quote.status, 'draft');
  assert.equal(quote.state, 'expired');
  db.setQuoteStatus(id, 'accepted');
  assert.equal(db.getQuote(id).state, 'accepted', 'khách đã đồng ý thì không đổi sang hết hiệu lực');
});

test('API: phân quyền, trạng thái và lỗi dữ liệu trả về đúng mã', async () => {
  session = null;
  assert.equal((await listApi.POST(request({ template_key: 'FDA', company_name: 'X' }))).status, 401);
  session = { id: STAFF_A, role: 'specialist', name: 'Nhân viên A' };
  assert.equal((await listApi.POST(request({ template_key: 'NOPE', company_name: 'X' }))).status, 400);
  assert.equal((await listApi.POST(request({ template_key: 'FDA' }))).status, 400);
  const created = await listApi.POST(request({ template_key: 'AMAZON_OPS', company_name: 'CÔNG TY AMZ' }));
  const { id } = await created.json();

  // Người khác không sửa/xóa được báo giá của đồng nghiệp
  session = { id: STAFF_B, role: 'specialist', name: 'Nhân viên B' };
  assert.equal((await itemApi.PATCH(request({ company_name: 'ĐỔI TRỘM' }, 'PATCH'), ctx(id))).status, 403);
  assert.equal((await itemApi.DELETE(request({}, 'DELETE'), ctx(id))).status, 403);

  // Chủ báo giá gửi khách rồi thì không sửa nội dung nữa
  session = { id: STAFF_A, role: 'specialist', name: 'Nhân viên A' };
  const sent = await itemApi.PATCH(request({ action: 'status', status: 'sent' }, 'PATCH'), ctx(id));
  assert.equal(sent.status, 200);
  const blocked = await itemApi.PATCH(request({ company_name: 'ĐỔI SAU KHI GỬI' }, 'PATCH'), ctx(id));
  assert.equal(blocked.status, 409);
  const back = await itemApi.PATCH(request({ action: 'status', status: 'draft' }, 'PATCH'), ctx(id));
  assert.equal(back.status, 409);
  assert.equal(db.getQuote(id).company_name, 'CÔNG TY AMZ');

  // Nhân bản tạo bản nháp mới cho lần gửi tiếp theo
  const dup = await itemApi.PATCH(request({ action: 'duplicate' }, 'PATCH'), ctx(id));
  assert.equal(dup.status, 200);
  const dupId = (await dup.json()).id;
  assert.equal(db.getQuote(dupId).status, 'draft');

  // Admin xóa được bản đã gửi khách; nhân viên thì không
  session = { id: STAFF_B, role: 'specialist', name: 'Nhân viên B' };
  assert.equal((await itemApi.DELETE(request({}, 'DELETE'), ctx(id))).status, 403);
  session = { id: 1, role: 'admin', name: 'Test Admin' };
  assert.equal((await itemApi.DELETE(request({}, 'DELETE'), ctx(id))).status, 200);
  assert.equal(db.getQuote(id), undefined);
});

test('API danh sách: lọc theo dịch vụ, trạng thái và từ khóa', async () => {
  session = { id: 1, role: 'admin', name: 'Test Admin' };
  quickCreate({ template_key: 'SALE_EXPORT', company_name: 'CÔNG TY XUẤT KHẨU MỸ' });
  assert.ok(db.listQuotes({ template_key: 'SALE_EXPORT' }).every((q) => q.template_key === 'SALE_EXPORT'));
  assert.ok(db.listQuotes({ q: 'xuất khẩu' }).length >= 1);
  assert.ok(db.listQuotes({ status: 'draft' }).every((q) => q.status === 'draft'));
  const response = await listApi.GET(new Request('http://test/api/quotes?template=SALE_EXPORT'));
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(payload.count >= 1 && payload.items.every((q) => q.template_key === 'SALE_EXPORT'));
  assert.equal((await listApi.GET(new Request('http://test/api/quotes?template=BAD'))).status, 400);
});

test('bản xem trước trên màn hình khớp dữ liệu đã lưu (không tự tính lại con số)', () => {
  const { QuotePreview } = require('../components/quotes/QuotePreview.tsx');
  const { formatMoney } = require('../lib/accounting.ts');
  const id = quickCreate({ contact_name: 'Anh E', discount_percent: 7 });
  const quote = db.getQuote(id);
  const html = renderToStaticMarkup(React.createElement(QuotePreview, { quote }));
  assert.ok(html.includes(quote.quote_no));
  assert.ok(html.includes('CÔNG TY ABC'));
  assert.ok(html.includes('TỔNG CỘNG (đã gồm VAT)'));
  assert.ok(html.includes(formatMoney(quote.total)));
  assert.ok(html.includes(formatMoney(quote.discount_amount)), 'chiết khấu hiển thị đúng');
  assert.ok(html.includes('Hồ sơ Quý khách cần cung cấp'));
  assert.ok(html.includes('Vì sao chọn Vexim Global'));
  // Khối thông tin thanh toán + chữ ký Vexim canh theo cột NGÂN HÀNG (đúng như bản PDF)
  assert.ok(html.includes('Đơn vị thụ hưởng') && html.includes('Số tài khoản') && html.includes('Ngân hàng'));
  assert.ok(html.includes(QUOTE_DEFAULTS_FOR_TEST.bank_account), 'hiện số tài khoản nhận tiền');
  assert.ok(html.includes(QUOTE_DEFAULTS_FOR_TEST.signer_name), 'hiện tên người ký');
  assert.ok(html.split('grid-cols-[52fr_20fr_28fr]').length - 1 >= 2, 'dải thanh toán và chữ ký dùng chung tỉ lệ 3 cột');
  assert.ok(!html.includes('<script'), 'không chèn HTML lạ từ dữ liệu người dùng');
  // Nội dung người dùng nhập được escape an toàn
  const evil = quickCreate({ company_name: 'CÔNG TY <b>X</b> & Co' });
  const escaped = renderToStaticMarkup(React.createElement(QuotePreview, { quote: db.getQuote(evil) }));
  assert.ok(escaped.includes('CÔNG TY &lt;b&gt;X&lt;/b&gt; &amp; Co'));
  assert.ok(!escaped.includes('<b>X</b>'));
});

test('nội dung gửi khách và PDF: đủ số tiền, bằng chữ, hạng mục tùy chọn', async () => {
  const id = quickCreate({
    items: [
      { name: 'Đăng ký FDA cơ sở', unit: 'Hồ sơ', qty: 1, unit_price: 38_000_000, note: 'Bao gồm rà soát hồ sơ' },
      { name: 'US Agent 12 tháng', unit: 'Năm', qty: 1, unit_price: 8_500_000, optional: true },
    ],
    discount_percent: 5,
    contact_name: 'Anh C',
  });
  const quote = db.getQuote(id);
  const message = quotes.buildQuoteMessage(quote);
  assert.ok(message.includes(quote.quote_no));
  assert.ok(message.includes('Đăng ký FDA cơ sở'));
  assert.ok(message.includes('Hạng mục tùy chọn'));
  assert.ok(message.includes('TỔNG CỘNG'));
  assert.ok(message.includes(quote.total_in_words.replace(' đồng', '')));

  const pdf = await generateQuotePdf(quote);
  assert.ok(pdf.byteLength > 15_000, 'PDF phải có nội dung thật');
  assert.equal(Buffer.from(pdf.slice(0, 5)).toString(), '%PDF-');

  session = { id: STAFF_B, role: 'specialist', name: 'Nhân viên B' };
  const delivered = await pdfApi.GET(new Request('http://test'), ctx(id));
  assert.equal(delivered.status, 200);
  assert.equal(delivered.headers.get('Content-Type'), 'application/pdf');
  assert.ok(delivered.headers.get('Content-Disposition').includes('Bao-gia-'));
  session = null;
  assert.equal((await pdfApi.GET(new Request('http://test'), ctx(id))).status, 401);
  session = { id: 1, role: 'admin', name: 'Test Admin' };
  assert.equal((await pdfApi.GET(new Request('http://test'), ctx(999999))).status, 404);
});

test('bảng giá dịch vụ: Admin sửa giá, báo giá tạo mới dùng giá mới, báo giá cũ giữ nguyên', async () => {
  session = { id: ADMIN, role: 'admin', name: 'Test Admin' };
  const oldFdaId = quickCreate({ company_name: 'KHÁCH CŨ', items: templates.templateItems('FDA') });
  // 1. Bảng giá ban đầu = giá mặc định trong code
  const before = await store.loadQuoteTemplate('FDA');
  assert.equal(before.items[0].unit_price, templates.getQuoteTemplate('FDA').items[0].unit_price);
  assert.deepEqual(await store.listQuoteTemplateRows(), [], 'chưa chỉnh gì thì không có dòng nào trong DB');

  // 2. Nhân viên không được sửa giá
  session = { id: STAFF_A, role: 'specialist', name: 'Nhân viên A' };
  const denied = await priceItemApi.PUT(request({ items: [{ name: 'X', unit: 'Gói', qty: 1, unit_price: 999 }] }, 'PUT'), keyCtx('FDA'));
  assert.equal(denied.status, 403);

  // 3. Admin thêm 01 hạng mục mới và đổi đơn giá
  session = { id: ADMIN, role: 'admin', name: 'Test Admin' };
  const edited = {
    ...templates.getQuoteTemplate('FDA'),
    items: [
      { name: 'Hạng mục FDA (giá điều chỉnh)', unit: 'Gói', qty: 1, unit_price: 33_000_000 },
      { name: 'Hạng mục mới thêm', unit: 'Lần', qty: 2, unit_price: 1_500_000, note: 'Do Admin thêm' },
    ],
  };
  const saved = await priceItemApi.PUT(request(edited, 'PUT'), keyCtx('FDA'));
  assert.equal(saved.status, 200);
  const custom = await store.loadQuoteTemplate('FDA');
  assert.equal(custom.items.length, 2);
  assert.equal(custom.items[0].unit_price, 33_000_000);
  assert.equal((await store.listQuoteTemplateRows()).length, 1);

  // 4. Báo giá tạo mới lấy giá đã chỉnh (kể cả tên hạng mục mới)
  const quoteId = (await (await listApi.POST(request({ template_key: 'FDA', company_name: 'KHÁCH GIÁ MỚI' }))).json()).id;
  const fresh = db.getQuote(quoteId);
  assert.deepEqual(fresh.items.map((i) => i.name), ['Hạng mục FDA (giá điều chỉnh)', 'Hạng mục mới thêm']);
  assert.equal(fresh.subtotal, 33_000_000 + 2 * 1_500_000);

  // 5. Báo giá cũ là ảnh chụp — không đổi theo bảng giá mới
  const old = db.getQuote(oldFdaId);
  assert.notEqual(old.items[0].unit_price, 33_000_000, 'báo giá cũ giữ giá tại thời điểm lập');
  assert.equal(old.subtotal, old.items.reduce((sum, i) => sum + i.qty * i.unit_price, 0));

  // 6. Xóa dòng giá riêng → quay về giá mặc định
  const reset = await priceItemApi.DELETE(request({}, 'DELETE'), keyCtx('FDA'));
  assert.equal(reset.status, 200);
  assert.equal((await store.listQuoteTemplateRows()).length, 0);
  assert.deepEqual((await store.loadQuoteTemplate('FDA')).items, templates.getQuoteTemplate('FDA').items);
  assert.equal((await (await listApi.POST(request({ template_key: 'FDA', company_name: 'KHÁCH GIÁ GỐC' }))).json()).id > 0, true);
});

test('bảng giá dịch vụ: kiểm tra dữ liệu và phân quyền API', async () => {
  session = { id: ADMIN, role: 'admin', name: 'Test Admin' };
  // Hạng mục không tên / giá âm / mã tùy chọn sai → 400
  for (const bad of [
    { ...templates.getQuoteTemplate('GACC'), items: [{ name: '', unit: 'Gói', qty: 1, unit_price: 1000 }] },
    { ...templates.getQuoteTemplate('GACC'), items: [{ name: 'A', unit: 'Gói', qty: 1, unit_price: -1 }] },
    { ...templates.getQuoteTemplate('GACC'), items: [] },
    { ...templates.getQuoteTemplate('GACC'), validity_days: 999 },
    { ...templates.getQuoteTemplate('GACC'), vat_rate: 150 },
    { ...templates.getQuoteTemplate('GACC'), options: [{ key: 'MÃ SAI', label: 'X', unit: 'Lần', qty: 1, unit_price: 1000, note: '', group: 'Khác' }] },
  ]) {
    const res = await priceItemApi.PUT(request(bad, 'PUT'), keyCtx('GACC'));
    assert.equal(res.status, 400, `phải chặn: ${JSON.stringify(bad.items?.[0] || bad.validity_days || bad.vat_rate)}`);
  }
  assert.equal((await priceItemApi.PUT(request({}, 'PUT'), keyCtx('KHONG_CO'))).status, 400);

  // Chưa đăng nhập → 401 (cả đọc lẫn ghi)
  session = null;
  assert.equal((await priceListApi.GET()).status, 401);
  assert.equal((await priceItemApi.PUT(request({}, 'PUT'), keyCtx('FDA'))).status, 401);
  assert.equal((await priceItemApi.GET(bare('/api/quote-templates/FDA'), keyCtx('FDA'))).status, 401);
  assert.equal((await priceItemApi.DELETE(request({}, 'DELETE'), keyCtx('FDA'))).status, 401);
  session = { id: STAFF_A, role: 'specialist', name: 'Nhân viên A' };
  const list = await (await priceListApi.GET()).json();
  assert.equal(list.items.length, 4, 'nhân viên vẫn xem được bảng giá để lập báo giá');
  assert.ok(Array.isArray(list.customized));
});

test('bảng giá dịch vụ: dữ liệu hỏng trong DB bị bỏ qua, dùng lại giá mặc định', async () => {
  session = { id: ADMIN, role: 'admin', name: 'Test Admin' };
  db.saveQuoteTemplateRow('SALE_EXPORT', { items: [{ name: 'Rác', unit: 'Gói', qty: 0, unit_price: 1 }] }, ADMIN);
  const merged = await store.listQuoteTemplates();
  const sale = merged.find((t) => t.key === 'SALE_EXPORT');
  assert.deepEqual(sale.items, templates.getQuoteTemplate('SALE_EXPORT').items, 'payload sai → rơi về mặc định');
  db.deleteQuoteTemplateRow('SALE_EXPORT');
  assert.equal((await store.loadQuoteTemplate('SALE_EXPORT')).items.length, templates.getQuoteTemplate('SALE_EXPORT').items.length);
});

test('Supabase adapter (mock): tạo, đọc, sửa, đổi trạng thái và nhân bản báo giá', async () => {
  const cloud = require('../lib/db-supabase.ts');
  const supabase = require('../lib/supabase.ts');
  const previous = supabase.supabaseAdmin;
  const tables = { staff_users: [{ id: 1, name: 'Admin', email: 'a@b.c', role: 'admin' }], quotes: [] };
  supabase.supabaseAdmin = () => ({ from(table) {
    let filters = [], payload, mode = 'read', max, ordering = [];
    const query = {
      select() { return this; }, eq(key, value) { filters.push(r => r[key] === value); return this; },
      like(key, value) { filters.push(r => String(r[key]).startsWith(value.replace(/%$/, ''))); return this; },
      ilike(key, value) { filters.push(r => String(r[key]).toLowerCase().includes(value.toLowerCase())); return this; },
      or() { return this; },
      order(key, opts) { ordering.push([key, opts?.ascending]); return this; }, limit(n) { max = n; return this; },
      insert(value) { mode = 'insert'; payload = value; return this; }, update(value) { mode = 'update'; payload = value; return this; },
      delete() { mode = 'delete'; return this; },
      execute(single = false) {
        let rows = tables[table].filter(r => filters.every(f => f(r)));
        if (mode === 'insert') { const row = { id: tables[table].length + 1, created_at: new Date().toISOString(), ...structuredClone(payload) }; tables[table].push(row); rows = [row]; }
        if (mode === 'update') rows.forEach(r => Object.assign(r, structuredClone(payload)));
        if (mode === 'delete') { tables[table] = tables[table].filter(r => !filters.every(f => f(r))); rows = []; }
        for (const [key, asc] of ordering.reverse()) rows = rows.toSorted((a, b) => String(a[key] ?? '').localeCompare(String(b[key] ?? '')) * (asc ? 1 : -1));
        if (max) rows = rows.slice(0, max);
        return { data: structuredClone(single ? rows[0] || null : rows), error: null, count: rows.length };
      },
      single() { return Promise.resolve(this.execute(true)); }, maybeSingle() { return Promise.resolve(this.execute(true)); },
      then(resolve, reject) { return Promise.resolve(this.execute()).then(resolve, reject); },
    };
    return query;
  }});
  try {
    const input = quotes.prepareQuoteInput({
      template_key: 'AMAZON_OPS', company_name: 'CLOUD COMPANY', issue_date: '2026-09-21', valid_until: '2026-10-06',
      items: templates.templateItems('AMAZON_OPS'), discount_percent: 0, vat_rate: 8,
    });
    const id = await cloud.createQuote(input, 1);
    const loaded = await cloud.getQuote(id);
    assert.equal(loaded.company_name, 'CLOUD COMPANY');
    assert.equal(loaded.service_name, 'Vận hành Amazon US');
    assert.equal(loaded.items.length, input.items.length, 'jsonb items giữ nguyên');
    assert.equal(loaded.total, loaded.subtotal + loaded.vat_amount);
    assert.ok(tables.quotes[0].quote_no.startsWith('VXM-BG-'));

    await cloud.updateQuote(id, { ...input, company_name: 'CLOUD EDITED', discount_percent: 10 });
    const edited = await cloud.getQuote(id);
    assert.equal(edited.company_name, 'CLOUD EDITED');
    assert.equal(edited.discount_amount, Math.round(edited.subtotal * 0.1));

    await cloud.setQuoteStatus(id, 'sent');
    assert.equal((await cloud.getQuote(id)).state, 'sent');
    await assert.rejects(() => cloud.updateQuote(id, { ...input, company_name: 'KHÔNG ĐƯỢC' }), /LOCKED_QUOTE/);
    const copyId = await cloud.duplicateQuote(id, 1);
    assert.equal((await cloud.getQuote(copyId)).status, 'draft');
    assert.equal((await cloud.listQuotes({ template_key: 'AMAZON_OPS' })).length, 2);
    await cloud.deleteQuote(copyId);
    assert.equal(await cloud.getQuote(copyId), undefined);
  } finally { supabase.supabaseAdmin = previous; }
});
