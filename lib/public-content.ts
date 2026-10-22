/**
 * Nội dung website công khai (trang chủ tra cứu mã FDA, mã GACC).
 *
 * Một nguồn duy nhất cho cả tiếng Việt (đường dẫn gốc) và tiếng Anh (/en),
 * để phần FAQ trên trang và FAQ trong schema JSON-LD luôn trùng khớp nhau.
 */

export type SiteLang = "vi" | "en";

export type SiteService = {
  id: "fda" | "gacc" | "trade" | "website";
  no: string;
  tag: string;
  title: string;
  desc: string;
  /** Câu mô tả dùng riêng trong schema JSON-LD (giữ đúng đặc tả). */
  schemaDescription: string;
  bullets: string[];
  cta: string;
};

export type SiteFaq = { q: string; a: string };

export type CopySegment = { text: string; href?: string };

export type SiteCopy = {
  htmlLang: string;
  a11y: { skip: string };
  meta: {
    title: string;
    description: string;
    /** Tên website dùng trong schema WebSite và thẻ og:site_name. */
    siteName: string;
  };
  org: {
    legal: string;
    legalEn: string;
    addressLines: string[];
    address: {
      streetAddress: string;
      addressLocality: string;
      addressRegion: string;
      addressCountry: string;
    };
    phone: string;
    phoneHref: string;
    email: string;
    website: string;
    websiteLabel: string;
    description: string;
    knowsAbout: string[];
  };
  nav: {
    aria: string;
    links: { label: string; href: string }[];
    login: string;
    menu: string;
    close: string;
    language: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    lead: string;
    primary: string;
    secondary: string;
    factsLabel: string;
    facts: string[];
  };
  lookup: {
    index: string;
    kicker: string;
    title: string;
    typeLabel: string;
    fda: string;
    gacc: string;
    inputLabel: string;
    placeholder: string;
    submit: string;
    submitting: string;
    scan: string;
    note: string;
    resultsLabel: string;
    resultCompany: string;
    resultType: string;
    resultStatus: string;
    resultDeadline: string;
    statusValid: string;
    statusExpiring: string;
    statusExpired: string;
    notFound: { before: string; phone: string; after: string };
    countOne: string;
    countMany: string;
    openVerify: string;
    tooShort: string;
    failed: string;
    startOver: string;
    scanTitle: string;
    scanHint: string;
    scanUnsupported: string;
    scanError: string;
    scanStarting: string;
    close: string;
  };
  services: {
    index: string;
    title: string;
    lead: string;
    contact: CopySegment[];
  };
  faq: {
    index: string;
    title: string;
    lead: string;
    contact: string;
  };
  footer: {
    brandline: string;
    companyTitle: string;
    contactTitle: string;
    linkTitle: string;
    hotlineLabel: string;
    emailLabel: string;
    websiteLabel: string;
    links: { label: string; href: string; nofollow?: boolean }[];
    copyright: string;
  };
  services_list: SiteService[];
  faqs: SiteFaq[];
};

const PHONE = "0373 685 634";
const PHONE_HREF = "tel:+84373685634";
const EMAIL = "contact@veximglobal.com";
const WEBSITE = "https://www.veximglobal.com";
const WEBSITE_LABEL = "www.veximglobal.com";

