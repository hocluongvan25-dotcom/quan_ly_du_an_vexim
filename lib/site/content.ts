export type Lang = "vi" | "en";

export type NavItem = { label: string; href: string };

export type ServiceSummary = {
  no: string;
  slug: string;
  href: string;
  title: string;
  lead: string;
  points: string[];
  cta: string;
  ctaHref: string;
};

export type SystemFeature = { no: string; title: string; description: string };

export type LookupStatus = "valid" | "expiring" | "expired";

export type LookupCopy = {
  heading: string;
  description: string;
  scopeNote: string;
  typeGroupLabel: string;
  fda: string;
  gacc: string;
  inputLabel: string;
  placeholder: string;
  submit: string;
  submitting: string;
  qrLabel: string;
  qrNote: string;
  hint: string;
  shortQuery: string;
  networkError: string;
  notFound: string;
  resultsHeading: (count: number) => string;
  resultLabels: {
    company: string;
    type: string;
    number: string;
    status: string;
    expiry: string;
    manager: string;
    updated: string;
  };
  statusLabels: Record<LookupStatus, string>;
  typeLabels: Record<"FDA" | "GACC", string>;
  managerName: string;
};

export type HomeCopy = {
  meta: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
  };
  nav: NavItem[];
  altLang: { label: string; href: string; title: string };
  login: string;
  hero: {
    eyebrow: string;
    title: string;
    lead: string;
    primary: string;
    primaryHref: string;
    secondary: string;
    secondaryHref: string;
    hotline: string;
  };
  seasonalNotice: (year: number) => string;
  lookup: LookupCopy;
  fixedNote: string;
  services: {
    heading: string;
    lead: string;
    items: ServiceSummary[];
  };
  system: {
    heading: string;
    lead: string;
    features: SystemFeature[];
    cta: string;
    ctaNote: string;
  };
  faq: {
    heading: string;
    lead: string;
    allFaqLabel: string;
  };
  footer: {
    tagline: string;
    labels: {
      company: string;
      taxCode: string;
      address: string;
      hotline: string;
      email: string;
      website: string;
      hours: string;
    };
    serviceColumn: { title: string; links: NavItem[] };
    infoColumn: { title: string; links: NavItem[] };
    copyright: string;
    disclaimer: string;
  };
  ctaBanner: {
    eyebrow: string;
    title: string;
    body: string;
    phoneLabel: string;
    emailLabel: string;
  };
};

const LOOKUP_VI: LookupCopy = {
  heading: "Tra cứu mã đăng ký FDA và GACC",
  description:
    "Nhập số đăng ký hoặc tên doanh nghiệp để kiểm tra hiệu lực mã. Kết quả chỉ áp dụng cho hồ sơ do Vexim Global đăng ký hoặc quản lý.",
  scopeNote: "Kết quả chỉ áp dụng cho hồ sơ do Vexim Global quản lý.",
  typeGroupLabel: "Lựa chọn loại mã",
  fda: "Mã FDA (FFR)",
  gacc: "Mã GACC",
  inputLabel: "Số đăng ký, tên doanh nghiệp hoặc mã số thuế",
  placeholder: "Nhập số đăng ký, tên doanh nghiệp hoặc mã số thuế",
  submit: "Tra cứu",
  submitting: "Đang tra cứu",
  qrLabel: "Quét mã QR trên hồ sơ",
  qrNote: "Mã QR in trên hồ sơ mở trang xác minh của Vexim Global.",
  hint: "Kết quả chỉ áp dụng cho hồ sơ do Vexim Global đăng ký hoặc quản lý.",
  shortQuery: "Vui lòng nhập ít nhất 3 ký tự.",
  networkError: "Chưa kết nối được hệ thống tra cứu. Quý khách vui lòng thử lại hoặc gọi 0373 685 634.",
  notFound:
    "Không tìm thấy hồ sơ phù hợp trong hệ thống của Vexim Global. Mã có thể được đăng ký qua đơn vị khác hoặc thông tin nhập chưa chính xác. Quý khách vui lòng liên hệ 0373 685 634 để được hỗ trợ kiểm tra.",
  resultsHeading: (count: number) => `${count} hồ sơ phù hợp`,
  resultLabels: {
    company: "Tên doanh nghiệp",
    type: "Loại đăng ký",
    number: "Số đăng ký",
    status: "Tình trạng",
    expiry: "Ngày hết hạn hoặc kỳ gia hạn",
    manager: "Đơn vị quản lý hồ sơ",
    updated: "Ngày cập nhật gần nhất",
  },
  statusLabels: {
    valid: "Còn hiệu lực",
    expiring: "Sắp hết hạn",
    expired: "Hết hiệu lực",
  },
  typeLabels: {
    FDA: "Đăng ký cơ sở thực phẩm FDA",
    GACC: "Đăng ký mã doanh nghiệp GACC",
  },
  managerName: "Vexim Global",
};

