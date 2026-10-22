// node --test tests/public-site.test.cjs
// Kiểm thử website công khai theo đặc tả nội dung ngày 22/10/2026:
// - Thẻ SEO, một thẻ H1, thứ tự khối, đường dẫn con.
// - Tra cứu công khai: chỉ trả dữ liệu được phép công bố, số đăng ký được ẩn phần giữa.
// - Câu trả lời FAQ trên trang trùng khớp từng chữ với FAQPage trong schema.
// - Quy tắc biên tập: không biểu tượng cảm xúc, không mũi tên, không dấu gạch dài, không từ sáo rỗng.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const originalCwd = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vexim-public-site-'));
process.chdir(temp);
delete process.env.NEXT_PUBLIC_SUPABASE_URL;

const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  return resolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, ...args);
};
for (const ext of ['.ts', '.tsx']) {
  require.extensions[ext] = (mod, filename) =>
    mod._compile(
      ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
        },
      }).outputText,
      filename
    );
}

const db = require('../lib/db-sqlite.ts');
const { FAQ_VI, FAQ_EN } = require('../lib/site/faq.ts');
const { HOME_VI, HOME_EN, SERVICES_VI } = require('../lib/site/content.ts');
const { buildPageSchema } = require('../lib/site/schema.ts');
const {
  maskRegistrationCode,
  lookupStatus,
  formatDdMmYyyy,
  renewalSeasonYear,
  MIN_QUERY_LENGTH,
} = require('../lib/site/lookup.ts');
const { LOOKUP_PAGES, SERVICE_DETAILS } = require('../lib/site/pages.ts');
const lookupApi = require('../app/api/public/lookup/route.ts');

after(() => {
  process.chdir(originalCwd);
  fs.rmSync(temp, { recursive: true, force: true });
});

const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

/* --------------------------------- SEO ---------------------------------- */

