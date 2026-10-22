/**
 * Bộ câu hỏi thường gặp dùng chung cho phần hiển thị và khối schema FAQPage.
 * Nội dung trên trang và trong schema sinh ra từ cùng một nguồn nên luôn trùng khớp từng chữ.
 */
export type FaqGroupId = "lookup" | "fda" | "gacc" | "general";

export type FaqItem = {
  id: string;
  group: FaqGroupId;
  question: string;
  answer: string;
};

export const FAQ_GROUPS_VI: Array<{ id: FaqGroupId; label: string }> = [
  { id: "lookup", label: "Nhóm 1. Tra cứu và xác minh mã" },
  { id: "fda", label: "Nhóm 2. Đăng ký FDA Hoa Kỳ" },
  { id: "gacc", label: "Nhóm 3. Đăng ký GACC Trung Quốc" },
  { id: "general", label: "Nhóm 4. Thông tin chung" },
];

export const FAQ_GROUPS_EN: Array<{ id: FaqGroupId; label: string }> = [
  { id: "lookup", label: "Group 1. Lookup and verification" },
  { id: "fda", label: "Group 2. FDA registration in the United States" },
  { id: "gacc", label: "Group 3. GACC registration in China" },
  { id: "general", label: "Group 4. General information" },
];

export const FAQ_VI: FaqItem[] = [
  {
    id: "lookup-1",
    group: "lookup",
    question: "Làm thế nào để tra cứu mã FDA hoặc mã GACC do Vexim Global quản lý?",
    answer:
      "Quý khách nhập số đăng ký, tên doanh nghiệp hoặc mã số thuế vào ô tra cứu, hoặc quét mã QR trên hồ sơ. Kết quả hiển thị tên doanh nghiệp, loại đăng ký, tình trạng hiệu lực và ngày hết hạn.",
  },
  {
    id: "lookup-2",
    group: "lookup",
    question: "Kết quả tra cứu tại Vexim Global có thay thế cho việc kiểm tra với FDA hoặc GACC không?",
    answer:
      "Không. Kết quả chỉ xác minh các hồ sơ do Vexim Global đăng ký hoặc quản lý. FDA không công bố công khai số đăng ký cơ sở thực phẩm. Đối với mã GACC, nguồn chính thức là hệ thống CIFER của Hải quan Trung Quốc.",
  },
  {
    id: "lookup-3",
    group: "lookup",
    question: "Tra cứu không ra kết quả thì phải làm gì?",
    answer:
      "Mã có thể được đăng ký qua đơn vị khác, thông tin nhập chưa chính xác hoặc hồ sơ chưa được công bố. Quý khách vui lòng liên hệ đường dây nóng 0373 685 634 để được kiểm tra.",
  },
  {
    id: "fda-1",
    group: "fda",
    question: "Đăng ký FDA có phải là chứng nhận hay phê duyệt của FDA không?",
    answer:
      "Không. Đăng ký cơ sở thực phẩm là thủ tục bắt buộc để cơ sở có tên trong hệ thống của FDA. Việc đăng ký không có nghĩa FDA chứng nhận hay phê duyệt sản phẩm.",
  },
  {
    id: "fda-2",
    group: "fda",
    question: "Đăng ký cơ sở thực phẩm với FDA có thời hạn bao lâu?",
    answer:
      "Đăng ký phải được gia hạn hai năm một lần, trong khoảng từ ngày 01/10 đến ngày 31/12 của các năm chẵn. Cơ sở không gia hạn đúng hạn sẽ bị hủy đăng ký.",
  },
  {
    id: "fda-3",
    group: "fda",
    question: "Vì sao doanh nghiệp cần U.S. Agent?",
    answer:
      "Cơ sở thực phẩm nước ngoài khi đăng ký với FDA phải chỉ định một đại diện (U.S. Agent) có địa chỉ tại Hoa Kỳ. Vexim Global cung cấp dịch vụ đại diện U.S. Agent chính thức.",
  },
  {
    id: "fda-4",
    group: "fda",
    question: "Ngoài đăng ký cơ sở, doanh nghiệp cần chuẩn bị thêm những gì?",
    answer:
      "Tùy sản phẩm, doanh nghiệp cần nhãn đúng quy định FDA, khai báo trước (Prior Notice) cho từng lô hàng, nhà nhập khẩu có chương trình FSVP, và đăng ký FCE/SID đối với thực phẩm đóng hộp có độ axit thấp hoặc đã axit hóa.",
  },
  {
    id: "gacc-1",
    group: "gacc",
    question: "Sản phẩm nào phải đăng ký mã GACC?",
    answer:
      "Theo Lệnh số 280 áp dụng từ ngày 01/6/2026, cơ sở sản xuất, chế biến và một số kho bảo quản thực phẩm xuất khẩu sang Trung Quốc phải đăng ký với GACC. Đối với 17 nhóm thực phẩm có mức rủi ro cao hơn, doanh nghiệp cần văn bản tiến cử của cơ quan có thẩm quyền Việt Nam. Các nhóm còn lại doanh nghiệp tự đăng ký hoặc đăng ký qua đơn vị được ủy quyền.",
  },
  {
    id: "gacc-2",
    group: "gacc",
    question: "Mã GACC có hiệu lực bao lâu?",
    answer:
      "Mã đăng ký GACC có hiệu lực 5 năm. Phần lớn trường hợp được tự động gia hạn thêm 5 năm, trừ sản phẩm thuộc danh sách không tự động gia hạn. Doanh nghiệp vẫn phải cập nhật kịp thời khi thông tin thay đổi.",
  },
  {
    id: "gacc-3",
    group: "gacc",
    question: "GACC có thu phí đăng ký không?",
    answer:
      "GACC không thu phí đăng ký. Chi phí Vexim Global báo cho Quý khách là phí dịch vụ tư vấn, chuẩn bị hồ sơ và nộp hồ sơ theo ủy quyền.",
  },
  {
    id: "gacc-4",
    group: "gacc",
    question: "Mã GACC phải thể hiện ở đâu?",
    answer:
      "Mã đăng ký được ghi trên bao bì sản phẩm và khai báo trên tờ khai hải quan nhập khẩu Trung Quốc. Lô hàng không có mã hợp lệ có thể bị từ chối thông quan.",
  },
  {
    id: "general-1",
    group: "general",
    question: "Làm sao biết đăng ký sắp hết hạn?",
    answer:
      "Hệ thống của Vexim Global gửi nhắc tự động trước 60, 30, 7 và 1 ngày. Nhân viên phụ trách sẽ liên hệ Quý khách để chuẩn bị gia hạn.",
  },
];