const LOOKUP_EN: LookupCopy = {
  heading: "Look up FDA and GACC registration codes",
  description:
    "Enter a registration number or company name to check the validity of a code. Results cover only records registered or managed by Vexim Global.",
  scopeNote: "Results cover only records managed by Vexim Global.",
  typeGroupLabel: "Code type",
  fda: "FDA code (FFR)",
  gacc: "GACC code",
  inputLabel: "Registration number, company name or tax code",
  placeholder: "Enter a registration number, company name or tax code",
  submit: "Look up",
  submitting: "Searching",
  qrLabel: "Scan the QR code on the record",
  qrNote: "The QR code printed on the record opens the Vexim Global verification page.",
  hint: "Results cover only records registered or managed by Vexim Global.",
  shortQuery: "Please enter at least 3 characters.",
  networkError: "The lookup service is not reachable. Please try again or call 0373 685 634.",
  notFound:
    "No matching record was found in the Vexim Global system. The code may be registered through another provider or the details entered may be incorrect. Please call 0373 685 634 for a check.",
  resultsHeading: (count: number) => (count === 1 ? "1 matching record" : `${count} matching records`),
  resultLabels: {
    company: "Company",
    type: "Registration type",
    number: "Registration number",
    status: "Status",
    expiry: "Expiry date or renewal period",
    manager: "Record manager",
    updated: "Last updated",
  },
  statusLabels: {
    valid: "Valid",
    expiring: "Expiring soon",
    expired: "Expired",
  },
  typeLabels: {
    FDA: "FDA food facility registration",
    GACC: "GACC enterprise registration",
  },
  managerName: "Vexim Global",
};

