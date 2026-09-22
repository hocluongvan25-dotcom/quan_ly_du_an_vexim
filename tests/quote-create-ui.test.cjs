/**
 * Kiểm thử giao diện tạo báo giá (jsdom + React thật):
 * - Bước 1 (hạng mục) có nút "Tiếp tục" ở dưới cùng để sang bước 2.
 * - Bước 2 gộp thông tin khách hàng + điều kiện báo giá (chỉ còn 2 bước).
 * - Gõ đúng tên doanh nghiệp trong danh mục → tự mapping địa chỉ, MST, người liên hệ, SĐT, email.
 * - Sửa số lượng/đơn giá → thành tiền và tổng kết tự tính lại ngay.
 * Không kết nối DB thật; fetch được stub bằng dữ liệu của chính lib/quote-templates.
 */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');

/* ------------------------------- Môi trường DOM ---------------------------- */
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/dashboard/bao-gia/moi',
  pretendToBeVisual: true,
});
dom.window.scrollTo = () => {};
for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'Event', 'MouseEvent', 'Node']) {
  Object.defineProperty(global, key, { value: dom.window[key], configurable: true, writable: true });
}
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
global.IS_REACT_ACT_ENVIRONMENT = true;

/* ------------------------ Module con của Next (stub) ----------------------- */
const stubs = fs.mkdtempSync(path.join(os.tmpdir(), 'vexim-ui-stubs-'));
fs.writeFileSync(
  path.join(stubs, 'navigation.js'),
  `exports.useRouter = () => ({ push: (url) => { global.__pushedTo = url; }, replace() {}, refresh() {}, back() {}, prefetch() {} });
   exports.useSearchParams = () => new URLSearchParams(process.env.__QUERY__ || "");`
);
const REACT_PATH = require.resolve('react', { paths: [root] });
fs.writeFileSync(
  path.join(stubs, 'link.js'),
  `const React = require(${JSON.stringify(REACT_PATH)});
   const Link = ({ href, children, ...rest }) => React.createElement("a", { href, ...rest }, children);
   module.exports = Link; module.exports.default = Link;`
);

const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  if (request === 'next/navigation') return path.join(stubs, 'navigation.js');
  if (request === 'next/link') return path.join(stubs, 'link.js');
  return resolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, ...args);
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (mod, filename) => {
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
};

const React = require('react');
const { createRoot } = require('react-dom/client');
const { act } = require('react-dom/test-utils');
const templates = require('../lib/quote-templates.ts');
const { calcQuoteTotals } = require('../lib/quotes.ts');
const { formatMoney } = require('../lib/accounting.ts');

/* --------------------------------- Dữ liệu -------------------------------- */
const TEMPLATE_FIXTURES = JSON.parse(JSON.stringify(templates.QUOTE_TEMPLATES));
const COMPANY_FIXTURES = [
  {
    // Đã có chứng nhận GACC → vẫn gợi ý khi báo giá FDA, bị ẩn khi báo giá GACC.
    id: 7,
    company_name: 'CÔNG TY TNHH THỰC PHẨM ABC',
    email: 'xuatkhau@abc-food.vn',
    phone: '0901 234 567',
    tax_code: '0107654321',
    address: 'Lô B2 KCN Tân Tạo, Bình Tân, TP. HCM',
    contact_person: 'Chị Trần Thu Hà',
    standards: ['GACC'],
    certificate_count: 1,
  },
  {
    // Chưa đăng ký dịch vụ nào → luôn được gợi ý.
    id: 8,
    company_name: 'CÔNG TY CP NÔNG SẢN SẠCH VIỆT',
    email: 'info@nongsansachviet.vn',
    phone: '0912 345 678',
    tax_code: '0101234567',
    address: 'Số 12 Lý Thường Kiệt, Hoàn Kiếm, Hà Nội',
    contact_person: 'Anh Lê Văn Nam',
    standards: [],
    certificate_count: 0,
  },
  {
    // Đã có chứng nhận FDA → bị ẩn khi báo giá FDA.
    id: 9,
    company_name: 'CÔNG TY TNHH ĐÃ CÓ FDA',
    email: 'fda@dacofda.vn',
    phone: '0903 777 888',
    tax_code: '0312345678',
    address: 'Số 99 Nguyễn Văn Linh, Q. 7, TP. HCM',
    contact_person: 'Anh Hoàng Đăng Khoa',
    standards: ['FDA'],
    certificate_count: 1,
  },
];

