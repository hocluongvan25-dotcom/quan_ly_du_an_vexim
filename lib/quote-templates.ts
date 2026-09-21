/* ============================================================================
 * BẢNG BÁO GIÁ CHUẨN THEO DỊCH VỤ — Vexim Global
 * Một nguồn duy nhất cho mẫu báo giá: nhân viên chỉ chọn dịch vụ + nhập thông
 * tin khách hàng, toàn bộ hạng mục / đơn giá / điều khoản được điền sẵn.
 *
 * ⚠️ GIÁ DƯỚI ĐÂY LÀ GIÁ MẪU để chạy thử quy trình. Khi có bảng giá chính
 * thức, chỉ cần sửa số trong file này (hoặc sửa trực tiếp trên từng báo giá
 * ở trạng thái "Nháp" rồi lưu/nhân bản cho lần sau).
 * ========================================================================== */

export type QuoteTemplateKey = "FDA" | "GACC" | "SALE_EXPORT" | "AMAZON_OPS";

/** Một dòng hạng mục được lưu trong báo giá (snapshot, không phụ thuộc mẫu) */
export type QuoteLine = {
  name: string;
  unit: string;
  qty: number;
  unit_price: number;
  note: string;
  /** true = hạng mục tùy chọn, chỉ tính tiền khi khách chọn */
  optional: boolean;
};

/** Hạng mục tùy chọn gợi ý cho nhân viên tick chọn */
export type QuoteOptionDef = {
  key: string;
  label: string;
  unit: string;
  qty: number;
  unit_price: number;
  note: string;
  group: string;
};

export type QuoteTemplateDef = {
  key: QuoteTemplateKey;
  name: string;
  short_name: string;
  tagline: string;
  title: string;
  /** Dịch vụ gắn với CRM pipeline tương ứng */
  crm_pipeline_key: QuoteTemplateKey;
  validity_days: number;
  vat_rate: number;
  items: Array<Omit<QuoteLine, "optional" | "note"> & { note?: string }>;
  options: QuoteOptionDef[];
  scope: string[];
  /** Hồ sơ/tài liệu khách hàng cần cung cấp để triển khai */
  documents: string[];
  timeline: string;
  payment_terms: string;
  terms: string[];
};

/** Vì sao chọn Vexim Global — phần giới thiệu ngắn in kèm báo giá. */
export const QUOTE_STRENGTHS = [
  "Đội ngũ trực tiếp xử lý hồ sơ FDA/GACC và vận hành bán hàng xuất khẩu, không qua trung gian",
  "Theo dõi hiệu lực chứng nhận trên hệ thống riêng và chủ động nhắc gia hạn trước khi hết hạn",
  "Một đầu mối phụ trách xuyên suốt: báo cáo tiến độ định kỳ, phản hồi trong 24 giờ làm việc",
  "Tra cứu hồ sơ đã đăng ký bằng mã QR, minh bạch phạm vi công việc và chi phí ngay từ báo giá",
];

export const QUOTE_PRICE_NOTE =
  "Giá mẫu trong hệ thống — kiểm tra lại với bảng giá hiện hành trước khi gửi khách.";