export const SERVICES_VI: ServiceSummary[] = [
  {
    no: "01",
    slug: "dang-ky-gacc",
    href: "/dich-vu/dang-ky-gacc",
    title: "Đăng ký mã GACC xuất khẩu sang Trung Quốc",
    lead:
      "Tư vấn và thực hiện đăng ký mã doanh nghiệp với Tổng cục Hải quan Trung Quốc (GACC) cho cơ sở sản xuất, chế biến, bảo quản thực phẩm xuất khẩu sang Trung Quốc, theo Lệnh số 280 có hiệu lực từ ngày 01/6/2026.",
    points: [
      "Xác định mã HS, nhóm sản phẩm và hình thức đăng ký phù hợp: qua cơ quan có thẩm quyền Việt Nam tiến cử hoặc doanh nghiệp tự đăng ký.",
      "Chuẩn bị hồ sơ, bản tự đánh giá của nhà máy và nộp trên hệ thống CIFER với tư cách đơn vị được doanh nghiệp ủy quyền.",
      "Hỗ trợ hồ sơ đề nghị tiến cử đối với 17 nhóm thực phẩm thuộc diện bắt buộc, bao gồm cả kho lạnh bảo quản thủy sản và thực phẩm nguồn gốc động vật.",
      "Hướng dẫn ghi mã đăng ký trên bao bì, khai báo mã khi làm thủ tục hải quan; theo dõi thay đổi thông tin và thời hạn hiệu lực 5 năm.",
    ],
    cta: "Đăng ký tư vấn GACC",
    ctaHref: "/lien-he?dich-vu=dang-ky-gacc",
  },
  {
    no: "02",
    slug: "dang-ky-fda",
    href: "/dich-vu/dang-ky-fda",
    title: "Đăng ký cơ sở thực phẩm với FDA Hoa Kỳ",
    lead: "Tư vấn và thực hiện các thủ tục bắt buộc để xuất khẩu thực phẩm sang thị trường Hoa Kỳ.",
    points: [
      "Đăng ký cơ sở thực phẩm với FDA, gia hạn định kỳ hai năm một lần (từ 01/10 đến 31/12 các năm chẵn) và đại diện U.S. Agent tại Hoa Kỳ.",
      "Rà soát nhãn sản phẩm theo quy định FDA: bảng thành phần dinh dưỡng, danh sách thành phần, thông tin chất gây dị ứng.",
      "Hỗ trợ hồ sơ chương trình xác minh nhà cung cấp nước ngoài (FSVP), khai báo trước lô hàng (Prior Notice) và đăng ký FCE/SID cho thực phẩm đóng hộp.",
      "Đồng bộ hồ sơ đăng ký trên hệ thống quản lý, nhắc hạn tự động trước 60, 30, 7 và 1 ngày.",
    ],
    cta: "Đăng ký tư vấn FDA",
    ctaHref: "/lien-he?dich-vu=dang-ky-fda",
  },
  {
    no: "03",
    slug: "niem-yet-vexim-trade",
    href: "/dich-vu/niem-yet-vexim-trade",
    title: "Niêm yết miễn phí trên sàn Vexim Trade",
    lead: "Tạo hồ sơ doanh nghiệp và đăng sản phẩm thực phẩm, nông sản lên sàn Vexim Trade, không mất phí.",
    points: [
      "Tạo hồ sơ pháp nhân cho nhà máy, công ty thương mại hoặc hợp tác xã.",
      "Đăng danh mục sản phẩm với thông số kỹ thuật, số lượng đặt hàng tối thiểu (MOQ), giá FOB tham khảo, năng lực gia công OEM/ODM.",
      "Hiển thị chứng nhận và đăng ký (HACCP, ISO, BRC, Halal, đăng ký FDA, mã GACC), ghi rõ thuộc doanh nghiệp hay đơn vị đối tác.",
      "Nhận yêu cầu báo giá (RFQ) đã xác minh từ người mua trong nước và quốc tế.",
    ],
    cta: "Đăng ký niêm yết miễn phí",
    ctaHref: "/lien-he?dich-vu=niem-yet-vexim-trade",
  },
  {
    no: "04",
    slug: "thiet-ke-website",
    href: "/dich-vu/thiet-ke-website",
    title: "Thiết kế website xuất khẩu",
    lead: "Thiết kế website B2B đa ngôn ngữ dành cho doanh nghiệp xuất khẩu thực phẩm, nông sản.",
    points: [
      "Bố cục theo chuẩn thương mại quốc tế: thông số kỹ thuật, quy cách đóng gói, cảng xếp hàng, điều kiện Incoterms.",
      "Tối ưu tìm kiếm đa ngôn ngữ và dữ liệu có cấu trúc (schema) để nhà nhập khẩu dễ tìm thấy doanh nghiệp.",
      "Tích hợp biểu mẫu yêu cầu báo giá và hồ sơ năng lực nhà máy.",
      "Tốc độ tải nhanh, hiển thị tốt trên máy tính và điện thoại.",
    ],
    cta: "Đăng ký thiết kế website",
    ctaHref: "/lien-he?dich-vu=thiet-ke-website",
  },
];