const jsonResponse = (data) => Promise.resolve({ ok: true, json: () => Promise.resolve(data) });
global.fetch = (url, init) => {
  const target = String(url);
  if (target.includes('/api/quote-templates')) {
    return jsonResponse({ items: TEMPLATE_FIXTURES, customized: [], price_note: 'Giá mẫu' });
  }
  if (target.includes('/api/companies')) {
    return jsonResponse({ companies: COMPANY_FIXTURES, items: COMPANY_FIXTURES });
  }
  if (target.includes('/api/quotes')) {
    global.__created = JSON.parse(String(init?.body || '{}'));
    return jsonResponse({ id: 99, success: true });
  }
  return jsonResponse({});
};

after(() => fs.rmSync(stubs, { recursive: true, force: true }));

/* -------------------------------- Tiện ích -------------------------------- */
const setNativeValue = (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, value);
};

const flush = async (ms = 30) => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
};

const clickByText = async (container, text) => {
  const button = [...container.querySelectorAll('button')].find((b) => b.textContent.includes(text));
  assert.ok(button, `không tìm thấy nút "${text}"`);
  await act(async () => {
    button.click();
  });
  await flush();
  return button;
};

const typeInto = async (input, value) => {
  await act(async () => {
    setNativeValue(input, value);
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  await flush(10);
};

const inputByPlaceholder = (placeholder) =>
  document.querySelector(`input[placeholder="${placeholder}"]`);

const inputByLabel = (label) => {
  const node = [...document.querySelectorAll('label')].find((l) => l.textContent.trim().startsWith(label));
  return node ? node.querySelector('input') : null;
};

/* ---------------------------------- Test ---------------------------------- */
test('chỉ gợi ý doanh nghiệp chưa đăng ký đúng dịch vụ đang báo giá', async () => {
  const container = document.getElementById('root');
  const reactRoot = createRoot(container);
  const Page = require('../app/dashboard/bao-gia/moi/page.tsx').default;
  await act(async () => {
    reactRoot.render(React.createElement(Page));
  });
  await flush(40);

  // Vào bước 2 để thao tác ô tên công ty
  await clickByText(container, 'Tiếp tục: thông tin khách hàng');
  const companyInput = inputByPlaceholder('VD: CÔNG TY TNHH THỰC PHẨM ABC');
  assert.ok(companyInput, 'thiếu ô tên công ty khách hàng');

  // 1. Báo giá FDA: doanh nghiệp đã có FDA bị ẩn hoàn toàn (không tự điền)
  await typeInto(companyInput, 'CÔNG TY TNHH ĐÃ CÓ FDA');
  assert.ok(!container.textContent.includes('Đã lấy dữ liệu từ danh mục doanh nghiệp'), 'không được tự điền cho khách đã đăng ký FDA');
  assert.equal(inputByLabel('Địa chỉ').value, '', 'địa chỉ phải để trống với doanh nghiệp đã đăng ký');
  assert.equal(inputByLabel('Mã số thuế').value, '', 'không mapping MST cho doanh nghiệp đã đăng ký FDA');
  const suggestText = container.querySelector('.absolute.z-20')?.textContent || '';
  assert.ok(!suggestText.includes('ĐÃ CÓ FDA'), 'doanh nghiệp đã đăng ký FDA không được xuất hiện trong gợi ý');

  // 2. Doanh nghiệp chưa đăng ký vẫn tự điền bình thường
  await typeInto(companyInput, 'CÔNG TY CP NÔNG SẢN SẠCH VIỆT');
  assert.match(container.textContent, /Đã lấy dữ liệu từ danh mục doanh nghiệp/);
  assert.equal(inputByLabel('Mã số thuế').value, COMPANY_FIXTURES[1].tax_code);

  // 3. Doanh nghiệp mới chỉ có GACC vẫn dùng được cho báo giá FDA (bán chéo dịch vụ)
  await typeInto(companyInput, 'CÔNG TY TNHH THỰC PHẨM ABC');
  assert.match(container.textContent, /Đã lấy dữ liệu từ danh mục doanh nghiệp/);
  assert.equal(inputByLabel('Mã số thuế').value, COMPANY_FIXTURES[0].tax_code);
  assert.match(container.textContent, /Đã ẩn 1 doanh nghiệp đã đăng ký FDA/, 'phải cho biết đã ẩn bao nhiêu doanh nghiệp');

  // Gõ một phần tên (chưa khớp hẳn) → mở danh sách gợi ý để xem nhãn trạng thái
  await typeInto(companyInput, 'THỰC PHẨM');
  const partialSuggest = container.querySelector('.absolute.z-20')?.textContent || '';
  assert.match(partialSuggest, /Chưa đăng ký FDA \(đã có: GACC\)/, 'gợi ý phải nêu rõ doanh nghiệp đã đăng ký dịch vụ nào');
  assert.ok(!partialSuggest.includes('ĐÃ CÓ FDA'), 'doanh nghiệp đã đăng ký FDA vẫn không được xuất hiện');

  // Gõ lại đúng tên để kiểm tra tự mapping
  await typeInto(companyInput, 'CÔNG TY TNHH THỰC PHẨM ABC');
  assert.equal(inputByLabel('Mã số thuế').value, COMPANY_FIXTURES[0].tax_code, 'gõ đúng tên vẫn tự mapping');

  // 4. Chuyển sang báo giá GACC → doanh nghiệp đã có GACC bị ẩn, báo giá FDA lại hiện
  await clickByText(container, '1. Hạng mục & đơn giá');
  await clickByText(container, 'Đăng ký GACC (Trung Quốc)');
  await clickByText(container, 'Tiếp tục: thông tin khách hàng');

  const gaccInput = inputByPlaceholder('VD: CÔNG TY TNHH THỰC PHẨM ABC');
  await typeInto(gaccInput, 'CÔNG TY CP NÔNG SẢN SẠCH VIỆT');
  assert.match(container.textContent, /Đã lấy dữ liệu từ danh mục doanh nghiệp/, 'doanh nghiệp chưa đăng ký vẫn phải tự điền');
  assert.equal(inputByLabel('Mã số thuế').value, COMPANY_FIXTURES[1].tax_code);

  await typeInto(gaccInput, 'CÔNG TY TNHH THỰC PHẨM ABC');
  const gaccSuggest = container.querySelector('.absolute.z-20')?.textContent || '';
  assert.ok(!gaccSuggest.includes('THỰC PHẨM ABC'), 'doanh nghiệp đã đăng ký GACC không được gợi ý khi báo giá GACC');

  // 5. Báo giá Sale xuất khẩu không gắn chứng nhận → hiện đầy đủ danh mục
  await clickByText(container, '1. Hạng mục & đơn giá');
  await clickByText(container, 'Sale xuất khẩu Mỹ');
  await clickByText(container, 'Tiếp tục: thông tin khách hàng');
  assert.ok(!container.textContent.includes('Đã ẩn'), 'dịch vụ không gắn chứng nhận thì không ẩn doanh nghiệp nào');
  const saleInput = inputByPlaceholder('VD: CÔNG TY TNHH THỰC PHẨM ABC');
  await typeInto(saleInput, 'CÔNG TY TNHH THỰC PHẨM ABC');
  assert.match(container.textContent, /Đã lấy dữ liệu từ danh mục doanh nghiệp/);
});

test('tạo báo giá: 2 bước, nút Tiếp tục ở dưới, tự mapping dữ liệu công ty và tính tiền ngay', async () => {
  const container = document.getElementById('root');
  const reactRoot = createRoot(container);
  const Page = require('../app/dashboard/bao-gia/moi/page.tsx').default;
  await act(async () => {
    reactRoot.render(React.createElement(Page));
  });
  await flush(40);

  const fda = templates.getQuoteTemplate('FDA');
  const mainItems = fda.items.map((i) => ({ ...i, note: i.note || '', optional: false }));

  /* --- Bước 1: hạng mục sửa được + nút Tiếp tục ở dưới --- */
  assert.match(container.textContent, /Hạng mục báo giá — sửa số lượng/, 'thiếu tiêu đề bước 1');
  assert.match(container.textContent, new RegExp(fda.items[0].name.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.ok(container.textContent.includes('Tiếp tục: thông tin khách hàng'), 'thiếu nút Tiếp tục ở bước 1');
  assert.ok(!container.textContent.includes('Điều kiện báo giá'), 'bước 1 không được chứa phần điều kiện');

  /* --- Tick 1 hạng mục tùy chọn → in kèm nhưng không cộng vào tổng --- */
  const optionLabel = [...container.querySelectorAll('label')].find((l) =>
    l.textContent.includes(fda.options[0].label)
  );
  assert.ok(optionLabel, 'thiếu hạng mục tùy chọn của dịch vụ');
  await act(async () => {
    optionLabel.querySelector('input[type="checkbox"]').click();
  });
  await flush(10);
  assert.match(container.textContent, /Tùy chọn — không cộng vào tổng/, 'hạng mục tùy chọn phải được đánh dấu riêng');

  /* --- Bấm nút Tiếp tục ở dưới danh sách hạng mục --- */
  await clickByText(container, 'Tiếp tục: thông tin khách hàng');

  assert.match(container.textContent, /Thông tin khách hàng/, 'thiếu bước 2');
  assert.match(container.textContent, /Điều kiện báo giá/, 'bước 3 phải được gộp vào bước 2');
  assert.ok(!container.textContent.includes('Hạng mục báo giá — sửa số lượng'), 'đã sang bước 2 thì ẩn danh sách hạng mục');
  assert.ok(container.textContent.includes('2. Thông tin khách hàng & điều kiện'), 'thiếu nhãn bước 2');
  assert.ok(!/3\.\s/.test(container.textContent), 'không còn bước 3 riêng');
  assert.ok(container.textContent.includes('Ngày báo giá') && container.textContent.includes('VAT (%)'));

  /* --- Gõ tên doanh nghiệp có trong danh mục → tự mapping --- */
  const companyInput = inputByPlaceholder('VD: CÔNG TY TNHH THỰC PHẨM ABC');
  assert.ok(companyInput, 'thiếu ô tên công ty khách hàng');
  await typeInto(companyInput, 'CÔNG TY TNHH THỰC PHẨM ABC');

  assert.match(container.textContent, /Đã lấy dữ liệu từ danh mục doanh nghiệp/, 'thiếu xác nhận mapping');
  assert.equal(inputByLabel('Địa chỉ').value, COMPANY_FIXTURES[0].address, 'địa chỉ chưa được điền');
  assert.equal(inputByLabel('Mã số thuế').value, COMPANY_FIXTURES[0].tax_code, 'MST chưa được điền');
  assert.equal(inputByLabel('Người liên hệ').value, COMPANY_FIXTURES[0].contact_person, 'người liên hệ chưa được điền');
  assert.equal(inputByLabel('Số điện thoại').value, COMPANY_FIXTURES[0].phone, 'SĐT chưa được điền');
  assert.equal(inputByLabel('Email nhận báo giá').value, COMPANY_FIXTURES[0].email, 'email chưa được điền');

  /* --- Đổi sang doanh nghiệp khác trong danh mục → mapping lại --- */
  await typeInto(companyInput, 'CÔNG TY CP NÔNG SẢN SẠCH VIỆT');
  assert.equal(inputByLabel('Địa chỉ').value, COMPANY_FIXTURES[1].address, 'đổi công ty phải mapping lại địa chỉ');
  assert.equal(inputByLabel('Mã số thuế').value, COMPANY_FIXTURES[1].tax_code, 'đổi công ty phải mapping lại MST');

  /* --- Nhập tay công ty mới: không xoá dữ liệu đã mapping --- */
  await typeInto(companyInput, 'CÔNG TY TNHH KHÁCH MỚI');
  assert.equal(inputByLabel('Địa chỉ').value, COMPANY_FIXTURES[1].address, 'không được tự xoá dữ liệu khi gõ tay');

  /* --- Quay lại bước 1: sửa số lượng/đơn giá → tính lại ngay --- */
  await clickByText(container, '1. Hạng mục & đơn giá');
  const priceInputs = [...container.querySelectorAll('label')]
    .filter((l) => l.textContent.trim().startsWith('Đơn giá (₫)'))
    .map((l) => l.querySelector('input'));
  assert.equal(priceInputs.length, fda.items.length + 1, 'mỗi dòng hạng mục (kể cả tùy chọn) phải có ô đơn giá sửa được');

  const before = calcQuoteTotals(mainItems, 0, fda.vat_rate).total;
  assert.ok(container.textContent.includes(formatMoney(before)), 'tổng trước khi sửa chưa hiển thị');

  const qtyInputs = [...container.querySelectorAll('label')]
    .filter((l) => l.textContent.trim().startsWith('Số lượng'))
    .map((l) => l.querySelector('input'));
  await typeInto(qtyInputs[0], '3');
  await typeInto(priceInputs[0], '50000000');

  const edited = mainItems.map((item, index) => (index === 0 ? { ...item, qty: 3, unit_price: 50_000_000 } : item));
  const after2 = calcQuoteTotals(edited, 0, fda.vat_rate).total;
  assert.equal(formatMoney(150_000_000), formatMoney(3 * 50_000_000));
  assert.ok(container.textContent.includes(formatMoney(150_000_000)), 'thành tiền dòng chưa tính lại');
  assert.ok(container.textContent.includes(formatMoney(after2)), 'TỔNG CỘNG chưa tính lại theo số vừa sửa');
  assert.notEqual(before, after2, 'phép kiểm tra vô nghĩa nếu tổng không đổi');

  /* --- Chiết khấu + VAT cũng tính lại ngay --- */
  await clickByText(container, '2. Thông tin khách hàng');
  await typeInto(inputByLabel('Chiết khấu (%)'), '10');
  await typeInto(inputByLabel('VAT (%)'), '10');
  const discounted = calcQuoteTotals(edited, 10, 10).total;
  assert.ok(container.textContent.includes(formatMoney(discounted)), 'tổng chưa tính lại theo chiết khấu/VAT');

  /* --- Tạo báo giá: gửi đúng hạng mục đã sửa, không gửi tổng --- */
  await clickByText(container, 'Tạo báo giá & xem bản in');
  assert.ok(global.__created, 'chưa gọi API tạo báo giá');
  assert.equal(global.__created.company_name, 'CÔNG TY TNHH KHÁCH MỚI');
  assert.equal(global.__created.company_tax_code, COMPANY_FIXTURES[1].tax_code);
  assert.equal(global.__created.items.length, fda.items.length + 1, 'thiếu hạng mục tùy chọn đã tick');
  assert.equal(global.__created.items.at(-1).optional, true, 'hạng mục tùy chọn phải giữ cờ optional');
  assert.equal(global.__created.items[0].qty, 3);
  assert.equal(global.__created.items[0].unit_price, 50_000_000);
  assert.equal(global.__created.discount_percent, 10);
  assert.equal(global.__created.vat_rate, 10);
  assert.equal(global.__created.template_key, 'FDA');
  assert.ok(!('total' in global.__created) && !('subtotal' in global.__created), 'client không gửi tổng tiền');
  assert.equal(global.__pushedTo, '/dashboard/bao-gia/99');
});