test('thẻ title, description, og và hreflang đúng đặc tả', () => {
  assert.equal(
    HOME_VI.meta.title,
    'Tra cứu mã FDA, đăng ký GACC xuất khẩu thực phẩm | Vexim Global'
  );
  assert.ok(HOME_VI.meta.title.length <= 65, 'title không vượt quá 65 ký tự');
  assert.ok(
    HOME_VI.meta.description.length >= 150 && HOME_VI.meta.description.length <= 160,
    `meta description phải từ 150 đến 160 ký tự, hiện ${HOME_VI.meta.description.length}`
  );
  assert.match(HOME_VI.meta.description, /Tra cứu mã FDA/);
  assert.match(HOME_VI.meta.description, /đăng ký GACC/);
  assert.equal(HOME_VI.meta.ogTitle, 'Tra cứu mã FDA, đăng ký GACC | Vexim Global');

  const homePage = read('app/page.tsx');
  assert.match(homePage, /canonical: "\/"/);
  assert.match(homePage, /vi: "\/", en: "\/en", "x-default": "\/"/);
  assert.match(homePage, /images: \[\s*\{\s*url: "\/og-image\.png",\s*width: 1200,\s*height: 630/);
  assert.ok(fs.existsSync(path.join(root, 'public/og-image.png')), 'phải có ảnh og:image 1200x630');
});

test('trang chủ có đúng một thẻ H1 và thứ tự khối theo đặc tả', () => {
  const homePage = read('app/page.tsx');
  const hero = read('components/site/home/Hero.tsx');

  const h1InPage = (homePage.match(/<h1/g) || []).length;
  const h1InComponents = [
    'components/site/home/Hero.tsx',
    'components/site/home/ServicesSection.tsx',
    'components/site/home/SystemSection.tsx',
    'components/site/home/FaqSection.tsx',
    'components/site/ContactBanner.tsx',
    'components/site/PageShell.tsx',
    'components/site/SiteHeader.tsx',
    'components/site/SiteFooter.tsx',
    'components/site/LookupPanel.tsx',
    'components/site/FaqAccordion.tsx',
    'components/site/SectionHeading.tsx',
  ].reduce((total, file) => total + (read(file).match(/<h1/g) || []).length, 0);

  assert.equal(h1InPage + h1InComponents, 1, 'trang chủ chỉ được có một thẻ H1');
  assert.match(hero, /<h1/);
  assert.match(hero, /\{copy\.hero\.title\}/);
  assert.equal(
    HOME_VI.hero.title,
    'Tra cứu mã FDA, mã GACC và dịch vụ đăng ký xuất khẩu thực phẩm'
  );

  const order = ['<Hero', '<ServicesSection', '<SystemSection', '<FaqSection', '<ContactBanner', '<PageShell'];
  const positions = ['<Hero', '<ServicesSection', '<SystemSection', '<FaqSection', '<ContactBanner'].map((tag) =>
    homePage.indexOf(tag)
  );
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, 'thứ tự khối phải là tra cứu, dịch vụ, hệ thống, FAQ');
  assert.ok(order.length > 0);

  // Ô tra cứu nằm trong khối đầu trang nên thấy được ngay khi tải trang.
  assert.match(hero, /<LookupPanel/);
  assert.match(hero, /id="tra-cuu"/);
});

test('đường dẫn con trong đặc tả đều tồn tại', () => {
  const routes = [
    'app/page.tsx',
    'app/en/page.tsx',
    'app/tra-cuu/page.tsx',
    'app/tra-cuu-ma-fda/page.tsx',
    'app/tra-cuu-ma-gacc/page.tsx',
    'app/dich-vu/[slug]/page.tsx',
    'app/cau-hoi-thuong-gap/page.tsx',
    'app/lien-he/page.tsx',
    'app/chinh-sach-bao-mat/page.tsx',
    'app/dieu-khoan-su-dung/page.tsx',
    'app/login/page.tsx',
    'app/api/public/lookup/route.ts',
  ];
  for (const route of routes) {
    assert.ok(fs.existsSync(path.join(root, route)), `thiếu trang ${route}`);
  }
  assert.deepEqual(
    SERVICE_DETAILS.map((service) => `/dich-vu/${service.slug}`),
    ['/dich-vu/dang-ky-gacc', '/dich-vu/dang-ky-fda', '/dich-vu/niem-yet-vexim-trade', '/dich-vu/thiet-ke-website']
  );
  assert.deepEqual(Object.keys(LOOKUP_PAGES), ['tra-cuu-ma-fda', 'tra-cuu-ma-gacc']);
});

test('lối đăng nhập nội bộ có rel="nofollow" và trang /login bị noindex', () => {
  const header = read('components/site/SiteHeader.tsx');
  assert.match(header, /href="\/login"[\s\S]{0,80}rel="nofollow"/, 'liên kết đăng nhập phải có rel="nofollow"');
  assert.match(header, /copy\.login/);

  const loginLayout = read('app/login/layout.tsx');
  assert.match(loginLayout, /index: false/);
  assert.match(loginLayout, /follow: false/);
});

/* ------------------------------ Tra cứu --------------------------------- */

test('số đăng ký hiển thị một phần, ẩn các chữ số ở giữa', () => {
  assert.equal(maskRegistrationCode('12345678901'), '12••••••901');
  assert.equal(maskRegistrationCode('12345678'), '12•••678');
  assert.equal(maskRegistrationCode('1234'), '1•34');
  assert.ok(!maskRegistrationCode('18472910553').includes('47291'), 'không lộ dãy số ở giữa');
  assert.equal(maskRegistrationCode('AB-123'), 'AB-123', 'chuỗi quá ngắn thì giữ nguyên');
  assert.equal(maskRegistrationCode(''), '');
});

test('tình trạng tra cứu chia ba mức: còn hiệu lực, sắp hết hạn, hết hiệu lực', () => {
  assert.equal(lookupStatus('2027-06-30', '2026-10-22'), 'valid');
  assert.equal(lookupStatus('2026-12-31', '2026-10-22'), 'expiring');
  assert.equal(lookupStatus('2026-10-01', '2026-10-22'), 'expired');
  assert.equal(formatDdMmYyyy('2026-12-31'), '31/12/2026');
  assert.equal(formatDdMmYyyy(''), '');
});

test('thông báo theo mùa chỉ hiện từ 01/10 đến 31/12 của năm chẵn', () => {
  assert.equal(renewalSeasonYear(new Date(2026, 9, 1)), 2026);
  assert.equal(renewalSeasonYear(new Date(2026, 11, 31)), 2026);
  assert.equal(renewalSeasonYear(new Date(2026, 8, 30)), null);
  assert.equal(renewalSeasonYear(new Date(2025, 10, 1)), null);
  assert.match(HOME_VI.seasonalNotice(2030), /31\/12\/2030/);
});

test('API tra cứu chỉ trả về dữ liệu được phép công bố', async () => {
  const publishedId = db.createCertificate({
    standard: 'FDA',
    registration_code: '18472910553',
    duns_code: '123456789',
    us_agent: 'US Agent LLC',
    service_price: 15000000,
    company_name: 'Cong ty TNHH Thuy San Minh Phat',
    company_email: 'ketoan@minhphat.example',
    company_address: 'Kho lanh, Hai Phong',
    portal_user: 'minhphat',
    portal_pass: 'MatKhau@123',
    scope: 'Thuy san dong lanh',
    registered_at: '2026-01-01',
    validity_years: 2,
    created_by: 1,
  });
  db.publishCertificate(publishedId);

  const draftId = db.createCertificate({
    standard: 'GACC',
    registration_code: 'CIFER-DRAFT-999',
    service_price: 20000000,
    company_name: 'Cong ty TNHH Thuy San Minh Phat',
    scope: 'Draft',
    registered_at: '2026-02-01',
    created_by: 1,
  });

  const response = await lookupApi.GET(
    new Request('http://test/api/public/lookup?q=18472910553&type=FDA')
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control') || '', /no-store/);

  const payload = await response.json();
  assert.equal(payload.items.length, 1);
  const item = payload.items[0];

  assert.equal(item.companyName, 'Cong ty TNHH Thuy San Minh Phat');
  assert.equal(item.standard, 'FDA');
  assert.equal(item.registrationNumber, '18••••••553', 'số đăng ký phải được ẩn phần giữa');
  assert.equal(item.status, 'valid');
  assert.match(item.expiresAt, /^\d{2}\/\d{2}\/\d{4}$/);
  assert.match(item.updatedAt, /^\d{2}\/\d{2}\/\d{4}$/);

  const serialized = JSON.stringify(payload);
  for (const forbidden of [
    'service_price',
    'portal_pass',
    'MatKhau@123',
    'US Agent LLC',
    '123456789',
    'ketoan@minhphat.example',
    'Kho lanh',
  ]) {
    assert.ok(!serialized.includes(forbidden), `kết quả tra cứu không được chứa ${forbidden}`);
  }

  // Hồ sơ nháp không được xuất hiện trong kết quả công khai.
  const draftLookup = await lookupApi.GET(
    new Request('http://test/api/public/lookup?q=CIFER-DRAFT-999&type=GACC')
  );
  assert.equal((await draftLookup.json()).items.length, 0);
  assert.ok(draftId > 0);
});

test('API tra cứu nhận diện mã qua tên doanh nghiệp và từ chối từ khóa quá ngắn', async () => {
  db.createCertificate({
    standard: 'GACC',
    registration_code: 'CIFER2026001',
    service_price: 0,
    company_name: 'Hop tac xa Nong san Dak Lak',
    scope: 'Ca phe',
    registered_at: '2026-03-01',
    validity_years: 5,
    created_by: 1,
  });
  const gaccId = db.listCertificates().find((cert) => cert.registration_code === 'CIFER2026001').id;
  db.publishCertificate(gaccId);

  const byName = await lookupApi.GET(
    new Request('http://test/api/public/lookup?q=dak%20lak&type=GACC')
  );
  const byNamePayload = await byName.json();
  assert.equal(byNamePayload.items.length, 1);
  assert.equal(byNamePayload.items[0].standard, 'GACC');
  assert.equal(byNamePayload.items[0].registrationNumber, 'CIFER2••••01');

  const tooShort = await lookupApi.GET(new Request('http://test/api/public/lookup?q=ab'));
  assert.equal(tooShort.status, 400);
  assert.equal((await tooShort.json()).error, 'QUERY_TOO_SHORT');
  assert.ok(MIN_QUERY_LENGTH >= 3);
});

/* -------------------------------- FAQ ---------------------------------- */

test('câu trả lời FAQ trên trang trùng khớp từng chữ với FAQPage trong schema', () => {
  const schema = buildPageSchema({
    lang: 'vi',
    path: '/',
    title: HOME_VI.meta.title,
    description: HOME_VI.meta.description,
    crumbs: [{ name: 'Vexim Global', url: 'https://www.veximglobal.com/' }],
    faqIds: FAQ_VI.map((item) => item.id),
    includeServices: true,
  });

  const faqNode = schema['@graph'].find((node) => node['@type'] === 'FAQPage');
  assert.ok(faqNode, 'schema phải có khối FAQPage');
  assert.equal(faqNode.mainEntity.length, 12, 'FAQPage phải có 12 câu hỏi');

  FAQ_VI.forEach((item, index) => {
    assert.equal(faqNode.mainEntity[index].name, item.question);
    assert.equal(faqNode.mainEntity[index].acceptedAnswer.text, item.answer);
  });

  // Trang hiển thị dùng cùng nguồn dữ liệu với schema.
  const accordion = read('components/site/FaqAccordion.tsx');
  assert.match(accordion, /faqFor\(lang\)/);
  assert.match(accordion, /item\.question/);
  assert.match(accordion, /item\.answer/);

  const faqPage = read('app/cau-hoi-thuong-gap/page.tsx');
  assert.match(faqPage, /faqIds: FAQ_VI\.map/);
});

test('schema @graph có Organization, WebSite, WebPage, BreadcrumbList, 4 Service và FAQPage', () => {
  const schema = buildPageSchema({
    lang: 'vi',
    path: '/',
    title: HOME_VI.meta.title,
    description: HOME_VI.meta.description,
    crumbs: [
      { name: 'Vexim Global', url: 'https://www.veximglobal.com/' },
      { name: 'Tra cứu mã FDA, GACC', url: 'https://vanhanh.veximglobal.com/' },
    ],
    faqIds: FAQ_VI.map((item) => item.id),
    includeServices: true,
  });

  const types = schema['@graph'].map((node) => node['@type']);
  assert.ok(types.some((type) => Array.isArray(type) && type.includes('Organization')));
  assert.ok(types.some((type) => Array.isArray(type) && type.includes('ProfessionalService')));
  assert.ok(types.includes('WebSite'));
  assert.ok(types.includes('WebPage'));
  assert.ok(types.includes('BreadcrumbList'));
  assert.ok(types.includes('FAQPage'));
  assert.equal(types.filter((type) => type === 'Service').length, 4);

  const organization = schema['@graph'][0];
  assert.equal(organization.name, 'Công ty TNHH Vexim Global');
  assert.equal(organization.alternateName, 'VEXIM GLOBAL CO., LTD');
  assert.equal(organization.telephone, '+84373685634');
  assert.equal(organization.email, 'contact@veximglobal.com');
  assert.equal(organization.address.streetAddress, 'Số 25/6/51 Ngõa Long, Tây Tựu');
  assert.equal(organization.address.addressLocality, 'Bắc Từ Liêm');
  assert.equal(organization.address.addressRegion, 'Hà Nội');
  assert.equal(organization.address.addressCountry, 'VN');

  const website = schema['@graph'].find((node) => node['@type'] === 'WebSite');
  assert.equal(
    website.potentialAction.target.urlTemplate,
    'https://vanhanh.veximglobal.com/tra-cuu?q={search_term_string}'
  );

  const schemaSource = read('lib/site/schema.ts');
  assert.match(schemaSource, /@context/);
  const jsonLd = read('components/site/JsonLd.tsx');
  assert.match(jsonLd, /type="application\/ld\+json"/);
  assert.match(read('app/page.tsx'), /<JsonLd data={schema}/);
});

test('bản tiếng Anh có schema riêng với inLanguage "en"', () => {
  const schema = buildPageSchema({
    lang: 'en',
    path: '/en',
    title: HOME_EN.meta.title,
    description: HOME_EN.meta.description,
    crumbs: [{ name: 'Vexim Global', url: 'https://www.veximglobal.com/' }],
    faqIds: FAQ_EN.map((item) => item.id),
    includeServices: true,
  });
  const webpage = schema['@graph'].find((node) => node['@type'] === 'WebPage');
  const faq = schema['@graph'].find((node) => node['@type'] === 'FAQPage');
  assert.equal(webpage.inLanguage, 'en');
  assert.equal(faq.inLanguage, 'en');
  assert.equal(faq.mainEntity.length, 12);
  assert.equal(faq.mainEntity[0].name, FAQ_EN[0].question);
});

/* ------------------------- Quy tắc biên tập ---------------------------- */

test('không dùng biểu tượng cảm xúc, mũi tên, dấu gạch dài hay từ sáo rỗng', () => {
  const files = [
    'lib/site/content.ts',
    'lib/site/faq.ts',
    'lib/site/pages.ts',
    'lib/site/company.ts',
    'components/site/SiteHeader.tsx',
    'components/site/SiteFooter.tsx',
    'components/site/home/Hero.tsx',
    'components/site/home/ServicesSection.tsx',
    'components/site/home/SystemSection.tsx',
    'components/site/home/FaqSection.tsx',
    'components/site/LookupPanel.tsx',
    'components/site/ContactBanner.tsx',
  ];

  const banned = [
    /[\u2190-\u21ff\u27f0-\u27ff\u2b00-\u2bff]/u, // mũi tên
    /[\u2013\u2014]/u, // gạch ngang, gạch dài
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, // biểu tượng cảm xúc
    /!!/,
  ];
  const fluffy = [
    'hành trình',
    'khám phá',
    'kiến tạo',
    'bứt phá',
    'vượt trội',
    'đột phá',
    'toàn diện',
    'tối ưu hóa',
    'nâng tầm',
    'chìa khóa',
    'trong thời đại số',
  ];
  const commitments = ['đảm bảo 100%', 'chắc chắn được duyệt', 'nhanh nhất'];
  const wrongTerms = ['chứng nhận FDA', 'giấy phép FDA', 'FDA phê duyệt'];

  for (const file of files) {
    const source = read(file);
    for (const pattern of banned) {
      assert.ok(!pattern.test(source), `${file} chứa ký tự bị cấm: ${pattern}`);
    }
    for (const word of [...fluffy, ...commitments, ...wrongTerms]) {
      assert.ok(!source.toLowerCase().includes(word.toLowerCase()), `${file} dùng từ bị cấm: ${word}`);
    }
  }

  // Cách gọi đúng tên thủ tục được dùng trong nội dung.
  assert.match(HOME_VI.services.items[1].title, /Đăng ký cơ sở thực phẩm với FDA/);
  assert.match(HOME_VI.fixedNote, /FDA không công bố công khai/);
  assert.match(HOME_VI.fixedNote, /không đồng nghĩa với việc FDA chứng nhận hay phê duyệt sản phẩm/);
});

test('bốn dịch vụ đúng thứ tự GACC, FDA, niêm yết, website và có đủ bốn dòng nội dung', () => {
  assert.equal(SERVICES_VI.length, 4);
  assert.deepEqual(
    SERVICES_VI.map((service) => service.no),
    ['01', '02', '03', '04']
  );
  assert.match(SERVICES_VI[0].title, /GACC/);
  assert.match(SERVICES_VI[1].title, /FDA/);
  assert.match(SERVICES_VI[2].title, /Vexim Trade/);
  assert.match(SERVICES_VI[3].title, /website/i);
  for (const service of SERVICES_VI) {
    assert.equal(service.points.length, 4, `${service.slug} phải có bốn dòng nội dung`);
    assert.ok(service.cta.length > 0);
  }
  assert.equal(HOME_VI.system.features.length, 6, 'khối hệ thống phải có sáu tính năng');
});

test('chân trang nêu đủ tên pháp nhân, địa chỉ, liên hệ và hai cột liên kết', () => {
  const footer = read('components/site/SiteFooter.tsx');
  assert.match(footer, /COMPANY\.name/);
  assert.match(footer, /COMPANY\.legalName/);
  assert.match(footer, /COMPANY\.address/);
  assert.match(footer, /COMPANY\.phoneHref/);
  assert.match(footer, /COMPANY\.email/);
  assert.match(footer, /copy\.footer\.serviceColumn\.links/);
  assert.match(footer, /copy\.footer\.infoColumn\.links/);
  assert.match(footer, /copy\.footer\.copyright/);
  assert.match(footer, /copy\.footer\.disclaimer/);
  assert.equal(HOME_VI.footer.serviceColumn.links.length, 6);
  assert.equal(HOME_VI.footer.infoColumn.links.length, 4);
});