export const SERVICES_EN: ServiceSummary[] = [
  {
    no: "01",
    slug: "dang-ky-gacc",
    href: "/dich-vu/dang-ky-gacc",
    title: "GACC registration for exports to China",
    lead:
      "Advice and filing for an enterprise code with the General Administration of Customs of China (GACC) for facilities that manufacture, process or store food exported to China, under Order No. 280, effective 01/6/2026.",
    points: [
      "Determine the HS code, product category and applicable registration route: recommendation by the competent Vietnamese authority or self-registration.",
      "Prepare the file and the factory self-assessment, then file on the CIFER system as the provider authorised by the company.",
      "Prepare recommendation files for the 17 mandatory food categories, including cold storage for seafood and food of animal origin.",
      "Guide printing the code on packaging and declaring it at customs; monitor changes of information and the five-year validity.",
    ],
    cta: "Request GACC advice",
    ctaHref: "/en#lien-he",
  },
  {
    no: "02",
    slug: "dang-ky-fda",
    href: "/dich-vu/dang-ky-fda",
    title: "Food facility registration with FDA, United States",
    lead: "Advice and completion of the mandatory procedures for exporting food to the United States.",
    points: [
      "Food facility registration with FDA, biennial renewal (01/10 to 31/12 of even years) and a U.S. Agent in the United States.",
      "Label review against FDA rules: nutrition facts, ingredient list and allergen information.",
      "Support for the Foreign Supplier Verification Program (FSVP), Prior Notice for each shipment and FCE/SID registration for canned food.",
      "Records synchronised in the management system with automatic reminders 60, 30, 7 and 1 day in advance.",
    ],
    cta: "Request FDA advice",
    ctaHref: "/en#lien-he",
  },
  {
    no: "03",
    slug: "niem-yet-vexim-trade",
    href: "/dich-vu/niem-yet-vexim-trade",
    title: "Free listing on Vexim Trade",
    lead: "Create a company profile and list food and agricultural products on Vexim Trade at no cost.",
    points: [
      "Create a legal entity profile for a factory, trading company or cooperative.",
      "List products with specifications, minimum order quantity (MOQ), indicative FOB price and OEM/ODM capacity.",
      "Display certifications and registrations (HACCP, ISO, BRC, Halal, FDA registration, GACC code), stating whether they belong to the company or a partner.",
      "Receive verified requests for quotation (RFQ) from domestic and international buyers.",
    ],
    cta: "Request a free listing",
    ctaHref: "/en#lien-he",
  },
  {
    no: "04",
    slug: "thiet-ke-website",
    href: "/dich-vu/thiet-ke-website",
    title: "Export website design",
    lead: "Bilingual B2B websites for food and agricultural exporters.",
    points: [
      "Layout following international trade practice: specifications, packaging, port of loading and Incoterms.",
      "Multilingual search optimisation and structured data so importers can find the company.",
      "Integrated request for quotation form and factory capability profile.",
      "Fast loading and clear display on desktop and mobile.",
    ],
    cta: "Request website design",
    ctaHref: "/en#lien-he",
  },
];