const vi: SiteCopy = {
  htmlLang: "vi",
  a11y: { skip: "Bỏ qua điều hướng" },
  meta: {
    title: "Tra cứu mã FDA, đăng ký mã GACC | Vexim Global",
    description:
      "Tra cứu mã FDA, mã GACC của doanh nghiệp bạn. Vexim Global hỗ trợ đăng ký FDA, đăng ký mã GACC, niêm yết miễn phí trên Vexim Trade và thiết kế website xuất khẩu.",
    siteName: "Tra cứu mã FDA, mã GACC | Vexim Global",
  },
  org: {
    legal: "Công ty TNHH Vexim Global",
    legalEn: "VEXIM GLOBAL CO., LTD",
    addressLines: ["Số 25/6/51 Ngõa Long, Tây Tựu", "Bắc Từ Liêm, Hà Nội"],
    address: {
      streetAddress: "Số 25/6/51 Ngõa Long, Tây Tựu",
      addressLocality: "Bắc Từ Liêm",
      addressRegion: "Hà Nội",
      addressCountry: "VN",
    },
    phone: PHONE,
    phoneHref: PHONE_HREF,
    email: EMAIL,
    website: WEBSITE,
    websiteLabel: WEBSITE_LABEL,
    description:
      "Hỗ trợ doanh nghiệp đăng ký, lưu trữ và theo dõi mã FDA, mã GACC.",
    knowsAbout: [
      "Đăng ký FDA",
      "Mã DUNS",
      "Mã FEI",
      "Đăng ký mã GACC",
      "Mã HS",
      "Mã CIQ",
      "Hệ thống CIFER",
    ],
  },
  nav: {
    aria: "Điều hướng chính",
    links: [
      { label: "Tra cứu mã", href: "#tra-cuu" },
      { label: "Dịch vụ", href: "#dich-vu" },
      { label: "Câu hỏi thường gặp", href: "#faq" },
    ],
    login: "Đăng nhập nội bộ",
    menu: "Mở menu",
    close: "Đóng menu",
    language: "Ngôn ngữ",
  },
  hero: {
    eyebrow: "Tra cứu công khai",
    title: "Tra cứu mã FDA, mã GACC",
    lead: "Tra cứu ngay mã FDA, GACC của doanh nghiệp bạn.",
    primary: "Tra cứu mã",
    secondary: "Liên hệ tư vấn",
    factsLabel: "Mã và hệ thống liên quan",
    facts: ["FDA", "DUNS", "FEI", "GACC", "CIFER"],
  },
  lookup: {
    index: "01",
    kicker: "Hồ sơ Vexim Global quản lý",
    title: "Tra cứu mã đăng ký",
    typeLabel: "Chọn loại mã",
    fda: "Mã FDA",
    gacc: "Mã GACC",
    inputLabel: "Số đăng ký hoặc tên doanh nghiệp",
    placeholder: "Ví dụ: 12345678901 hoặc Công ty TNHH ABC",
    submit: "Tra cứu",
    submitting: "Đang tra cứu",
    scan: "Quét mã QR",
    note: "Kết quả áp dụng cho hồ sơ do Vexim Global quản lý.",
    resultsLabel: "Kết quả tra cứu",
    resultCompany: "Doanh nghiệp",
    resultType: "Loại mã",
    resultStatus: "Tình trạng",
    resultDeadline: "Hạn tiếp theo",
    statusValid: "Còn hiệu lực",
    statusExpiring: "Sắp hết hạn",
    statusExpired: "Hết hiệu lực",
    notFound: {
      before: "Chưa có hồ sơ trong hệ thống của Vexim Global. Vui lòng liên hệ ",
      phone: PHONE,
      after: " để được hỗ trợ.",
    },
    countOne: "1 hồ sơ phù hợp",
    countMany: "{count} hồ sơ phù hợp",
    openVerify: "Mở trang xác minh",
    tooShort: "Vui lòng nhập ít nhất 2 ký tự.",
    failed: "Chưa tra cứu được. Vui lòng thử lại hoặc gọi 0373 685 634.",
    startOver: "Tra cứu lại",
    scanTitle: "Quét mã QR trên hồ sơ",
    scanHint: "Đưa mã QR vào giữa khung hình.",
    scanUnsupported:
      "Trình duyệt chưa hỗ trợ quét trực tiếp. Mở camera điện thoại và quét mã QR trên hồ sơ, trang xác minh sẽ tự mở.",
    scanError: "Không mở được camera. Vui lòng nhập số đăng ký hoặc tên doanh nghiệp.",
    scanStarting: "Đang mở camera",
    close: "Đóng",
  },
  services: {
    index: "02",
    title: "Dịch vụ",
    lead: "Vexim Global hỗ trợ Quý doanh nghiệp đăng ký, lưu trữ và theo dõi mã đăng ký FDA, mã GACC.",
    contact: [
      { text: "Gọi " },
      { text: PHONE, href: PHONE_HREF },
      { text: " hoặc gửi email tới " },
      { text: EMAIL, href: `mailto:${EMAIL}` },
      { text: " để được tư vấn." },
    ],
  },
  faq: {
    index: "03",
    title: "Câu hỏi thường gặp",
    lead: "Thông tin về tra cứu, đăng ký và gia hạn mã FDA, mã GACC.",
    contact: "Chưa có câu trả lời bạn cần?",
  },
  footer: {
    brandline: "Hỗ trợ doanh nghiệp đăng ký, lưu trữ và theo dõi mã FDA, mã GACC.",
    companyTitle: "Doanh nghiệp",
    contactTitle: "Liên hệ",
    linkTitle: "Liên kết",
    hotlineLabel: "Đường dây nóng",
    emailLabel: "Email",
    websiteLabel: "Website",
    links: [
      { label: "Tra cứu mã", href: "#tra-cuu" },
      { label: "Đăng ký FDA", href: "#dich-vu" },
      { label: "Đăng ký GACC", href: "#dich-vu" },
      { label: "Câu hỏi thường gặp", href: "#faq" },
      { label: "Đăng nhập nội bộ", href: "/login", nofollow: true },
    ],
    copyright: "© 2026 Công ty TNHH Vexim Global.",
  },
  services_list: [
    {
      id: "fda",
      no: "01",
      tag: "FDA",
      title: "Đăng ký FDA",
      desc: "Đăng ký và quản lý mã FDA cho doanh nghiệp xuất khẩu thực phẩm sang Hoa Kỳ.",
      schemaDescription:
        "Đăng ký cơ sở với FDA, cập nhật mã DUNS, mã FEI, lưu hồ sơ điện tử, nhắc lịch gia hạn và gửi cảnh báo trước hạn.",
      bullets: [
        "Đăng ký cơ sở với FDA.",
        "Cập nhật mã DUNS, mã FEI.",
        "Lưu hồ sơ điện tử, tra cứu khi cần.",
        "Nhắc lịch gia hạn và các mốc thời gian quan trọng.",
        "Gửi cảnh báo để doanh nghiệp chủ động chuẩn bị.",
        "Mã FDA được xác minh công khai, tăng uy tín với đối tác.",
      ],
      cta: "Đăng ký FDA",
    },
    {
      id: "gacc",
      no: "02",
      tag: "GACC",
      title: "Đăng ký mã GACC",
      desc: "Hỗ trợ doanh nghiệp đăng ký mã GACC để xuất khẩu thực phẩm sang Trung Quốc.",
      schemaDescription:
        "Tư vấn, tra cứu mã HS, mã CIQ để đăng ký đúng mã GACC, rà soát hồ sơ, nộp lên hệ thống CIFER, duy trì mã số và cập nhật địa chỉ miễn phí.",
      bullets: [
        "Tư vấn, tra cứu mã HS, mã CIQ để đăng ký đúng mã GACC.",
        "Rà soát hồ sơ và nộp lên hệ thống CIFER.",
        "Duy trì mã số, cập nhật địa chỉ miễn phí.",
      ],
      cta: "Đăng ký GACC",
    },
    {
      id: "trade",
      no: "03",
      tag: "Vexim Trade",
      title: "Niêm yết miễn phí trên Vexim Trade",
      desc: "Đưa doanh nghiệp và sản phẩm lên sàn Vexim Trade, không mất phí.",
      schemaDescription:
        "Tạo hồ sơ doanh nghiệp, đăng sản phẩm và nhận yêu cầu báo giá từ người mua.",
      bullets: [
        "Tạo hồ sơ doanh nghiệp.",
        "Đăng sản phẩm, quy cách, giá tham khảo.",
        "Nhận yêu cầu báo giá từ người mua.",
      ],
      cta: "Đăng ký niêm yết",
    },
    {
      id: "website",
      no: "04",
      tag: "Website",
      title: "Thiết kế website xuất khẩu",
      desc: "Website giới thiệu doanh nghiệp và sản phẩm bằng nhiều ngôn ngữ.",
      schemaDescription:
        "Website giới thiệu doanh nghiệp và sản phẩm bằng nhiều ngôn ngữ, có biểu mẫu nhận yêu cầu báo giá.",
      bullets: [
        "Trình bày sản phẩm, quy cách đóng gói.",
        "Có biểu mẫu nhận yêu cầu báo giá.",
        "Hiển thị tốt trên máy tính và điện thoại.",
      ],
      cta: "Đăng ký thiết kế",
    },
  ],
  faqs: [
    {
      q: "Tra cứu mã FDA, mã GACC như thế nào?",
      a: "Nhập số đăng ký hoặc tên doanh nghiệp vào ô tra cứu, hoặc quét mã QR. Kết quả áp dụng cho hồ sơ do Vexim Global quản lý.",
    },
    {
      q: "Không tìm thấy mã thì làm gì?",
      a: "Vui lòng liên hệ 0373 685 634 để được hỗ trợ kiểm tra.",
    },
    {
      q: "Vexim Global hỗ trợ gì về FDA?",
      a: "Đăng ký cơ sở với FDA, cập nhật mã DUNS, mã FEI, lưu hồ sơ điện tử, nhắc lịch gia hạn và gửi cảnh báo trước hạn.",
    },
    {
      q: "Bao lâu phải gia hạn đăng ký FDA?",
      a: "Hai năm một lần, từ ngày 01/10 đến ngày 31/12 của các năm chẵn.",
    },
    {
      q: "Doanh nghiệp được nhắc hạn như thế nào?",
      a: "Hệ thống tự động gửi nhắc lịch và cảnh báo trước hạn để doanh nghiệp chủ động chuẩn bị.",
    },
    {
      q: "Vexim Global hỗ trợ gì về GACC?",
      a: "Tư vấn, tra cứu mã HS, mã CIQ để đăng ký đúng mã GACC, rà soát hồ sơ và nộp lên hệ thống CIFER.",
    },
    {
      q: "Sau khi có mã GACC, Vexim Global hỗ trợ gì thêm?",
      a: "Duy trì mã số và cập nhật địa chỉ miễn phí.",
    },
  ],
};

