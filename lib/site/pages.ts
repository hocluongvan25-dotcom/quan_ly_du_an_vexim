export type DetailSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  ordered?: boolean;
};

export type LookupPageContent = {
  path: string;
  standard: "FDA" | "GACC";
  meta: { title: string; description: string };
  eyebrow: string;
  h1: string;
  lead: string;
  sections: DetailSection[];
  faqIds: string[];
  relatedLinks: Array<{ label: string; href: string }>;
};

export type ServiceDetail = {
  slug: string;
  path: string;
  meta: { title: string; description: string };
  eyebrow: string;
  h1: string;
  lead: string;
  facts: Array<{ label: string; value: string }>;
  sections: DetailSection[];
  faqIds: string[];
  ctaTitle: string;
  ctaBody: string;
};

const LOOKUP_RESULT_BULLETS = [
  "Tên doanh nghiệp đăng ký hồ sơ.",
  "Loại đăng ký: đăng ký cơ sở thực phẩm FDA hoặc đăng ký mã doanh nghiệp GACC.",
  "Số đăng ký hiển thị một phần, các chữ số ở giữa được ẩn.",
  "Tình trạng: còn hiệu lực, sắp hết hạn hoặc hết hiệu lực.",
  "Ngày hết hạn hoặc kỳ gia hạn tiếp theo.",
  "Đơn vị quản lý hồ sơ và ngày cập nhật gần nhất.",
];