export const FAQ_EN: FaqItem[] = [
  {
    id: "lookup-1",
    group: "lookup",
    question: "How do I look up an FDA or GACC code managed by Vexim Global?",
    answer:
      "Enter the registration number, company name or tax code in the lookup field, or scan the QR code on the record. The result shows the company name, registration type, validity status and expiry date.",
  },
  {
    id: "lookup-2",
    group: "lookup",
    question: "Does a Vexim Global lookup result replace checking with FDA or GACC?",
    answer:
      "No. Results only verify records registered or managed by Vexim Global. FDA does not publish food facility registration numbers. For GACC codes, the official source is the CIFER system of China Customs.",
  },
  {
    id: "lookup-3",
    group: "lookup",
    question: "What should I do if the lookup returns no result?",
    answer:
      "The code may have been registered through another provider, the details entered may be incorrect, or the record may not have been published. Please call 0373 685 634 so we can check.",
  },
  {
    id: "fda-1",
    group: "fda",
    question: "Is FDA registration a certification or approval?",
    answer:
      "No. Food facility registration is a mandatory procedure that lists the facility with FDA. Registration does not mean FDA certifies or approves the product.",
  },
  {
    id: "fda-2",
    group: "fda",
    question: "How long does FDA food facility registration last?",
    answer:
      "Registration must be renewed every two years, between 01/10 and 31/12 of even-numbered years. A facility that misses the deadline has its registration cancelled.",
  },
  {
    id: "fda-3",
    group: "fda",
    question: "Why does a company need a U.S. Agent?",
    answer:
      "A foreign food facility registering with FDA must designate a U.S. Agent with an address in the United States. Vexim Global provides the U.S. Agent service.",
  },
  {
    id: "fda-4",
    group: "fda",
    question: "Beyond facility registration, what else does a company need?",
    answer:
      "Depending on the product, a company needs FDA-compliant labels, Prior Notice for each shipment, an FSVP programme on the importer side, and FCE/SID registration for low-acid canned or acidified foods.",
  },
  {
    id: "gacc-1",
    group: "gacc",
    question: "Which products require a GACC code?",
    answer:
      "Under Order No. 280, effective 01/6/2026, facilities that manufacture, process or store food exported to China must register with GACC. For the 17 higher-risk food categories, a recommendation letter from the competent Vietnamese authority is required. Other categories may be self-registered or registered through an authorised provider.",
  },
  {
    id: "gacc-2",
    group: "gacc",
    question: "How long is a GACC code valid?",
    answer:
      "A GACC registration code is valid for five years. Most cases are renewed automatically for a further five years, except products on the list that are not automatically renewed. Companies must still update their details when information changes.",
  },
  {
    id: "gacc-3",
    group: "gacc",
    question: "Does GACC charge a registration fee?",
    answer:
      "GACC does not charge a registration fee. Fees quoted by Vexim Global cover consulting, preparing documents and filing under authorisation.",
  },
  {
    id: "gacc-4",
    group: "gacc",
    question: "Where must the GACC code appear?",
    answer:
      "The code is printed on product packaging and declared on the Chinese import customs declaration. A shipment without a valid code may be refused clearance.",
  },
  {
    id: "general-1",
    group: "general",
    question: "How do I know a registration is about to expire?",
    answer:
      "Vexim Global sends automatic reminders 60, 30, 7 and 1 day in advance. The assigned specialist will contact you to prepare the renewal.",
  },
];

export function faqFor(lang: "vi" | "en") {
  return lang === "en" ? FAQ_EN : FAQ_VI;
}

export function faqGroupsFor(lang: "vi" | "en") {
  return lang === "en" ? FAQ_GROUPS_EN : FAQ_GROUPS_VI;
}

export function faqById(ids: string[], lang: "vi" | "en") {
  const all = faqFor(lang);
  return ids.map((id) => all.find((item) => item.id === id)).filter(Boolean) as FaqItem[];
}
