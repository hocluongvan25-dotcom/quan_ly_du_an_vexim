/**
 * Nội dung công khai cho trang tra cứu tiếng Việt và tiếng Anh.
 * Phần hiển thị và dữ liệu SEO lấy từ cùng nguồn để luôn nhất quán.
 */

export type SiteLang = "vi" | "en";

export type SiteService = {
  id: "fda" | "gacc" | "trade" | "website";
  tag: string;
  title: string;
  desc: string;
  /** Mô tả dịch vụ dùng trong dữ liệu có cấu trúc cho công cụ tìm kiếm. */
  schemaDescription: string;
  bullets: string[];
  cta: string;
};

export type SiteFaq = { q: string; a: string };
export type SiteLink = { label: string; href: string; nofollow?: boolean };

export type SiteCopy = {
  htmlLang: string;
  a11y: { skip: string };
  meta: { title: string; description: string; siteName: string };
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
    links: SiteLink[];
    login: string;
    call: string;
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
    highlightsLabel: string;
    highlights: string[];
  };
  lookup: {
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
    eyebrow: string;
    title: string;
    lead: string;
    contactPrompt: string;
    contactCta: string;
  };
  faq: {
    eyebrow: string;
    title: string;
    lead: string;
    contact: string;
  };
  footer: {
    brandline: string;
    companyTitle: string;
    contactTitle: string;
    linkTitle: string;
    phoneLabel: string;
    emailLabel: string;
    websiteLabel: string;
    links: SiteLink[];
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
    title: "Tra cứu mã đăng ký FDA và GACC | Vexim Global",
    description:
      "Tra cứu hồ sơ FDA hoặc GACC bằng mã đăng ký, tên doanh nghiệp hoặc mã QR. Xem tình trạng và ngày hết hạn của hồ sơ do Vexim quản lý.",
    siteName: "Tra cứu mã đăng ký FDA và GACC | Vexim Global",
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
    description: "Hỗ trợ doanh nghiệp đăng ký và theo dõi hồ sơ FDA, GACC.",
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
      { label: "Tra cứu", href: "#tra-cuu" },
      { label: "Dịch vụ", href: "#dich-vu" },
      { label: "Câu hỏi thường gặp", href: "#faq" },
    ],
    login: "Đăng nhập",
    call: "Gọi tư vấn",
    menu: "Mở menu",
    close: "Đóng menu",
    language: "Ngôn ngữ",
  },
  hero: {
    eyebrow: "Hồ sơ FDA và GACC",
    title: "Tra cứu mã đăng ký FDA và GACC",
    lead: "Nhập mã đăng ký hoặc tên doanh nghiệp để xem tình trạng và ngày hết hạn.",
    primary: "Tra cứu hồ sơ",
    secondary: "Gọi tư vấn",
    highlightsLabel: "Cách tra cứu",
    highlights: [
      "Nhập mã hoặc tên doanh nghiệp",
      "Quét mã QR trên hồ sơ",
      "Xem tình trạng và ngày hết hạn",
    ],
  },
  lookup: {
    kicker: "FDA và GACC",
    title: "Tra cứu hồ sơ",
    typeLabel: "Loại mã đăng ký",
    fda: "FDA",
    gacc: "GACC",
    inputLabel: "Mã đăng ký hoặc tên doanh nghiệp",
    placeholder: "Nhập mã hoặc tên doanh nghiệp",
    submit: "Tra cứu",
    submitting: "Đang tra cứu",
    scan: "Quét mã QR",
    note: "Kết quả chỉ hiển thị hồ sơ do Vexim quản lý.",
    resultsLabel: "Kết quả",
    resultCompany: "Doanh nghiệp",
    resultType: "Loại mã",
    resultStatus: "Tình trạng",
    resultDeadline: "Ngày hết hạn",
    statusValid: "Còn hiệu lực",
    statusExpiring: "Sắp hết hạn",
    statusExpired: "Đã hết hạn",
    notFound: {
      before: "Chưa tìm thấy hồ sơ. Gọi ",
      phone: PHONE,
      after: " để được hỗ trợ kiểm tra.",
    },
    countOne: "1 kết quả",
    countMany: "{count} kết quả",
    openVerify: "Xem hồ sơ",
    tooShort: "Nhập ít nhất 2 ký tự để tra cứu.",
    failed: "Chưa tra cứu được. Thử lại hoặc gọi 0373 685 634.",
    startOver: "Tra cứu lại",
    scanTitle: "Quét mã QR trên hồ sơ",
    scanHint: "Đặt mã QR vào giữa khung hình.",
    scanUnsupported:
      "Trình duyệt này chưa hỗ trợ quét QR trực tiếp. Dùng camera điện thoại để quét mã trên hồ sơ.",
    scanError: "Không mở được camera. Nhập mã đăng ký hoặc tên doanh nghiệp để tra cứu.",
    scanStarting: "Đang mở camera",
    close: "Đóng",
  },
  services: {
    eyebrow: "Hỗ trợ doanh nghiệp",
    title: "Dịch vụ",
    lead: "Chọn dịch vụ bạn cần. Gọi tư vấn để biết hồ sơ cần chuẩn bị và bước tiếp theo.",
    contactPrompt: "Chưa rõ nên bắt đầu từ đâu?",
    contactCta: "Gọi tư vấn",
  },
  faq: {
    eyebrow: "Thông tin cần biết",
    title: "Câu hỏi thường gặp",
    lead: "Câu trả lời ngắn về tra cứu, đăng ký và gia hạn hồ sơ.",
    contact: "Cần kiểm tra thêm?",
  },
  footer: {
    brandline: "Hỗ trợ đăng ký và theo dõi hồ sơ FDA, GACC.",
    companyTitle: "Thông tin doanh nghiệp",
    contactTitle: "Liên hệ",
    linkTitle: "Liên kết",
    phoneLabel: "Điện thoại",
    emailLabel: "Email",
    websiteLabel: "Website",
    links: [
      { label: "Tra cứu hồ sơ", href: "#tra-cuu" },
      { label: "Đăng ký FDA", href: "#dich-vu" },
      { label: "Đăng ký GACC", href: "#dich-vu" },
      { label: "Câu hỏi thường gặp", href: "#faq" },
      { label: "Đăng nhập", href: "/login", nofollow: true },
    ],
    copyright: "Bản quyền 2026 Công ty TNHH Vexim Global.",
  },
  services_list: [
    {
      id: "fda",
      tag: "FDA",
      title: "Đăng ký FDA",
      desc: "Hỗ trợ cơ sở thực phẩm đăng ký với FDA Hoa Kỳ.",
      schemaDescription:
        "Rà soát thông tin cơ sở, hỗ trợ đăng ký hoặc cập nhật hồ sơ FDA, theo dõi ngày gia hạn.",
      bullets: [
        "Rà soát thông tin cơ sở.",
        "Hỗ trợ đăng ký hoặc cập nhật hồ sơ.",
        "Theo dõi thời hạn và nhắc lịch gia hạn.",
      ],
      cta: "Gọi tư vấn",
    },
    {
      id: "gacc",
      tag: "GACC",
      title: "Đăng ký mã GACC",
      desc: "Hỗ trợ cơ sở thực phẩm đăng ký để xuất khẩu sang Trung Quốc.",
      schemaDescription:
        "Rà soát thông tin cơ sở và sản phẩm, hỗ trợ đăng ký GACC trên CIFER và theo dõi thông tin đăng ký.",
      bullets: [
        "Kiểm tra thông tin cơ sở và sản phẩm.",
        "Hỗ trợ nộp hồ sơ lên hệ thống CIFER.",
        "Theo dõi mã đăng ký và cập nhật địa chỉ.",
      ],
      cta: "Gọi tư vấn",
    },
    {
      id: "trade",
      tag: "Vexim Trade",
      title: "Đăng sản phẩm trên Vexim Trade",
      desc: "Giới thiệu doanh nghiệp và sản phẩm miễn phí trên sàn giao dịch.",
      schemaDescription:
        "Tạo hồ sơ doanh nghiệp, đăng sản phẩm và nhận yêu cầu báo giá từ người mua.",
      bullets: [
        "Tạo trang giới thiệu doanh nghiệp.",
        "Đăng sản phẩm và quy cách.",
        "Nhận yêu cầu báo giá từ người mua.",
      ],
      cta: "Gọi tư vấn",
    },
    {
      id: "website",
      tag: "Website",
      title: "Thiết kế website xuất khẩu",
      desc: "Giới thiệu doanh nghiệp và sản phẩm bằng nhiều ngôn ngữ.",
      schemaDescription:
        "Thiết kế website nhiều ngôn ngữ để giới thiệu doanh nghiệp, sản phẩm và nhận yêu cầu báo giá.",
      bullets: [
        "Trình bày sản phẩm và quy cách đóng gói.",
        "Thêm biểu mẫu nhận yêu cầu báo giá.",
        "Hiển thị tốt trên điện thoại và máy tính.",
      ],
      cta: "Gọi tư vấn",
    },
  ],
  faqs: [
    {
      q: "Làm sao tra cứu mã đăng ký FDA hoặc GACC?",
      a: "Chọn loại mã, nhập mã đăng ký hoặc tên doanh nghiệp, rồi chọn Tra cứu. Bạn cũng có thể quét mã QR trên hồ sơ.",
    },
    {
      q: "Vì sao không tìm thấy hồ sơ?",
      a: "Trang này chỉ hiển thị hồ sơ do Vexim quản lý. Gọi 0373 685 634 để nhờ kiểm tra.",
    },
    {
      q: "Mã đăng ký FDA là gì?",
      a: "Đây là mã đăng ký cơ sở với FDA Hoa Kỳ. Mã này không phải chứng nhận sản phẩm.",
    },
    {
      q: "Khi nào cần gia hạn đăng ký FDA?",
      a: "Đăng ký FDA cần gia hạn hai năm một lần. Kỳ gia hạn diễn ra từ ngày 1 tháng 10 đến ngày 31 tháng 12 của năm chẵn.",
    },
    {
      q: "Mã đăng ký GACC dùng để làm gì?",
      a: "Mã này dùng để nhận diện cơ sở thực phẩm đăng ký xuất khẩu sang Trung Quốc.",
    },
    {
      q: "Đăng ký GACC cần chuẩn bị gì?",
      a: "Tùy sản phẩm, hồ sơ có thể khác nhau. Gọi tư vấn để được rà soát thông tin cơ sở và sản phẩm trước khi nộp.",
    },
    {
      q: "Có hỗ trợ ngoài FDA và GACC không?",
      a: "Có. Bạn có thể đăng sản phẩm trên Vexim Trade hoặc thiết kế website giới thiệu doanh nghiệp.",
    },
  ],
};

