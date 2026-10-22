/**
 * Kiểm thử trang chủ công khai (dựng HTML thật bằng react-dom/server):
 * - Đúng đặc tả nội dung: H1, thứ tự H2/H3, bốn dịch vụ, bảy câu hỏi thường gặp.
 * - Thẻ SEO, hreflang, noindex cho /login.
 * - JSON-LD trùng khớp với phần hiển thị (câu hỏi, câu trả lời, dịch vụ).
 * - Nguyên tắc văn phong: câu ngắn, không biểu tượng cảm xúc, không hứa hẹn.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');

/* --------------------- Module con của Next (stub) ------------------------- */
const stubs = fs.mkdtempSync(path.join(os.tmpdir(), 'vexim-home-stubs-'));
fs.writeFileSync(
  path.join(stubs, 'navigation.js'),
  `exports.useRouter = () => ({ push() {}, replace() {}, refresh() {}, back() {}, prefetch() {} });
   exports.usePathname = () => "/";
   exports.useSearchParams = () => new URLSearchParams("");`,
);
fs.writeFileSync(
  path.join(stubs, 'link.js'),
  `const React = require(${JSON.stringify(require.resolve('react', { paths: [root] }))});
   const Link = ({ href, children, ...rest }) => React.createElement("a", { href, ...rest }, children);
   module.exports = Link;
   module.exports.default = Link;`,
);

const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  if (request === 'next/navigation') return path.join(stubs, 'navigation.js');
  if (request === 'next/link') return path.join(stubs, 'link.js');
  return resolveFilename.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, ...args);
};
require.extensions['.css'] = () => {};
for (const ext of ['.ts', '.tsx']) {
  require.extensions[ext] = (mod, filename) => {
    mod._compile(
      ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
        },
      }).outputText,
      filename,
    );
  };
}

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { siteCopy, siteJsonLd } = require('../lib/public-content.ts');

const render = (element) => renderToStaticMarkup(element);

const stripTags = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

/* --------------------------------- SEO ----------------------------------- */

test('thẻ SEO của trang chủ đúng đặc tả', () => {
  const viPage = require('../app/page.tsx');
  assert.equal(viPage.metadata.title, 'Tra cứu mã FDA, đăng ký mã GACC | Vexim Global');
  assert.equal(
    viPage.metadata.description,
    'Tra cứu mã FDA, mã GACC của doanh nghiệp bạn. Vexim Global hỗ trợ đăng ký FDA, đăng ký mã GACC, niêm yết miễn phí trên Vexim Trade và thiết kế website xuất khẩu.',
  );
  assert.deepEqual(viPage.metadata.alternates.languages, { vi: '/', en: '/en', 'x-default': '/' });
  assert.equal(viPage.metadata.alternates.canonical, '/');

  const enPage = require('../app/en/page.tsx');
  assert.equal(enPage.metadata.alternates.canonical, '/en');
  assert.equal(enPage.metadata.alternates.languages.en, '/en');
  assert.match(enPage.metadata.title, /Vexim Global/);

  const loginLayout = require('../app/login/layout.tsx');
  assert.equal(loginLayout.metadata.robots.index, false);
  assert.equal(loginLayout.metadata.robots.follow, false);
});

/* ------------------------------- Trang chủ -------------------------------- */

const viHtml = render(React.createElement(require('../app/page.tsx').default));
const viText = stripTags(viHtml);

test('cấu trúc tiêu đề theo đúng thứ tự đặc tả', () => {
  const h1 = [...viHtml.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => stripTags(m[1]));
  const h2 = [...viHtml.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => stripTags(m[1]));
  const h3 = [...viHtml.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => stripTags(m[1]));

  assert.deepEqual(h1, ['Tra cứu mã FDA, mã GACC']);
  /* H2 của thẻ tra cứu đứng trước, sau đó tới Dịch vụ và Câu hỏi thường gặp. */
  assert.deepEqual(h2, ['Tra cứu mã đăng ký', 'Dịch vụ', 'Câu hỏi thường gặp']);
  assert.deepEqual(h3, [
    'Đăng ký FDA',
    'Đăng ký mã GACC',
    'Niêm yết miễn phí trên Vexim Trade',
    'Thiết kế website xuất khẩu',
  ]);
});