export const QUOTE_TEMPLATES: QuoteTemplateDef[] = [
  {
    key: "FDA",
    name: "Đăng ký FDA (Hoa Kỳ)",
    short_name: "FDA",
    tagline: "Đăng ký cơ sở & sản phẩm xuất khẩu sang Hoa Kỳ",
    title: "BÁO GIÁ DỊCH VỤ ĐĂNG KÝ FDA (HOA KỲ)",
    crm_pipeline_key: "FDA",
    validity_days: 15,
    vat_rate: 8,
    items: [
      { name: "Phí dịch vụ đăng ký FDA cho 01 cơ sở/nhà máy sản xuất", unit: "Hồ sơ", qty: 1, unit_price: 38_000_000 },
      { name: "Rà soát & chuẩn hóa hồ sơ cho 01 nhóm sản phẩm xuất khẩu sang Mỹ", unit: "Nhóm SP", qty: 1, unit_price: 7_000_000 },
      { name: "Lập bộ chứng từ pháp lý, dịch thuật và công chứng hồ sơ gửi FDA", unit: "Bộ", qty: 1, unit_price: 5_000_000 },
    ],
    options: [
      {
        key: "us_agent",
        label: "Đăng ký & duy trì US Agent (đại diện pháp lý tại Mỹ) — 12 tháng",
        unit: "Năm", qty: 1, unit_price: 8_500_000,
        note: "Bắt buộc theo quy định FDA đối với cơ sở nước ngoài",
        group: "Bắt buộc theo quy định",
      },
      {
        key: "duns",
        label: "Đăng ký mã DUNS (Dun & Bradstreet) cho doanh nghiệp",
        unit: "Mã", qty: 1, unit_price: 2_500_000, note: "", group: "Hồ sơ & mã số",
      },
      {
        key: "extra_product",
        label: "Bổ sung 01 nhóm sản phẩm/ngành hàng được phép lưu hành",
        unit: "Nhóm SP", qty: 1, unit_price: 6_000_000, note: "", group: "Mở rộng phạm vi",
      },
      {
        key: "extra_facility",
        label: "Đăng ký bổ sung 01 cơ sở/nhà máy khác của cùng doanh nghiệp",
        unit: "Cơ sở", qty: 1, unit_price: 28_000_000, note: "", group: "Mở rộng phạm vi",
      },
      {
        key: "renewal",
        label: "Dịch vụ gia hạn đăng ký FDA kỳ tiếp theo (02 năm)",
        unit: "Kỳ", qty: 1, unit_price: 32_000_000,
        note: "Gia hạn theo chu kỳ 2 năm/lần của FDA", group: "Duy trì hiệu lực",
      },
      {
        key: "label_review",
        label: "Rà soát nhãn mác, thành phần theo quy định 21 CFR",
        unit: "Bộ nhãn", qty: 1, unit_price: 4_500_000, note: "", group: "Hồ sơ & mã số",
      },
    ],
    scope: [
      "Rà soát điều kiện công bố, mã ngành (FDA Industry Code) và mã sản phẩm theo quy định FDA",
      "Lập và nộp hồ sơ đăng ký cơ sở theo 21 CFR Part 1 (Food Facility Registration)",
      "Đăng ký, cập nhật và duy trì US Agent theo yêu cầu của FDA",
      "Chuẩn hóa hồ sơ nhà máy, mã DUNS và tài liệu chứng minh năng lực sản xuất",
      "Bàn giao mã đăng ký, hướng dẫn tra cứu và theo dõi hiệu lực trên hệ thống Vexim Global",
    ],
    documents: [
      "Giấy chứng nhận đăng ký doanh nghiệp (bản scan có dấu)",
      "Sơ đồ mặt bằng nhà máy và quy trình sản xuất tóm tắt",
      "Danh mục sản phẩm xuất khẩu kèm thành phần, mã HS (nếu có)",
      "Mã DUNS của doanh nghiệp (nếu đã có) và thông tin người đại diện pháp luật",
      "Thông tin US Agent hiện hành (nếu đã từng đăng ký FDA)",
    ],
    timeline:
      "07–15 ngày làm việc kể từ khi nhận đủ hồ sơ và tạm ứng. Thời gian FDA thẩm định/phê duyệt không tính vào tiến độ trên.",
    payment_terms:
      "Tạm ứng 50% giá trị hợp đồng khi ký kết; thanh toán 50% còn lại khi bàn giao mã đăng ký.",
    terms: [
      "Hiệu lực đăng ký FDA là 02 năm/lần theo quy định; Vexim Global chủ động thông báo trước 60 ngày khi đến kỳ gia hạn.",
      "Giá chưa bao gồm thuế/phí nộp cho cơ quan FDA, phí công chứng lãnh sự và các chi phí phát sinh ngoài phạm vi công việc (nếu có).",
      "Báo giá áp dụng cho hồ sơ thông tin chuẩn. Trường hợp hồ sơ có sai lệch, vi phạm hoặc vướng mắc cần xử lý bổ sung, Vexim Global sẽ thông báo và báo giá riêng.",
      "Khách hàng cung cấp đầy đủ giấy tờ pháp lý (bản scan) và chịu trách nhiệm về tính chính xác của thông tin đã cung cấp.",
      "Vexim Global bảo mật toàn bộ tài liệu, dữ liệu của khách hàng và không sử dụng cho mục đích khác ngoài việc thực hiện dịch vụ.",
    ],
  },
  {
    key: "GACC",
    name: "Đăng ký GACC (Trung Quốc)",
    short_name: "GACC",
    tagline: "Đăng ký cơ sở sản xuất xuất khẩu sang Trung Quốc theo CIFER",
    title: "BÁO GIÁ DỊCH VỤ ĐĂNG KÝ GACC / CIFER (TRUNG QUỐC)",
    crm_pipeline_key: "GACC",
    validity_days: 15,
    vat_rate: 8,
    items: [
      { name: "Phí dịch vụ đăng ký cơ sở xuất khẩu sang Trung Quốc (hệ thống CIFER - GACC)", unit: "Hồ sơ", qty: 1, unit_price: 45_000_000 },
      { name: "Đăng ký 01 nhóm sản phẩm/ngành hàng trên hệ thống CIFER", unit: "Nhóm SP", qty: 1, unit_price: 10_000_000 },
      { name: "Rà soát, xây dựng hồ sơ truy xuất nguồn gốc và nhãn mác xuất khẩu", unit: "Bộ", qty: 1, unit_price: 8_000_000 },
    ],
    options: [
      {
        key: "extra_category",
        label: "Bổ sung 01 ngành hàng/nhóm sản phẩm khác",
        unit: "Nhóm SP", qty: 1, unit_price: 12_000_000, note: "", group: "Mở rộng phạm vi",
      },
      {
        key: "extra_facility",
        label: "Đăng ký bổ sung 01 cơ sở/nhà máy khác",
        unit: "Cơ sở", qty: 1, unit_price: 35_000_000, note: "", group: "Mở rộng phạm vi",
      },
      {
        key: "info_update",
        label: "Cập nhật/thay đổi thông tin đã đăng ký (tên, địa chỉ, sản phẩm)",
        unit: "Lần", qty: 1, unit_price: 5_000_000, note: "", group: "Duy trì hiệu lực",
      },
      {
        key: "inspection",
        label: "Hỗ trợ chuẩn bị và tham gia kiểm tra/thanh tra định kỳ của GACC",
        unit: "Lần", qty: 1, unit_price: 15_000_000, note: "", group: "Duy trì hiệu lực",
      },
      {
        key: "training",
        label: "Tập huấn nội bộ về tiêu chuẩn, nhãn mác và truy xuất nguồn gốc",
        unit: "Buổi", qty: 1, unit_price: 6_000_000, note: "", group: "Hỗ trợ thêm",
      },
    ],
    scope: [
      "Đánh giá điều kiện đăng ký theo Nghị định 248/249 của Hải quan Trung Quốc (GACC)",
      "Tạo tài khoản và lập hồ sơ đăng ký cơ sở trên hệ thống CIFER",
      "Chuẩn hóa hồ sơ truy xuất nguồn gốc, quy trình kiểm soát chất lượng và nhãn mác tiếng Trung",
      "Theo dõi tiến trình thẩm định, bổ sung hồ sơ theo yêu cầu của GACC",
      "Bàn giao mã đăng ký CIFER, hướng dẫn tra cứu và theo dõi hiệu lực trên hệ thống Vexim Global",
    ],
    documents: [
      "Giấy chứng nhận đăng ký doanh nghiệp và giấy phép kinh doanh ngành hàng",
      "Sơ đồ nhà xưởng, quy trình sản xuất và quy trình kiểm soát chất lượng",
      "Giấy chứng nhận an toàn thực phẩm / HACCP / ISO (nếu có)",
      "Danh mục sản phẩm, mã HS và quy cách đóng gói xuất khẩu",
      "Bản dịch tiếng Trung/Anh của tài liệu công bố (Vexim Global hỗ trợ rà soát)",
    ],
    timeline:
      "20–45 ngày làm việc kể từ khi nhận đủ hồ sơ. Thời gian GACC thẩm định và yêu cầu bổ sung không tính vào tiến độ trên.",
    payment_terms:
      "Tạm ứng 50% khi ký kết; thanh toán 30% khi hồ sơ được tiếp nhận trên CIFER; thanh toán 20% khi bàn giao mã đăng ký.",
    terms: [
      "Hiệu lực đăng ký GACC là 05 năm (theo quy định hiện hành); Vexim Global hỗ trợ cập nhật khi có thay đổi thông tin.",
      "Giá chưa bao gồm phí nộp cơ quan chức năng, dịch thuật công chứng và chi phí lấy mẫu/kiểm nghiệm (nếu có).",
      "Khách hàng đảm bảo cơ sở đáp ứng điều kiện vệ sinh, an toàn thực phẩm và cung cấp đầy đủ tài liệu theo yêu cầu.",
      "Trường hợp GACC yêu cầu nội dung ngoài phạm vi báo giá, hai bên thống nhất khối lượng và chi phí bổ sung bằng phụ lục.",
      "Vexim Global bảo mật toàn bộ tài liệu của khách hàng trong và sau thời gian thực hiện dịch vụ.",
    ],
  },
  {
    key: "SALE_EXPORT",
    name: "Sale xuất khẩu Mỹ",
    short_name: "Sale XK",
    tagline: "Đội Sale xuất khẩu phát triển khách hàng B2B tại thị trường Mỹ",
    title: "BÁO GIÁ DỊCH VỤ SALE XUẤT KHẨU MỸ",
    crm_pipeline_key: "SALE_EXPORT",
    validity_days: 15,
    vat_rate: 8,
    items: [
      {
        name: "Phí dịch vụ phát triển khách hàng xuất khẩu Mỹ (KPI: tiếp cận tối thiểu 150 khách tiềm năng/tháng)",
        unit: "Tháng", qty: 3, unit_price: 25_000_000, note: "Hợp đồng tối thiểu 03 tháng",
      },
      {
        name: "Phí khởi tạo hồ sơ năng lực, dữ liệu thị trường và danh sách buyer lần đầu",
        unit: "Lần", qty: 1, unit_price: 5_000_000,
      },
    ],
    options: [
      {
        key: "catalog",
        label: "Thiết kế bộ nhận diện & catalogue tiếng Anh chuẩn B2B",
        unit: "Bộ", qty: 1, unit_price: 15_000_000, note: "", group: "Tài liệu bán hàng",
      },
      {
        key: "website",
        label: "Website/landing page tiếng Anh giới thiệu năng lực xuất khẩu",
        unit: "Site", qty: 1, unit_price: 18_000_000, note: "", group: "Tài liệu bán hàng",
      },
      {
        key: "profile",
        label: "Company profile chuẩn B2B (PDF song ngữ)",
        unit: "Bộ", qty: 1, unit_price: 8_000_000, note: "", group: "Tài liệu bán hàng",
      },
      {
        key: "trade_show",
        label: "Hỗ trợ tham gia hội chợ/xúc tiến thương mại tại Mỹ",
        unit: "Đoàn", qty: 1, unit_price: 12_000_000,
        note: "Chi phí công tác, vé, chỗ ở thanh toán theo thực tế", group: "Xúc tiến thương mại",
      },
    ],
    scope: [
      "Xây dựng danh sách khách hàng mục tiêu (nhà nhập khẩu, distributor, chuỗi bán lẻ) theo ngành hàng",
      "Tiếp cận đa kênh: email B2B, LinkedIn, giới thiệu và kết nối qua hiệp hội ngành",
      "Sàng lọc phản hồi, xác minh nhu cầu và đặt lịch họp với buyer",
      "Chuẩn bị tài liệu bán hàng, báo giá và hỗ trợ đàm phán điều khoản cùng doanh nghiệp",
      "Báo cáo tiến độ 02 tuần/lần, cập nhật pipeline bán hàng trên hệ thống CRM Vexim Global",
    ],
    documents: [
      "Hồ sơ năng lực doanh nghiệp: catalogue, bảng giá xuất khẩu, chứng nhận chất lượng",
      "Danh mục sản phẩm ưu tiên phát triển tại thị trường Mỹ và năng lực sản xuất",
      "Thông tin đầu mối phụ trách (tên, email, số điện thoại) để phối hợp xử lý yêu cầu buyer",
      "Chính sách giá, điều kiện giao hàng và phương thức thanh toán dự kiến",
      "Tài khoản LinkedIn/website hiện có (nếu muốn tận dụng cho hoạt động tiếp cận)",
    ],
    timeline:
      "Triển khai trong 03 tháng (tối thiểu), bắt đầu trong 03 ngày làm việc sau khi hai bên thống nhất nội dung và KPI.",
    payment_terms:
      "Thanh toán theo tháng trong vòng 07 ngày kể từ ngày xuất hóa đơn. Tháng đầu thanh toán ngay khi ký hợp đồng.",
    terms: [
      "KPI cam kết gồm số lượng khách hàng được tiếp cận và số cuộc trao đổi với buyer; không bao gồm việc buyer phải ký đơn hàng.",
      "Chi phí quảng cáo, phí nền tảng, công tác phí và chi phí bên thứ ba (nếu có) do khách hàng chi trả trực tiếp.",
      "Khách hàng cung cấp kịp thời tài liệu sản phẩm, mẫu, chứng nhận và người đầu mối xử lý yêu cầu từ buyer.",
      "Dữ liệu khách hàng phát sinh thuộc quyền sử dụng của khách hàng trong và sau thời gian hợp tác.",
      "Mỗi bên được chấm dứt hợp đồng trước 15 ngày bằng văn bản/email; hai bên thanh toán phần công việc đã thực hiện.",
    ],
  },
  {
    key: "AMAZON_OPS",
    name: "Vận hành Amazon US",
    short_name: "Amazon",
    tagline: "Vận hành gian hàng Amazon US trọn gói theo tháng",
    title: "BÁO GIÁ DỊCH VỤ VẬN HÀNH AMAZON US",
    crm_pipeline_key: "AMAZON_OPS",
    validity_days: 15,
    vat_rate: 8,
    items: [
      {
        name: "Phí vận hành gian hàng Amazon US theo tháng (đăng bán, tối ưu, chăm sóc khách hàng, theo dõi tồn kho)",
        unit: "Tháng", qty: 3, unit_price: 20_000_000, note: "Hợp đồng tối thiểu 03 tháng",
      },
      {
        name: "Thiết lập gian hàng ban đầu: cấu trúc listing, chính sách, cài đặt vận chuyển & thuế",
        unit: "Lần", qty: 1, unit_price: 8_000_000,
      },
    ],
    options: [
      {
        key: "a_plus",
        label: "Thiết kế listing + A+ Content cho tối đa 05 sản phẩm",
        unit: "Gói", qty: 1, unit_price: 6_000_000, note: "", group: "Nội dung & hình ảnh",
      },
      {
        key: "images",
        label: "Bộ ảnh sản phẩm chuẩn Amazon (07 ảnh/sản phẩm)",
        unit: "SP", qty: 5, unit_price: 700_000, note: "", group: "Nội dung & hình ảnh",
      },
      {
        key: "ppc",
        label: "Tối ưu & quản lý quảng cáo PPC (chi phí theo tháng)",
        unit: "Tháng", qty: 1, unit_price: 5_000_000,
        note: "Chưa gồm ngân sách quảng cáo trả cho Amazon", group: "Tăng trưởng",
      },
      {
        key: "logistics",
        label: "Tư vấn nhập hàng, đóng gói và vận chuyển FBA",
        unit: "Lần", qty: 1, unit_price: 6_000_000,
        note: "Chưa gồm phí vận chuyển, thuế nhập khẩu thực tế", group: "Vận hành",
      },
      {
        key: "brand",
        label: "Đăng ký Brand Registry & bảo vệ thương hiệu trên Amazon",
        unit: "Lần", qty: 1, unit_price: 7_500_000, note: "", group: "Tăng trưởng",
      },
    ],
    scope: [
      "Kiểm tra và hoàn thiện tài khoản Seller, chính sách gian hàng, cấu hình thuế và vận chuyển",
      "Nghiên cứu từ khoá, tối ưu tiêu đề - bullet - mô tả - hình ảnh theo tiêu chuẩn Amazon",
      "Quản lý giá bán, tồn kho FBA, xử lý đơn hàng và chăm sóc khách hàng bằng tiếng Anh",
      "Theo dõi chỉ số tài khoản (Account Health), xử lý cảnh báo và khiếu nại của Amazon",
      "Báo cáo hiệu quả kinh doanh theo tháng: doanh thu, ACOS, tồn kho, đề xuất tối ưu",
    ],
    documents: [
      "Tài khoản Amazon Seller Central (quyền truy cập cho Vexim Global) hoặc uỷ quyền đăng ký mới",
      "Thông tin thương hiệu, hình ảnh sản phẩm gốc, thông số kỹ thuật",
      "Giá bán mong muốn, chi phí nhập hàng và ngân sách quảng cáo dự kiến",
      "Chứng nhận sản phẩm/thương hiệu (nếu có) để phục vụ Brand Registry",
      "Kế hoạch nhập hàng và năng lực cung ứng để kiểm soát tồn kho FBA",
    ],
    timeline:
      "Thiết lập gian hàng trong 07–10 ngày làm việc; vận hành duy trì theo tháng, báo cáo vào ngày 05 hằng tháng.",
    payment_terms:
      "Thanh toán theo tháng trong vòng 07 ngày kể từ ngày xuất hóa đơn; phí thiết lập ban đầu thanh toán khi ký hợp đồng.",
    terms: [
      "Chi phí phí sàn Amazon, ngân sách quảng cáo, phí FBA, thuế nhập khẩu do khách hàng chi trả trực tiếp cho Amazon/đối tác vận chuyển.",
      "Khách hàng đảm bảo sản phẩm hợp pháp, có đủ chứng nhận cần thiết và nguồn hàng đáp ứng tiêu chuẩn Amazon.",
      "Thời gian xử lý cảnh báo/khiếu nại của Amazon phụ thuộc thời gian phản hồi của Amazon, không tính vào cam kết tiến độ.",
      "Kết quả bán hàng phụ thuộc thị trường, ngân sách quảng cáo và giá bán; Vexim Global cam kết chất lượng vận hành theo phạm vi công việc.",
      "Hai bên bàn giao đầy đủ tài khoản và dữ liệu khi kết thúc hợp đồng.",
    ],
  },
];

export const QUOTE_TEMPLATE_KEYS = QUOTE_TEMPLATES.map((t) => t.key);

export function getQuoteTemplate(key: string): QuoteTemplateDef | undefined {
  return QUOTE_TEMPLATES.find((t) => t.key === key);
}

export function isQuoteTemplateKey(value: unknown): value is QuoteTemplateKey {
  return typeof value === "string" && QUOTE_TEMPLATE_KEYS.includes(value as QuoteTemplateKey);
}

/** Hạng mục mặc định của mẫu → dòng hàng lưu trong báo giá */
export function templateItems(key: QuoteTemplateKey): QuoteLine[] {
  const template = getQuoteTemplate(key);
  if (!template) return [];
  return template.items.map((item) => ({
    name: item.name,
    unit: item.unit,
    qty: item.qty,
    unit_price: item.unit_price,
    note: item.note || "",
    optional: false,
  }));
}