const en: SiteCopy = {
  htmlLang: "en",
  a11y: { skip: "Skip navigation" },
  meta: {
    title: "Look up FDA and GACC registration codes | Vexim Global",
    description:
      "Look up FDA or GACC records by registration code, business name, or QR code. See the status and expiry date of records managed by Vexim.",
    siteName: "Look up FDA and GACC registration codes | Vexim Global",
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
    description: "We help businesses register and track FDA and GACC records.",
    knowsAbout: [
      "FDA facility registration",
      "GACC registration",
      "DUNS number",
      "FEI number",
      "HS code",
      "CIQ code",
      "CIFER system",
    ],
  },
  nav: {
    aria: "Main navigation",
    links: [
      { label: "Look up", href: "#tra-cuu" },
      { label: "Services", href: "#dich-vu" },
      { label: "FAQ", href: "#faq" },
    ],
    login: "Log in",
    call: "Call us",
    menu: "Open menu",
    close: "Close menu",
    language: "Language",
  },
  hero: {
    eyebrow: "FDA and GACC records",
    title: "Look up FDA and GACC registration codes",
    lead: "Enter a registration code or business name to see the record status and expiry date.",
    primary: "Look up a record",
    secondary: "Call for advice",
    highlightsLabel: "Lookup options",
    highlights: [
      "Enter a code or business name",
      "Scan the QR code on a record",
      "See status and expiry date",
    ],
  },
  lookup: {
    kicker: "FDA and GACC",
    title: "Look up a record",
    typeLabel: "Registration type",
    fda: "FDA",
    gacc: "GACC",
    inputLabel: "Registration code or business name",
    placeholder: "Enter a code or business name",
    submit: "Look up",
    submitting: "Searching",
    scan: "Scan QR code",
    note: "Results include records managed by Vexim only.",
    resultsLabel: "Results",
    resultCompany: "Business",
    resultType: "Registration type",
    resultStatus: "Status",
    resultDeadline: "Expiry date",
    statusValid: "Valid",
    statusExpiring: "Expiring soon",
    statusExpired: "Expired",
    notFound: {
      before: "No record found. Call ",
      phone: PHONE,
      after: " for help checking it.",
    },
    countOne: "1 result",
    countMany: "{count} results",
    openVerify: "View record",
    tooShort: "Enter at least 2 characters to search.",
    failed: "The search could not be completed. Try again or call 0373 685 634.",
    startOver: "Search again",
    scanTitle: "Scan the QR code on a record",
    scanHint: "Place the QR code in the center of the frame.",
    scanUnsupported:
      "This browser cannot scan QR codes directly. Use your phone camera to scan the code on the record.",
    scanError: "The camera could not be opened. Enter a registration code or business name to search.",
    scanStarting: "Opening camera",
    close: "Close",
  },
  services: {
    eyebrow: "Business support",
    title: "Services",
    lead: "Choose a service. Call us to learn what information to prepare and what to do next.",
    contactPrompt: "Not sure where to start?",
    contactCta: "Call for advice",
  },
  faq: {
    eyebrow: "Helpful information",
    title: "Frequently asked questions",
    lead: "Short answers about looking up, registering, and renewing records.",
    contact: "Need help checking a record?",
  },
  footer: {
    brandline: "Support for FDA and GACC registration and record tracking.",
    companyTitle: "Business details",
    contactTitle: "Contact",
    linkTitle: "Links",
    phoneLabel: "Phone",
    emailLabel: "Email",
    websiteLabel: "Website",
    links: [
      { label: "Look up a record", href: "#tra-cuu" },
      { label: "FDA registration", href: "#dich-vu" },
      { label: "GACC registration", href: "#dich-vu" },
      { label: "Frequently asked questions", href: "#faq" },
      { label: "Log in", href: "/login", nofollow: true },
    ],
    copyright: "Copyright 2026 Vexim Global Co., Ltd.",
  },
  services_list: [
    {
      id: "fda",
      tag: "FDA",
      title: "FDA registration",
      desc: "Support for food facilities registering with the U.S. FDA.",
      schemaDescription:
        "Review facility details, support FDA registration or updates, and track renewal dates.",
      bullets: [
        "Review facility information.",
        "Support registration or record updates.",
        "Track deadlines and send renewal reminders.",
      ],
      cta: "Call for advice",
    },
    {
      id: "gacc",
      tag: "GACC",
      title: "GACC registration",
      desc: "Support for food facilities registering to export to China.",
      schemaDescription:
        "Review facility and product details, support GACC registration in CIFER, and help maintain registration details.",
      bullets: [
        "Review facility and product information.",
        "Support submission through CIFER.",
        "Track registration details and update addresses.",
      ],
      cta: "Call for advice",
    },
    {
      id: "trade",
      tag: "Vexim Trade",
      title: "List products on Vexim Trade",
      desc: "Introduce your business and products on a marketplace at no cost.",
      schemaDescription:
        "Create a company profile, publish products, and receive quotation requests from buyers.",
      bullets: [
        "Create a business profile.",
        "List products and specifications.",
        "Receive quotation requests from buyers.",
      ],
      cta: "Call for advice",
    },
    {
      id: "website",
      tag: "Website",
      title: "Export website design",
      desc: "Introduce your business and products in more than one language.",
      schemaDescription:
        "Design a multilingual website that introduces a business and its products and includes a quotation request form.",
      bullets: [
        "Present products and packaging details.",
        "Add a quotation request form.",
        "Display well on desktop and mobile.",
      ],
      cta: "Call for advice",
    },
  ],
  faqs: [
    {
      q: "How do I look up an FDA or GACC registration code?",
      a: "Choose a registration type, enter a code or business name, and select Look up. You can also scan the QR code on a record.",
    },
    {
      q: "Why can’t I find a record?",
      a: "This page only shows records managed by Vexim. Call 0373 685 634 and we can check it for you.",
    },
    {
      q: "What is an FDA registration code?",
      a: "It identifies a facility registered with the U.S. FDA. It is not a certificate for a product.",
    },
    {
      q: "When must FDA registration be renewed?",
      a: "FDA registration must be renewed every two years, from October 1 to December 31 of even-numbered years.",
    },
    {
      q: "What is a GACC registration code used for?",
      a: "It identifies a food facility registered to export to China.",
    },
    {
      q: "What information is needed for GACC registration?",
      a: "Requirements vary by product. Call us to review the facility and product details before submission.",
    },
    {
      q: "Do you provide support beyond FDA and GACC?",
      a: "Yes. You can list products on Vexim Trade or request a website to introduce your business.",
    },
  ],
};

export const SITE_CONTENT: Record<SiteLang, SiteCopy> = { vi, en };

export function siteCopy(lang: SiteLang): SiteCopy {
  return SITE_CONTENT[lang] ?? vi;
}

export const SITE_PATHS: Record<SiteLang, string> = { vi: "/", en: "/en" };

/** Địa chỉ gốc dùng trong schema. */
const SCHEMA_ORIGIN = "https://vanhanh.veximglobal.com";

/** JSON-LD cho doanh nghiệp, website, trang, dịch vụ và câu hỏi thường gặp. */
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
  const services = c.services_list.map((service) => ({
    "@type": "Service",
    "@id": serviceId(service.id),
    name: service.title,
    description: service.schemaDescription,
    provider: { "@id": orgId },
    ...(service.id === "trade"
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
        address: { "@type": "PostalAddress", ...c.org.address },
        knowsAbout: c.org.knowsAbout,
      },
      {
        "@type": "WebSite",
        "@id": `${SCHEMA_ORIGIN}/#website`,
        url: `${SCHEMA_ORIGIN}/`,
        name: c.meta.siteName,
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
        mainEntity: c.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: { "@type": "Answer", text: faq.a },
        })),
      },
    ],
  };
}