const en: SiteCopy = {
  htmlLang: "en",
  a11y: { skip: "Skip navigation" },
  meta: {
    title: "FDA and GACC code lookup | Vexim Global",
    description:
      "Look up the FDA and GACC codes of your business. Vexim Global supports FDA registration, GACC registration, free listings on Vexim Trade and export website design.",
    siteName: "FDA and GACC code lookup | Vexim Global",
  },
  org: {
    legal: "Vexim Global Co., Ltd",
    legalEn: "VEXIM GLOBAL CO., LTD",
    addressLines: ["No. 25/6/51 Ngoa Long, Tay Tuu", "Bac Tu Liem, Hanoi, Vietnam"],
    address: {
      streetAddress: "No. 25/6/51 Ngoa Long, Tay Tuu",
      addressLocality: "Bac Tu Liem",
      addressRegion: "Hanoi",
      addressCountry: "VN",
    },
    phone: PHONE,
    phoneHref: PHONE_HREF,
    email: EMAIL,
    website: WEBSITE,
    websiteLabel: WEBSITE_LABEL,
    description:
      "We help businesses register, keep and track FDA and GACC codes.",
    knowsAbout: [
      "FDA registration",
      "DUNS number",
      "FEI number",
      "GACC registration",
      "HS code",
      "CIQ code",
      "CIFER system",
    ],
  },
  nav: {
    aria: "Main navigation",
    links: [
      { label: "Code lookup", href: "#tra-cuu" },
      { label: "Services", href: "#dich-vu" },
      { label: "FAQ", href: "#faq" },
    ],
    login: "Internal login",
    menu: "Open menu",
    close: "Close menu",
    language: "Language",
  },
  hero: {
    eyebrow: "Public lookup",
    title: "FDA and GACC code lookup",
    lead: "Look up the FDA and GACC codes of your business.",
    primary: "Look up a code",
    secondary: "Talk to our team",
    factsLabel: "Related codes and systems",
    facts: ["FDA", "DUNS", "FEI", "GACC", "CIFER"],
  },
  lookup: {
    index: "01",
    kicker: "Records managed by Vexim Global",
    title: "Registration code lookup",
    typeLabel: "Code type",
    fda: "FDA code",
    gacc: "GACC code",
    inputLabel: "Registration number or company name",
    placeholder: "For example: 12345678901 or ABC Co., Ltd.",
    submit: "Look up",
    submitting: "Looking up",
    scan: "Scan QR code",
    note: "Results cover records managed by Vexim Global.",
    resultsLabel: "Lookup result",
    resultCompany: "Company",
    resultType: "Code type",
    resultStatus: "Status",
    resultDeadline: "Next deadline",
    statusValid: "Valid",
    statusExpiring: "Expiring soon",
    statusExpired: "Expired",
    notFound: {
      before: "No record found in the Vexim Global system. Please call ",
      phone: PHONE,
      after: " for assistance.",
    },
    countOne: "1 matching record",
    countMany: "{count} matching records",
    openVerify: "Open verification page",
    tooShort: "Please enter at least 2 characters.",
    failed: "The lookup could not be completed. Please try again or call 0373 685 634.",
    startOver: "Search again",
    scanTitle: "Scan the QR code on the record",
    scanHint: "Place the QR code inside the frame.",
    scanUnsupported:
      "This browser cannot scan directly. Open your phone camera and scan the QR code on the record; the verification page will open.",
    scanError: "The camera could not be opened. Please enter the registration number or company name.",
    scanStarting: "Opening camera",
    close: "Close",
  },
  services: {
    index: "02",
    title: "Services",
    lead: "Vexim Global helps businesses register, keep and track FDA and GACC registration codes.",
    contact: [
      { text: "Call " },
      { text: PHONE, href: PHONE_HREF },
      { text: " or email " },
      { text: EMAIL, href: `mailto:${EMAIL}` },
      { text: " for advice." },
    ],
  },
  faq: {
    index: "03",
    title: "Frequently asked questions",
    lead: "How to look up, register and renew FDA and GACC codes.",
    contact: "Do you need another answer?",
  },
  footer: {
    brandline: "We help businesses register, keep and track FDA and GACC codes.",
    companyTitle: "Company",
    contactTitle: "Contact",
    linkTitle: "Links",
    hotlineLabel: "Hotline",
    emailLabel: "Email",
    websiteLabel: "Website",
    links: [
      { label: "Code lookup", href: "#tra-cuu" },
      { label: "FDA registration", href: "#dich-vu" },
      { label: "GACC registration", href: "#dich-vu" },
      { label: "FAQ", href: "#faq" },
      { label: "Internal login", href: "/login", nofollow: true },
    ],
    copyright: "© 2026 Vexim Global Co., Ltd.",
  },
  services_list: [
    {
      id: "fda",
      no: "01",
      tag: "FDA",
      title: "FDA registration",
      desc: "FDA registration and code management for businesses exporting food to the United States.",
      schemaDescription:
        "Facility registration with the FDA, DUNS and FEI code updates, electronic records, renewal reminders and advance notices.",
      bullets: [
        "Facility registration with the FDA.",
        "DUNS and FEI code updates.",
        "Electronic records, ready when you need them.",
        "Renewal reminders and key deadlines.",
        "Advance notices so you can prepare in time.",
        "Publicly verifiable FDA codes that support your standing with partners.",
      ],
      cta: "Register for FDA",
    },
    {
      id: "gacc",
      no: "02",
      tag: "GACC",
      title: "GACC registration",
      desc: "GACC registration for businesses exporting food to China.",
      schemaDescription:
        "Advice and checks on HS and CIQ codes for a correct GACC registration, document review, submission to CIFER, code maintenance and free address updates.",
      bullets: [
        "Advice on HS and CIQ codes for a correct GACC registration.",
        "Document review and submission to CIFER.",
        "Code maintenance and free address updates.",
      ],
      cta: "Register for GACC",
    },
    {
      id: "trade",
      no: "03",
      tag: "Vexim Trade",
      title: "Free listing on Vexim Trade",
      desc: "Put your business and products on Vexim Trade at no cost.",
      schemaDescription:
        "Create a company profile, publish products and receive quotation requests from buyers.",
      bullets: [
        "Create a company profile.",
        "Publish products, specifications and reference prices.",
        "Receive quotation requests from buyers.",
      ],
      cta: "Request a listing",
    },
    {
      id: "website",
      no: "04",
      tag: "Website",
      title: "Export website design",
      desc: "A company and product website in more than one language.",
      schemaDescription:
        "A company and product website in more than one language, with a quotation request form.",
      bullets: [
        "Present products and packaging specifications.",
        "Include a quotation request form.",
        "Display well on desktop and mobile.",
      ],
      cta: "Request a website",
    },
  ],
  faqs: [
    {
      q: "How do I look up an FDA or GACC code?",
      a: "Enter the registration number or company name in the lookup field, or scan the QR code. Results cover records managed by Vexim Global.",
    },
    {
      q: "What if I cannot find a code?",
      a: "Please call 0373 685 634 and we will check it for you.",
    },
    {
      q: "What does Vexim Global do for FDA registration?",
      a: "Facility registration with the FDA, DUNS and FEI code updates, electronic records, renewal reminders and advance notices.",
    },
    {
      q: "How often must FDA registration be renewed?",
      a: "Every two years, from 1 October to 31 December of even years.",
    },
    {
      q: "How are renewal deadlines notified?",
      a: "The system sends automatic reminders and advance notices so your business can prepare.",
    },
    {
      q: "What does Vexim Global do for GACC registration?",
      a: "Advice on HS and CIQ codes for a correct GACC registration, document review and submission to CIFER.",
    },
    {
      q: "What happens after a GACC code is issued?",
      a: "We maintain the code and update your address at no cost.",
    },
  ],
};