export const HOME_VI: HomeCopy = {
  meta: {
    title: "Tra cứu mã FDA, đăng ký GACC xuất khẩu thực phẩm | Vexim Global",
    description:
      "Tra cứu mã FDA, đăng ký GACC xuất khẩu thực phẩm. Xác minh mã đăng ký do Vexim Global quản lý, tư vấn đăng ký cơ sở thực phẩm FDA, đăng ký GACC theo Lệnh 280.",
    ogTitle: "Tra cứu mã FDA, đăng ký GACC | Vexim Global",
    ogDescription:
      "Xác minh mã FDA, GACC bằng số đăng ký hoặc mã QR. Tư vấn đăng ký, gia hạn cho doanh nghiệp xuất khẩu thực phẩm sang Hoa Kỳ và Trung Quốc.",
  },
  nav: [
    { label: "Tra cứu mã", href: "/#tra-cuu" },
    { label: "Dịch vụ", href: "/#dich-vu" },
    { label: "Hệ thống hồ sơ", href: "/#he-thong" },
    { label: "Câu hỏi thường gặp", href: "/cau-hoi-thuong-gap" },
  ],
  altLang: { label: "EN", href: "/en", title: "Xem bản tiếng Anh" },
  login: "Đăng nhập nội bộ",
  hero: {
    eyebrow: "Vexim Global, đơn vị tư vấn đăng ký xuất khẩu thực phẩm",
    title: "Tra cứu mã FDA, mã GACC và dịch vụ đăng ký xuất khẩu thực phẩm",
    lead:
      "Vexim Global hỗ trợ doanh nghiệp Việt Nam đăng ký cơ sở thực phẩm với Cơ quan Quản lý Thực phẩm và Dược phẩm Hoa Kỳ (FDA) và đăng ký mã doanh nghiệp với Tổng cục Hải quan Trung Quốc (GACC). Quý khách và đối tác có thể tra cứu, xác minh tình trạng mã đăng ký do chúng tôi quản lý ngay trên trang này.",
    primary: "Tra cứu mã đăng ký",
    primaryHref: "#tra-cuu",
    secondary: "Nhận tư vấn miễn phí",
    secondaryHref: "/lien-he",
    hotline: "Đường dây nóng 0373 685 634. Thời gian làm việc Thứ Hai đến Thứ Sáu 8:00 đến 18:00, Thứ Bảy 8:00 đến 12:00.",
  },
  seasonalNotice: (year) =>
    `Kỳ gia hạn đăng ký cơ sở thực phẩm với FDA năm ${year} kết thúc ngày 31/12/${year}. Cơ sở không gia hạn đúng hạn sẽ bị hủy đăng ký. Liên hệ Vexim Global để được hỗ trợ gia hạn.`,
  lookup: LOOKUP_VI,
  fixedNote:
    "FDA không công bố công khai cơ sở dữ liệu số đăng ký cơ sở thực phẩm. Đăng ký với FDA không đồng nghĩa với việc FDA chứng nhận hay phê duyệt sản phẩm. Đối với mã GACC, nguồn chính thức là hệ thống CIFER của Hải quan Trung Quốc.",
  services: {
    heading: "Dịch vụ của Vexim Global",
    lead:
      "Vexim Global cung cấp dịch vụ đăng ký mã GACC, đăng ký cơ sở thực phẩm với FDA Hoa Kỳ, niêm yết sản phẩm trên sàn Vexim Trade và thiết kế website xuất khẩu cho doanh nghiệp thực phẩm, nông sản.",
    items: SERVICES_VI,
  },
  system: {
    heading: "Hệ thống quản lý hồ sơ xuất khẩu",
    lead:
      "Toàn bộ hồ sơ FDA, GACC của khách hàng được Vexim Global lưu trữ và theo dõi trên một hệ thống thống nhất, từ khi tiếp nhận đến khi gia hạn.",
    features: [
      {
        no: "01",
        title: "Hồ sơ FDA và GACC",
        description:
          "Lưu trữ số đăng ký, ngày hiệu lực, kỳ gia hạn FDA và thời hạn 5 năm của mã GACC cho từng doanh nghiệp.",
      },
      {
        no: "02",
        title: "Xác minh bằng mã QR",
        description:
          "Mỗi hồ sơ được công bố có mã QR riêng để đối tác quét và kiểm tra tình trạng hiệu lực. Phí dịch vụ và tài liệu nội bộ không hiển thị.",
      },
      {
        no: "03",
        title: "Nhắc hạn tự động",
        description:
          "Hệ thống gửi nhắc trước 60, 30, 7 và 1 ngày khi đăng ký sắp đến kỳ gia hạn hoặc hết hiệu lực.",
      },
      {
        no: "04",
        title: "Theo dõi tiến độ hồ sơ",
        description:
          "Mỗi hồ sơ đi qua các bước tiếp nhận, chuẩn bị, nộp, chờ kết quả, hoàn tất; khách hàng được cập nhật khi chuyển bước.",
      },
      {
        no: "05",
        title: "Hợp đồng và chứng từ",
        description: "Hợp đồng dịch vụ được lập từ dữ liệu hồ sơ, có kỳ thanh toán và thời hạn rõ ràng.",
      },
      {
        no: "06",
        title: "Hóa đơn theo đợt",
        description: "Xuất hóa đơn theo từng đợt thanh toán, đã bao gồm thuế giá trị gia tăng theo quy định.",
      },
    ],
    cta: "Đăng nhập nội bộ",
    ctaNote: "Dành cho nhân viên Vexim Global.",
  },
  faq: {
    heading: "Câu hỏi thường gặp",
    lead: "Mười hai câu hỏi thường gặp về tra cứu mã, đăng ký FDA, đăng ký GACC và thời hạn gia hạn.",
    allFaqLabel: "Xem toàn bộ câu hỏi thường gặp",
  },
  footer: {
    tagline: "Tư vấn đăng ký cơ sở thực phẩm với FDA Hoa Kỳ và mã GACC xuất khẩu sang Trung Quốc.",
    labels: {
      company: "Tên doanh nghiệp",
      taxCode: "Mã số thuế",
      address: "Địa chỉ",
      hotline: "Đường dây nóng",
      email: "Email",
      website: "Website chính",
      hours: "Giờ làm việc",
    },
    serviceColumn: {
      title: "Dịch vụ",
      links: [
        { label: "Tra cứu mã FDA", href: "/tra-cuu-ma-fda" },
        { label: "Tra cứu mã GACC", href: "/tra-cuu-ma-gacc" },
        { label: "Đăng ký GACC", href: "/dich-vu/dang-ky-gacc" },
        { label: "Đăng ký FDA", href: "/dich-vu/dang-ky-fda" },
        { label: "Niêm yết Vexim Trade", href: "/dich-vu/niem-yet-vexim-trade" },
        { label: "Thiết kế website xuất khẩu", href: "/dich-vu/thiet-ke-website" },
      ],
    },
    infoColumn: {
      title: "Thông tin",
      links: [
        { label: "Câu hỏi thường gặp", href: "/cau-hoi-thuong-gap" },
        { label: "Chính sách bảo mật", href: "/chinh-sach-bao-mat" },
        { label: "Điều khoản sử dụng", href: "/dieu-khoan-su-dung" },
        { label: "Liên hệ", href: "/lien-he" },
      ],
    },
    copyright: "© 2026 Công ty TNHH Vexim Global.",
    disclaimer:
      "Vexim Global là đơn vị tư vấn độc lập, không phải cơ quan nhà nước và không thuộc FDA hay GACC.",
  },
  ctaBanner: {
    eyebrow: "Liên hệ",
    title: "Trao đổi trực tiếp với chuyên viên phụ trách",
    body:
      "Quý khách cần kiểm tra một hồ sơ, chuẩn bị hồ sơ đăng ký mới hoặc gia hạn trước kỳ hạn. Vexim Global tiếp nhận thông tin qua điện thoại và email trong giờ làm việc.",
    phoneLabel: "Gọi 0373 685 634",
    emailLabel: "Gửi email",
  },
};