export const LOOKUP_PAGES: Record<string, LookupPageContent> = {
  "tra-cuu-ma-fda": {
    path: "/tra-cuu-ma-fda",
    standard: "FDA",
    meta: {
      title: "Tra cứu mã FDA, kiểm tra số đăng ký cơ sở thực phẩm | Vexim Global",
      description:
        "Tra cứu số đăng ký cơ sở thực phẩm FDA (FFR) do Vexim Global đăng ký hoặc quản lý. Kiểm tra tình trạng hiệu lực, kỳ gia hạn hai năm và thông tin hồ sơ.",
    },
    eyebrow: "Tra cứu mã FDA",
    h1: "Tra cứu mã đăng ký FDA của cơ sở thực phẩm",
    lead:
      "Nhập số đăng ký FFR, tên doanh nghiệp hoặc mã số thuế để kiểm tra tình trạng hiệu lực của hồ sơ do Vexim Global đăng ký hoặc quản lý. Kết quả hiển thị ngày hết hạn và kỳ gia hạn tiếp theo.",
    sections: [
      {
        heading: "Số đăng ký FDA là gì",
        paragraphs: [
          "Khi cơ sở thực phẩm đăng ký với Cơ quan Quản lý Thực phẩm và Dược phẩm Hoa Kỳ (FDA), cơ sở được ghi nhận trong hệ thống đăng ký cơ sở thực phẩm của FDA và nhận một số đăng ký, thường gọi là FFR.",
          "FDA không công bố công khai cơ sở dữ liệu số đăng ký cơ sở thực phẩm. Đối tác nhập khẩu không tra cứu trực tiếp được trên trang của FDA mà thường yêu cầu nhà cung cấp cung cấp bản xác nhận đăng ký.",
          "Đăng ký với FDA không phải là chứng nhận hay phê duyệt sản phẩm. Việc đăng ký chỉ đưa cơ sở vào danh sách cơ sở thực phẩm đã đăng ký, phục vụ công tác quản lý và kiểm tra của FDA.",
        ],
      },
      {
        heading: "Thông tin trả về khi tra cứu",
        bullets: LOOKUP_RESULT_BULLETS,
      },
      {
        heading: "Thời hạn và gia hạn",
        bullets: [
          "Đăng ký cơ sở thực phẩm phải được gia hạn hai năm một lần, trong khoảng từ ngày 01/10 đến ngày 31/12 của các năm chẵn.",
          "Cơ sở không gia hạn đúng hạn sẽ bị hủy đăng ký và phải thực hiện lại thủ tục đăng ký.",
          "Khi địa chỉ, chủ sở hữu hoặc thông tin cơ sở thay đổi, doanh nghiệp phải cập nhật trong vòng 60 ngày kể từ ngày thay đổi.",
          "Cơ sở thực phẩm nước ngoài phải chỉ định một đại diện có địa chỉ tại Hoa Kỳ (U.S. Agent) khi đăng ký.",
        ],
      },
      {
        heading: "Lưu ý khi đọc kết quả",
        paragraphs: [
          "Kết quả tra cứu chỉ xác minh hồ sơ do Vexim Global đăng ký hoặc quản lý. Mã đăng ký do đơn vị khác thực hiện sẽ không xuất hiện trong hệ thống của Vexim Global.",
          "Trường hợp không tìm thấy hồ sơ, Quý khách vui lòng kiểm tra lại số đăng ký hoặc liên hệ đường dây nóng 0373 685 634 để được hỗ trợ.",
        ],
      },
    ],
    faqIds: ["lookup-2", "fda-1", "fda-2", "fda-3", "fda-4"],
    relatedLinks: [
      { label: "Tra cứu mã GACC", href: "/tra-cuu-ma-gacc" },
      { label: "Dịch vụ đăng ký FDA", href: "/dich-vu/dang-ky-fda" },
      { label: "Câu hỏi thường gặp", href: "/cau-hoi-thuong-gap" },
    ],
  },
  "tra-cuu-ma-gacc": {
    path: "/tra-cuu-ma-gacc",
    standard: "GACC",
    meta: {
      title: "Tra cứu mã GACC, kiểm tra mã doanh nghiệp xuất khẩu | Vexim Global",
      description:
        "Tra cứu mã đăng ký GACC do Vexim Global đăng ký hoặc quản lý. Kiểm tra tình trạng hiệu lực, thời hạn 5 năm và thông tin cơ sở xuất khẩu sang Trung Quốc.",
    },
    eyebrow: "Tra cứu mã GACC",
    h1: "Tra cứu mã đăng ký GACC và thời hạn hiệu lực",
    lead:
      "Nhập mã đăng ký GACC, tên doanh nghiệp hoặc mã số thuế để kiểm tra tình trạng hiệu lực của hồ sơ do Vexim Global đăng ký hoặc quản lý. Kết quả hiển thị thời hạn 5 năm và ngày cập nhật gần nhất.",
    sections: [
      {
        heading: "Mã GACC là gì",
        paragraphs: [
          "Mã đăng ký GACC là mã do Tổng cục Hải quan Trung Quốc (GACC) cấp cho cơ sở sản xuất, chế biến, bảo quản thực phẩm xuất khẩu sang Trung Quốc. Hồ sơ được nộp và theo dõi trên hệ thống CIFER của Hải quan Trung Quốc.",
          "Theo Lệnh số 280 áp dụng từ ngày 01/6/2026, cơ sở sản xuất, chế biến và một số kho bảo quản thực phẩm xuất khẩu sang Trung Quốc phải đăng ký với GACC. Đối với 17 nhóm thực phẩm có mức rủi ro cao hơn, doanh nghiệp cần văn bản tiến cử của cơ quan có thẩm quyền Việt Nam.",
          "Mã đăng ký được ghi trên bao bì sản phẩm và khai báo trên tờ khai hải quan nhập khẩu Trung Quốc. Lô hàng không có mã hợp lệ có thể bị từ chối thông quan.",
        ],
      },
      {
        heading: "Thông tin trả về khi tra cứu",
        bullets: LOOKUP_RESULT_BULLETS,
      },
      {
        heading: "Thời hạn hiệu lực và gia hạn",
        bullets: [
          "Mã đăng ký GACC có hiệu lực 5 năm.",
          "Phần lớn trường hợp được tự động gia hạn thêm 5 năm, trừ sản phẩm thuộc danh sách không tự động gia hạn.",
          "Doanh nghiệp phải cập nhật kịp thời khi thông tin cơ sở, sản phẩm hoặc người đại diện thay đổi.",
          "GACC không thu phí đăng ký. Chi phí Vexim Global báo cho Quý khách là phí dịch vụ tư vấn, chuẩn bị và nộp hồ sơ theo ủy quyền.",
        ],
      },
      {
        heading: "Lưu ý khi đọc kết quả",
        paragraphs: [
          "Kết quả tra cứu trên trang này chỉ xác minh hồ sơ do Vexim Global đăng ký hoặc quản lý. Nguồn chính thức để kiểm tra mã GACC là hệ thống CIFER của Hải quan Trung Quốc.",
          "Trường hợp không tìm thấy hồ sơ, Quý khách vui lòng kiểm tra lại mã đăng ký hoặc liên hệ đường dây nóng 0373 685 634 để được hỗ trợ.",
        ],
      },
    ],
    faqIds: ["lookup-2", "gacc-1", "gacc-2", "gacc-3", "gacc-4"],
    relatedLinks: [
      { label: "Tra cứu mã FDA", href: "/tra-cuu-ma-fda" },
      { label: "Dịch vụ đăng ký GACC", href: "/dich-vu/dang-ky-gacc" },
      { label: "Câu hỏi thường gặp", href: "/cau-hoi-thuong-gap" },
    ],
  },
};