export const SITE_CONTENT: Record<SiteLang, SiteCopy> = { vi, en };

export function siteCopy(lang: SiteLang): SiteCopy {
  return SITE_CONTENT[lang] ?? vi;
}

export const SITE_PATHS: Record<SiteLang, string> = { vi: "/", en: "/en" };

/** Địa chỉ gốc dùng trong schema, giữ đúng đặc tả. */
const SCHEMA_ORIGIN = "https://vanhanh.veximglobal.com";

/**
 * JSON-LD của trang chủ: thông tin doanh nghiệp, website, trang, bốn dịch vụ
 * và bảy câu hỏi thường gặp. Toàn bộ nội dung lấy từ cùng nguồn với phần hiển thị.
 */
export function siteJsonLd(lang: SiteLang) {
  const c = siteCopy(lang);
  const orgId = `${SCHEMA_ORIGIN}/#organization`;
  const schemaIds: Record<SiteService["id"], string> = {
    fda: "dich-vu-fda",
    gacc: "dich-vu-gacc",
    trade: "dich-vu-niem-yet",
    website: "dich-vu-website",
  };
  const serviceId = (id: SiteService["id"]) => `${SCHEMA_ORIGIN}/#${schemaIds[id]}`;

  const services = c.services_list.map((s) => ({
    "@type": "Service",
    "@id": serviceId(s.id),
    name: s.title,
    description: s.schemaDescription,
    provider: { "@id": orgId },
    ...(s.id === "trade"
      ? { offers: { "@type": "Offer", price: "0", priceCurrency: "VND" } }
      : {}),
  }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "ProfessionalService"],
        "@id": orgId,
        name: c.org.legal,
        alternateName: c.org.legalEn,
        url: WEBSITE,
        logo: `${SCHEMA_ORIGIN}/logo.png`,
        description: c.org.description,
        telephone: "+84373685634",
        email: EMAIL,
        address: {
          "@type": "PostalAddress",
          ...c.org.address,
        },
        knowsAbout: c.org.knowsAbout,
      },
      {
        "@type": "WebSite",
        "@id": `${SCHEMA_ORIGIN}/#website`,
        url: `${SCHEMA_ORIGIN}/`,
        name: siteCopy("vi").meta.siteName,
        inLanguage: lang,
        publisher: { "@id": orgId },
      },
      {
        "@type": "WebPage",
        "@id": `${SCHEMA_ORIGIN}/#webpage`,
        url: `${SCHEMA_ORIGIN}${lang === "en" ? "/en" : "/"}`,
        name: c.meta.title,
        description: c.meta.description,
        inLanguage: lang,
        isPartOf: { "@id": `${SCHEMA_ORIGIN}/#website` },
        about: { "@id": orgId },
        mainEntity: { "@id": `${SCHEMA_ORIGIN}/#faq` },
      },
      ...services,
      {
        "@type": "FAQPage",
        "@id": `${SCHEMA_ORIGIN}/#faq`,
        inLanguage: lang,
        mainEntity: c.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
}