test('đầu trang có câu mô tả, hai nút và ô tra cứu đầy đủ', () => {
  assert.match(viText, /Tra cứu ngay mã FDA, GACC của doanh nghiệp bạn\./);
  assert.match(viText, /Tra cứu mã /);
  assert.match(viText, /Liên hệ tư vấn/);

  assert.match(viHtml, /Mã FDA/);
  assert.match(viHtml, /Mã GACC/);
  assert.match(viHtml, /Số đăng ký hoặc tên doanh nghiệp/);
  assert.match(viHtml, /Quét mã QR/);
  assert.match(viText, /Kết quả áp dụng cho hồ sơ do Vexim Global quản lý\./);
});

test('bốn dịch vụ giữ nguyên nội dung và nút liên hệ', () => {
  const c = siteCopy('vi');
  for (const service of c.services_list) {
    assert.ok(viText.includes(service.title), `thiếu tiêu đề dịch vụ: ${service.title}`);
    assert.ok(viText.includes(service.desc), `thiếu mô tả dịch vụ: ${service.title}`);
    for (const bullet of service.bullets) {
      assert.ok(viText.includes(bullet), `thiếu dòng nội dung: ${bullet}`);
    }
    assert.ok(viText.includes(service.cta), `thiếu nút: ${service.cta}`);
  }
  assert.equal(c.services_list.length, 4);
});

test('bảy câu hỏi thường gặp hiển thị đúng nội dung', () => {
  const c = siteCopy('vi');
  assert.equal(c.faqs.length, 7);
  const items = [...viHtml.matchAll(/<details class="faq-item"[^>]*>[\s\S]*?<\/details>/g)];
  assert.equal(items.length, 7);
  c.faqs.forEach((faq, index) => {
    const text = stripTags(items[index][0]);
    assert.ok(text.includes(faq.q), `câu hỏi ${index + 1} sai`);
    assert.ok(text.includes(faq.a), `câu trả lời ${index + 1} sai`);
  });
});

test('chân trang đủ thông tin doanh nghiệp và liên kết nội bộ nofollow', () => {
  const c = siteCopy('vi');
  assert.ok(viText.includes('Công ty TNHH Vexim Global'));
  assert.ok(viText.includes('Số 25/6/51 Ngõa Long, Tây Tựu'));
  assert.ok(viText.includes('Bắc Từ Liêm, Hà Nội'));
  assert.ok(viText.includes('0373 685 634'));
  assert.ok(viText.includes('contact@veximglobal.com'));
  assert.ok(viText.includes('www.veximglobal.com'));
  assert.ok(viText.includes('© 2026 Công ty TNHH Vexim Global.'));
  for (const link of c.footer.links) {
    assert.ok(viText.includes(link.label), `thiếu liên kết chân trang: ${link.label}`);
  }
  assert.match(viHtml, /href="\/login" rel="nofollow"/, 'liên kết đăng nhập phải nofollow');
});

/* ------------------------------- JSON-LD --------------------------------- */

test('JSON-LD: doanh nghiệp, website, trang, bốn dịch vụ, bảy câu hỏi', () => {
  const data = siteJsonLd('vi');
  assert.equal(data['@context'], 'https://schema.org');
  const graph = data['@graph'];
  const types = graph.map((node) => (Array.isArray(node['@type']) ? node['@type'].join('+') : node['@type']));
  assert.deepEqual(types, [
    'Organization+ProfessionalService',
    'WebSite',
    'WebPage',
    'Service',
    'Service',
    'Service',
    'Service',
    'FAQPage',
  ]);

  const org = graph[0];
  assert.equal(org.name, 'Công ty TNHH Vexim Global');
  assert.equal(org.alternateName, 'VEXIM GLOBAL CO., LTD');
  assert.equal(org.telephone, '+84373685634');
  assert.equal(org.email, 'contact@veximglobal.com');
  assert.deepEqual(org.address, {
    '@type': 'PostalAddress',
    streetAddress: 'Số 25/6/51 Ngõa Long, Tây Tựu',
    addressLocality: 'Bắc Từ Liêm',
    addressRegion: 'Hà Nội',
    addressCountry: 'VN',
  });
  assert.deepEqual(org.knowsAbout, [
    'Đăng ký FDA',
    'Mã DUNS',
    'Mã FEI',
    'Đăng ký mã GACC',
    'Mã HS',
    'Mã CIQ',
    'Hệ thống CIFER',
  ]);

  assert.equal(graph[1].name, 'Tra cứu mã FDA, mã GACC | Vexim Global');
  assert.equal(graph[2].name, 'Tra cứu mã FDA, đăng ký mã GACC | Vexim Global');
  assert.equal(
    graph[2].description,
    'Tra cứu mã FDA, mã GACC của doanh nghiệp bạn. Vexim Global hỗ trợ đăng ký FDA, đăng ký mã GACC, niêm yết miễn phí trên Vexim Trade và thiết kế website xuất khẩu.',
  );

  const trade = graph[5];
  assert.equal(trade.name, 'Niêm yết miễn phí trên Vexim Trade');
  assert.deepEqual(trade.offers, { '@type': 'Offer', price: '0', priceCurrency: 'VND' });

  const faq = graph[7];
  assert.equal(faq.mainEntity.length, 7);
});