export const HOME_EN: HomeCopy = {
  meta: {
    title: "FDA code lookup, GACC registration for food exports | Vexim Global",
    description:
      "Look up and verify FDA and GACC registration codes managed by Vexim Global. Advice on FDA food facility registration, GACC registration under Order 280, renewal and U.S. Agent representation.",
    ogTitle: "FDA and GACC code lookup | Vexim Global",
    ogDescription:
      "Verify FDA and GACC codes by registration number or QR code. Registration and renewal advice for food exporters to the United States and China.",
  },
  nav: [
    { label: "Lookup", href: "/en#tra-cuu" },
    { label: "Services", href: "/en#dich-vu" },
    { label: "Records", href: "/en#he-thong" },
    { label: "FAQ", href: "/en#cau-hoi" },
  ],
  altLang: { label: "VI", href: "/", title: "Xem bản tiếng Việt" },
  login: "Internal login",
  hero: {
    eyebrow: "Vexim Global, registration advisory for food exports",
    title: "FDA and GACC code lookup, and registration services for food exports",
    lead:
      "Vexim Global helps Vietnamese companies register food facilities with the United States Food and Drug Administration (FDA) and register enterprise codes with the General Administration of Customs of China (GACC). Clients and partners can look up and verify the codes we manage on this page.",
    primary: "Look up a registration code",
    primaryHref: "#tra-cuu",
    secondary: "Request a free consultation",
    secondaryHref: "#lien-he",
    hotline: "Hotline 0373 685 634. Working hours Monday to Friday 8:00 to 18:00, Saturday 8:00 to 12:00.",
  },
  seasonalNotice: (year) =>
    `The FDA food facility registration renewal period for ${year} closes on 31/12/${year}. A facility that does not renew in time loses its registration. Contact Vexim Global for renewal support.`,
  lookup: LOOKUP_EN,
  fixedNote:
    "FDA does not publish its food facility registration database. Registration with FDA does not mean FDA certifies or approves a product. For GACC codes, the official source is the CIFER system of China Customs.",
  services: {
    heading: "Vexim Global services",
    lead:
      "Vexim Global provides GACC registration, FDA food facility registration, product listing on Vexim Trade and export website design for food and agricultural companies.",
    items: SERVICES_EN,
  },
  system: {
    heading: "Export record management",
    lead:
      "Every FDA and GACC record is stored and monitored in one system, from intake to renewal.",
    features: [
      {
        no: "01",
        title: "FDA and GACC records",
        description:
          "Registration numbers, effective dates, the FDA renewal period and the five-year GACC term for each company.",
      },
      {
        no: "02",
        title: "QR verification",
        description:
          "Each published record has its own QR code so partners can check validity. Service fees and internal documents are not shown.",
      },
      {
        no: "03",
        title: "Automatic reminders",
        description:
          "Reminders are sent 60, 30, 7 and 1 day before a registration reaches its renewal period or expires.",
      },
      {
        no: "04",
        title: "Record progress",
        description:
          "Every record moves through intake, preparation, filing, awaiting result and completion; the client is updated at each step.",
      },
      {
        no: "05",
        title: "Contracts and documents",
        description: "Service contracts are generated from record data, with clear payment periods and terms.",
      },
      {
        no: "06",
        title: "Invoices by instalment",
        description: "Invoices are issued for each payment instalment and include value added tax as required.",
      },
    ],
    cta: "Internal login",
    ctaNote: "For Vexim Global staff.",
  },
  faq: {
    heading: "Frequently asked questions",
    lead: "Twelve common questions on code lookup, FDA registration, GACC registration and renewal deadlines.",
    allFaqLabel: "View all questions",
  },
  footer: {
    tagline: "Registration advisory for FDA food facilities and GACC codes for exports to China.",
    labels: {
      company: "Company",
      taxCode: "Tax code",
      address: "Address",
      hotline: "Hotline",
      email: "Email",
      website: "Main website",
      hours: "Working hours",
    },
    serviceColumn: {
      title: "Services",
      links: [
        { label: "FDA and GACC code lookup", href: "/en#tra-cuu" },
        { label: "GACC registration", href: "/en#dich-vu" },
        { label: "FDA registration", href: "/en#dich-vu" },
        { label: "Vexim Trade listing", href: "/en#dich-vu" },
        { label: "Export website design", href: "/en#dich-vu" },
      ],
    },
    infoColumn: {
      title: "Information",
      links: [
        { label: "Frequently asked questions", href: "/en#cau-hoi" },
        { label: "Privacy policy", href: "/chinh-sach-bao-mat" },
        { label: "Terms of use", href: "/dieu-khoan-su-dung" },
        { label: "Contact", href: "/lien-he" },
      ],
    },
    copyright: "© 2026 Vexim Global Co., Ltd.",
    disclaimer:
      "Vexim Global is an independent advisory firm. It is not a government agency and is not part of FDA or GACC.",
  },
  ctaBanner: {
    eyebrow: "Contact",
    title: "Speak with the specialist handling your record",
    body:
      "Whether you need a record checked, a new registration prepared or a renewal completed before the deadline, Vexim Global receives requests by phone and email during working hours.",
    phoneLabel: "Call 0373 685 634",
    emailLabel: "Send an email",
  },
};

export function homeCopy(lang: Lang) {
  return lang === "en" ? HOME_EN : HOME_VI;
}

export function serviceSummaries(lang: Lang) {
  return lang === "en" ? SERVICES_EN : SERVICES_VI;
}