const GACC_FAQS = ["gacc-1", "gacc-2", "gacc-3", "gacc-4"];
const FDA_FAQS = ["fda-1", "fda-2", "fda-3", "fda-4"];

export const SERVICE_DETAILS: ServiceDetail[] = [
  {
    slug: "dang-ky-gacc",
    path: "/dich-vu/dang-ky-gacc",
    meta: {
      title: "Đăng ký mã GACC xuất khẩu Trung Quốc, Lệnh 280 | Vexim Global",
      description:
        "Tư vấn và nộp hồ sơ đăng ký mã GACC trên hệ thống CIFER theo Lệnh số 280. Chuẩn bị bản tự đánh giá nhà máy, hồ sơ tiến cử 17 nhóm thực phẩm và theo dõi thời hạn 5 năm.",
    },
    eyebrow: "Dịch vụ 01",
    h1: "Đăng ký mã GACC xuất khẩu sang Trung Quốc",
    lead:
      "Tư vấn và thực hiện đăng ký mã doanh nghiệp với Tổng cục Hải quan Trung Quốc (GACC) cho cơ sở sản xuất, chế biến, bảo quản thực phẩm xuất khẩu sang Trung Quốc, theo Lệnh số 280 có hiệu lực từ ngày 01/6/2026.",
    facts: [
      { label: "Cơ quan cấp mã", value: "Tổng cục Hải quan Trung Quốc (GACC)" },
      { label: "Hệ thống nộp hồ sơ", value: "CIFER" },
      { label: "Căn cứ pháp lý", value: "Lệnh số 280, hiệu lực từ ngày 01/6/2026" },
      { label: "Thời hạn hiệu lực", value: "5 năm, phần lớn trường hợp tự động gia hạn" },
      { label: "Đối tượng", value: "Cơ sở sản xuất, chế biến, bảo quản thực phẩm xuất khẩu sang Trung Quốc" },
    ],
    sections: [
      {
        heading: "Phạm vi công việc",
        bullets: [
          "Xác định mã HS, nhóm sản phẩm và hình thức đăng ký phù hợp: qua cơ quan có thẩm quyền Việt Nam tiến cử hoặc doanh nghiệp tự đăng ký.",
          "Chuẩn bị hồ sơ, bản tự đánh giá của nhà máy và nộp trên hệ thống CIFER với tư cách đơn vị được doanh nghiệp ủy quyền.",
          "Hỗ trợ hồ sơ đề nghị tiến cử đối với 17 nhóm thực phẩm thuộc diện bắt buộc, bao gồm cả kho lạnh bảo quản thủy sản và thực phẩm nguồn gốc động vật.",
          "Hướng dẫn ghi mã đăng ký trên bao bì, khai báo mã khi làm thủ tục hải quan; theo dõi thay đổi thông tin và thời hạn hiệu lực 5 năm.",
        ],
      },
      {
        heading: "Hồ sơ doanh nghiệp cần cung cấp",
        bullets: [
          "Giấy chứng nhận đăng ký doanh nghiệp hoặc giấy chứng nhận đăng ký hợp tác xã.",
          "Giấy chứng nhận cơ sở đủ điều kiện an toàn thực phẩm còn hiệu lực.",
          "Danh mục sản phẩm xuất khẩu kèm mã HS đề xuất.",
          "Sơ đồ mặt bằng, quy trình sản xuất và bản tự đánh giá của nhà máy.",
          "Giấy ủy quyền cho Vexim Global thực hiện thủ tục đăng ký.",
        ],
      },
      {
        heading: "Thời gian xử lý dự kiến",
        paragraphs: [
          "Thời gian xử lý phụ thuộc nhóm sản phẩm, hình thức đăng ký và thời điểm cơ quan có thẩm quyền Việt Nam tiến cử. Vexim Global nêu thời gian dự kiến bằng văn bản trong báo giá trước khi thực hiện, kèm điều kiện hồ sơ đầy đủ và hợp lệ.",
          "Trong thời gian chờ kết quả, khách hàng theo dõi tiến độ hồ sơ trên hệ thống quản lý của Vexim Global và nhận cập nhật khi hồ sơ chuyển bước.",
        ],
      },
      {
        heading: "Lưu ý",
        bullets: [
          "GACC không thu phí đăng ký. Phí Vexim Global báo là phí dịch vụ tư vấn, chuẩn bị và nộp hồ sơ theo ủy quyền.",
          "Mã đăng ký phải được ghi trên bao bì và khai báo khi làm thủ tục hải quan nhập khẩu Trung Quốc.",
          "Doanh nghiệp cần cập nhật thông tin khi cơ sở, sản phẩm hoặc người đại diện thay đổi.",
        ],
      },
    ],
    faqIds: GACC_FAQS,
    ctaTitle: "Cần kiểm tra trường hợp cụ thể của nhà máy",
    ctaBody:
      "Vexim Global xem xét mã HS, quy trình sản xuất và thị trường xuất khẩu trước khi đề xuất hình thức đăng ký phù hợp.",
  },
  {
    slug: "dang-ky-fda",
    path: "/dich-vu/dang-ky-fda",
    meta: {
      title: "Đăng ký cơ sở thực phẩm với FDA Hoa Kỳ, U.S. Agent | Vexim Global",
      description:
        "Đăng ký và gia hạn cơ sở thực phẩm với FDA theo kỳ hai năm, đại diện U.S. Agent, rà soát nhãn, hỗ trợ FSVP, Prior Notice và đăng ký FCE/SID.",
    },
    eyebrow: "Dịch vụ 02",
    h1: "Đăng ký cơ sở thực phẩm với FDA Hoa Kỳ",
    lead: "Tư vấn và thực hiện các thủ tục bắt buộc để xuất khẩu thực phẩm sang thị trường Hoa Kỳ.",
    facts: [
      { label: "Cơ quan quản lý", value: "Cơ quan Quản lý Thực phẩm và Dược phẩm Hoa Kỳ (FDA)" },
      { label: "Kỳ gia hạn", value: "Hai năm một lần, từ 01/10 đến 31/12 các năm chẵn" },
      { label: "Đại diện tại Hoa Kỳ", value: "U.S. Agent có địa chỉ tại Hoa Kỳ" },
      { label: "Tính chất đăng ký", value: "Thủ tục bắt buộc, không phải chứng nhận sản phẩm" },
      { label: "Đối tượng", value: "Cơ sở sản xuất, chế biến, đóng gói, bảo quản thực phẩm xuất khẩu sang Hoa Kỳ" },
    ],
    sections: [
      {
        heading: "Phạm vi công việc",
        bullets: [
          "Đăng ký cơ sở thực phẩm với FDA, gia hạn định kỳ hai năm một lần (từ 01/10 đến 31/12 các năm chẵn) và đại diện U.S. Agent tại Hoa Kỳ.",
          "Rà soát nhãn sản phẩm theo quy định FDA: bảng thành phần dinh dưỡng, danh sách thành phần, thông tin chất gây dị ứng.",
          "Hỗ trợ hồ sơ chương trình xác minh nhà cung cấp nước ngoài (FSVP), khai báo trước lô hàng (Prior Notice) và đăng ký FCE/SID cho thực phẩm đóng hộp.",
          "Đồng bộ hồ sơ đăng ký trên hệ thống quản lý, nhắc hạn tự động trước 60, 30, 7 và 1 ngày.",
        ],
      },
      {
        heading: "Hồ sơ doanh nghiệp cần cung cấp",
        bullets: [
          "Giấy chứng nhận đăng ký doanh nghiệp.",
          "Thông tin cơ sở: tên, địa chỉ, người đại diện và loại hình cơ sở.",
          "Danh mục sản phẩm xuất khẩu kèm nhãn hiện hành.",
          "Thông tin đại diện U.S. Agent nếu doanh nghiệp đã chỉ định.",
          "Giấy ủy quyền cho Vexim Global thực hiện thủ tục đăng ký.",
        ],
      },
      {
        heading: "Thời hạn và kỳ gia hạn",
        bullets: [
          "Đăng ký cơ sở thực phẩm phải được gia hạn hai năm một lần, trong khoảng từ ngày 01/10 đến ngày 31/12 của các năm chẵn.",
          "Cơ sở không gia hạn đúng hạn sẽ bị hủy đăng ký.",
          "Khi thông tin cơ sở thay đổi, doanh nghiệp phải cập nhật trong vòng 60 ngày kể từ ngày thay đổi.",
          "Đăng ký với FDA không đồng nghĩa với việc FDA chứng nhận hay phê duyệt sản phẩm.",
        ],
      },
      {
        heading: "Thời gian xử lý dự kiến",
        paragraphs: [
          "Thời gian xử lý phụ thuộc loại hình cơ sở, số lượng sản phẩm và việc rà soát nhãn. Vexim Global nêu thời gian dự kiến bằng văn bản trong báo giá trước khi thực hiện, kèm điều kiện hồ sơ đầy đủ và hợp lệ.",
        ],
      },
      {
        heading: "Lưu ý",
        bullets: [
          "Mỗi lô hàng xuất khẩu sang Hoa Kỳ cần khai báo trước (Prior Notice).",
          "Nhà nhập khẩu Hoa Kỳ phải có chương trình xác minh nhà cung cấp nước ngoài (FSVP).",
          "Thực phẩm đóng hộp có độ axit thấp hoặc đã axit hóa cần đăng ký FCE/SID.",
        ],
      },
    ],
    faqIds: FDA_FAQS,
    ctaTitle: "Chuẩn bị hồ sơ cho kỳ gia hạn tiếp theo",
    ctaBody:
      "Vexim Global kiểm tra tình trạng đăng ký hiện tại, danh mục sản phẩm và nhãn trước khi nộp hồ sơ.",
  },
  {
    slug: "niem-yet-vexim-trade",
    path: "/dich-vu/niem-yet-vexim-trade",
    meta: {
      title: "Niêm yết miễn phí sản phẩm trên sàn Vexim Trade | Vexim Global",
      description:
        "Tạo hồ sơ doanh nghiệp và đăng sản phẩm thực phẩm, nông sản lên sàn Vexim Trade không mất phí. Nhận yêu cầu báo giá đã xác minh từ người mua.",
    },
    eyebrow: "Dịch vụ 03",
    h1: "Niêm yết miễn phí trên sàn Vexim Trade",
    lead: "Tạo hồ sơ doanh nghiệp và đăng sản phẩm thực phẩm, nông sản lên sàn Vexim Trade, không mất phí.",
    facts: [
      { label: "Chi phí niêm yết", value: "Miễn phí" },
      { label: "Đối tượng", value: "Nhà máy, công ty thương mại, hợp tác xã" },
      { label: "Nội dung hồ sơ", value: "Hồ sơ pháp nhân và danh mục sản phẩm" },
      { label: "Yêu cầu báo giá", value: "Nhận RFQ từ người mua trong nước và quốc tế" },
    ],
    sections: [
      {
        heading: "Nội dung niêm yết",
        bullets: [
          "Tạo hồ sơ pháp nhân cho nhà máy, công ty thương mại hoặc hợp tác xã.",
          "Đăng danh mục sản phẩm với thông số kỹ thuật, số lượng đặt hàng tối thiểu (MOQ), giá FOB tham khảo, năng lực gia công OEM/ODM.",
          "Hiển thị chứng nhận và đăng ký (HACCP, ISO, BRC, Halal, đăng ký FDA, mã GACC), ghi rõ thuộc doanh nghiệp hay đơn vị đối tác.",
          "Nhận yêu cầu báo giá (RFQ) đã xác minh từ người mua trong nước và quốc tế.",
        ],
      },
      {
        heading: "Thông tin cần chuẩn bị",
        bullets: [
          "Giấy chứng nhận đăng ký doanh nghiệp hoặc giấy chứng nhận đăng ký hợp tác xã.",
          "Thông tin liên hệ của bộ phận xuất nhập khẩu.",
          "Danh mục sản phẩm kèm ảnh, quy cách đóng gói và năng lực cung ứng.",
          "Bản sao chứng nhận, đăng ký còn hiệu lực nếu doanh nghiệp muốn hiển thị.",
        ],
      },
      {
        heading: "Cách xác minh người mua",
        paragraphs: [
          "Yêu cầu báo giá gửi qua sàn được Vexim Global kiểm tra thông tin liên hệ trước khi chuyển cho doanh nghiệp. Việc xác minh này không thay thế việc doanh nghiệp tự kiểm tra đối tác trước khi ký hợp đồng.",
        ],
      },
      {
        heading: "Lưu ý",
        bullets: [
          "Thông tin chứng nhận phải ghi rõ thuộc doanh nghiệp hay đơn vị đối tác.",
          "Giá FOB đăng trên sàn là giá tham khảo, không phải giá chào bán ràng buộc.",
          "Niêm yết trên sàn không thay thế hợp đồng mua bán giữa hai bên.",
        ],
      },
    ],
    faqIds: [],
    ctaTitle: "Đăng ký niêm yết miễn phí",
    ctaBody:
      "Vexim Global tiếp nhận hồ sơ doanh nghiệp và danh mục sản phẩm qua điện thoại hoặc email trong giờ làm việc.",
  },
  {
    slug: "thiet-ke-website",
    path: "/dich-vu/thiet-ke-website",
    meta: {
      title: "Thiết kế website xuất khẩu cho doanh nghiệp thực phẩm | Vexim Global",
      description:
        "Thiết kế website B2B đa ngôn ngữ cho doanh nghiệp xuất khẩu thực phẩm, nông sản. Bố cục theo chuẩn thương mại quốc tế, dữ liệu có cấu trúc, biểu mẫu báo giá.",
    },
    eyebrow: "Dịch vụ 04",
    h1: "Thiết kế website xuất khẩu",
    lead: "Thiết kế website B2B đa ngôn ngữ dành cho doanh nghiệp xuất khẩu thực phẩm, nông sản.",
    facts: [
      { label: "Ngôn ngữ", value: "Tiếng Việt và tiếng Anh, bổ sung ngôn ngữ khác theo yêu cầu" },
      { label: "Cấu trúc nội dung", value: "Thông số kỹ thuật, quy cách đóng gói, cảng xếp hàng, Incoterms" },
      { label: "Kỹ thuật", value: "Dữ liệu có cấu trúc, tối ưu tìm kiếm đa ngôn ngữ" },
      { label: "Bàn giao", value: "Mã nguồn và quyền quản trị website" },
    ],
    sections: [
      {
        heading: "Phạm vi công việc",
        bullets: [
          "Bố cục theo chuẩn thương mại quốc tế: thông số kỹ thuật, quy cách đóng gói, cảng xếp hàng, điều kiện Incoterms.",
          "Tối ưu tìm kiếm đa ngôn ngữ và dữ liệu có cấu trúc (schema) để nhà nhập khẩu dễ tìm thấy doanh nghiệp.",
          "Tích hợp biểu mẫu yêu cầu báo giá và hồ sơ năng lực nhà máy.",
          "Tốc độ tải nhanh, hiển thị tốt trên máy tính và điện thoại.",
        ],
      },
      {
        heading: "Nội dung cần chuẩn bị",
        bullets: [
          "Danh mục sản phẩm kèm thông số kỹ thuật và quy cách đóng gói.",
          "Hồ sơ năng lực nhà máy, chứng nhận và đăng ký còn hiệu lực.",
          "Thông tin liên hệ của bộ phận xuất khẩu.",
          "Logo, màu nhận diện và tài liệu thương hiệu nếu có.",
        ],
      },
      {
        heading: "Thời gian thực hiện dự kiến",
        paragraphs: [
          "Thời gian thực hiện phụ thuộc số lượng trang, số ngôn ngữ và khối lượng nội dung cần chuẩn bị. Vexim Global nêu thời gian dự kiến bằng văn bản trong báo giá trước khi thực hiện, kèm điều kiện nội dung và tài liệu được cung cấp đầy đủ.",
        ],
      },
      {
        heading: "Lưu ý",
        bullets: [
          "Website không thay thế các thủ tục đăng ký với FDA hoặc GACC.",
          "Thông tin chứng nhận hiển thị trên website phải chính xác và còn hiệu lực tại thời điểm đăng.",
          "Doanh nghiệp chịu trách nhiệm về nội dung sản phẩm và giá chào bán công bố.",
        ],
      },
    ],
    faqIds: [],
    ctaTitle: "Trao đổi về cấu trúc website",
    ctaBody:
      "Vexim Global xem xét danh mục sản phẩm và thị trường xuất khẩu trước khi đề xuất cấu trúc nội dung và ngôn ngữ.",
  },
];

export function lookupPage(slug: string) {
  return LOOKUP_PAGES[slug];
}

export function serviceDetail(slug: string) {
  return SERVICE_DETAILS.find((item) => item.slug === slug);
}