test('FAQ trong JSON-LD trùng khớp với câu hỏi hiển thị trên trang', () => {
  const faq = siteJsonLd('vi')['@graph'].find((node) => node['@type'] === 'FAQPage');
  const details = [...viHtml.matchAll(/<details class="faq-item"[^>]*>([\s\S]*?)<\/details>/g)];
  assert.equal(faq.mainEntity.length, details.length);

  faq.mainEntity.forEach((entry, index) => {
    const visible = stripTags(details[index][1]);
    assert.ok(visible.includes(entry.name), `câu hỏi schema ${index + 1} lệch khỏi trang`);
    assert.ok(visible.includes(entry.acceptedAnswer.text), `câu trả lời schema ${index + 1} lệch khỏi trang`);
  });
});

test('máy tìm kiếm đọc được JSON-LD trong HTML và cả hai ngôn ngữ dùng chung logic', () => {
  assert.match(viHtml, /<script type="application\/ld\+json">/);
  assert.ok(viHtml.includes('"@type":"FAQPage"'));
  const en = siteJsonLd('en');
  assert.equal(en['@graph'].find((node) => node['@type'] === 'FAQPage').mainEntity.length, 7);
  assert.equal(en['@graph'][2].inLanguage, 'en');
});

/* ------------------------------ Văn phong -------------------------------- */

test('văn phong: không biểu tượng, không hứa hẹn, không từ cấm', () => {
  for (const lang of ['vi', 'en']) {
    const c = siteCopy(lang);
    const visible = render(
      React.createElement(require(lang === 'vi' ? '../app/page.tsx' : '../app/en/page.tsx').default),
    )
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/&[a-z]+;/g, ' ');
    const text = stripTags(visible);
    assert.ok(!text.includes('!'), `${lang}: không dùng dấu chấm than`);
    assert.ok(!text.includes('—'), `${lang}: không dùng gạch dài`);
    assert.ok(!/→|⇒|✔|★|🚀/.test(text), `${lang}: không dùng biểu tượng mũi tên`);
    const banned = [
      'giải pháp toàn diện',
      'hành trình',
      'bứt phá',
      'nâng tầm',
      'đảm bảo 100%',
      'chứng nhận FDA',
      'giấy phép FDA',
    ];
    for (const phrase of banned) {
      assert.ok(!text.toLowerCase().includes(phrase), `${lang}: không dùng cụm "${phrase}"`);
    }
    for (const faq of c.faqs) {
      assert.ok(!faq.a.includes('!'));
    }
  }
});

test('gọi đúng tên dịch vụ và người đọc theo đặc tả', () => {
  const c = siteCopy('vi');
  assert.ok(viText.includes('Đăng ký FDA'));
  assert.ok(viText.includes('mã đăng ký FDA'), 'có dùng cụm "mã đăng ký FDA"');
  assert.match(viText, /Quý doanh nghiệp/, 'phần thông tin gọi "Quý doanh nghiệp"');
  assert.match(viText, /của doanh nghiệp bạn/, 'câu kêu gọi dùng "bạn"');
});

/* -------------------------------- Tiếng Anh ------------------------------- */

test('bản tiếng Anh ở /en cùng bố cục, cùng số mục', () => {
  const enHtml = render(React.createElement(require('../app/en/page.tsx').default));
  const enText = stripTags(enHtml);
  assert.match(enText, /FDA and GACC code lookup/);
  assert.equal([...enHtml.matchAll(/<h3[^>]*>/g)].length, 4);
  assert.equal([...enHtml.matchAll(/<details class="faq-item"/g)].length, 7);
  assert.match(enHtml, /hrefLang="vi"/);
  assert.match(enHtml, /hrefLang="en"/);
  assert.match(enHtml, /lang="en"/);
});
