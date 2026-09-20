export type VerificationLocale = "vi" | "en";
// Separate from dashboard language preferences. Only the public verification pages read this cookie.
export const VERIFICATION_LOCALE_COOKIE = "vexim-verify-locale";

export function isVerificationLocale(value: unknown): value is VerificationLocale {
  return value === "vi" || value === "en";
}

/** Explicit link > saved public-page preference > primary browser language > English. */
export function resolveVerificationLocale(query: unknown, saved?: string, acceptLanguage = ""): VerificationLocale {
  if (isVerificationLocale(query)) return query;
  if (isVerificationLocale(saved)) return saved;
  const preferred = acceptLanguage.split(",").map((part, index) => {
    const [tag, ...params] = part.trim().split(";");
    const q = params.find((p) => p.trim().startsWith("q="));
    return { tag: tag.toLowerCase(), quality: q ? Number(q.trim().slice(2)) : 1, index };
  }).filter(({ tag, quality }) => tag && Number.isFinite(quality) && quality > 0 && quality <= 1)
    .sort((a, b) => b.quality - a.quality || a.index - b.index)[0]?.tag;
  return preferred === "vi" || preferred?.startsWith("vi-") ? "vi" : "en";
}

/** Preserve the QR path, other query parameters and fragment. Never change the certificate code. */
export function verificationLanguageUrl(href: string, locale: VerificationLocale) {
  const url = new URL(href);
  url.searchParams.set("lang", locale);
  return url;
}

const vi = {
  home: "Vexim Global — trang chủ", language: "Ngôn ngữ", lookup: "Tra cứu hồ sơ đăng ký",
  documentHeading: "HỒ SƠ XÁC MINH ĐĂNG KÝ", countryHeading: "VIỆT NAM", country: "Việt Nam",
  articleLabel: "Kết quả xác minh chứng nhận", resultHeading: "Verification result", verificationId: "Verification ID",
  copyId: "Sao chép Verification ID", lastChecked: "Last checked", checkedHint: "Thời điểm tra cứu",
  companyTitle: "Thông tin doanh nghiệp", companySubtitle: "Company information", company: "Doanh nghiệp",
  certificateType: "Loại chứng nhận", registrationType: "Đăng ký {standard}", authority: "Cơ quan quản lý đăng ký",
  registrationCountry: "Quốc gia đăng ký", verifier: "Đơn vị xác minh",
  registrationTitle: "Chi tiết đăng ký", registrationSubtitle: "{standard} registration details",
  registrationCode: "Mã đăng ký {standard}", copyRegistration: "Sao chép mã đăng ký {standard}",
  gaccMarket: "Thị trường đăng ký", fdaMarket: "Thị trường quản lý", china: "Trung Quốc (China)", usa: "Hoa Kỳ (United States)",
  gaccScope: "Ngành hàng / Phạm vi đăng ký", fdaScope: "Phạm vi đăng ký FDA", noScope: "Chưa có thông tin trong hồ sơ.",
  duns: "Mã số DUNS®", usAgent: "Đại diện tại Hoa Kỳ (US Agent)", unavailable: "Chưa có thông tin",
  registrationDate: "Ngày đăng ký", expiryDate: "Ngày hết hiệu lực", term: "Kỳ hạn đăng ký", termValue: "{count} năm / kỳ đăng ký",
  validity: "Trạng thái hiệu lực", lastValidDay: "Ngày hiệu lực cuối cùng", daysLeft: "Còn {count} ngày",
  lastRenewal: "Lần gia hạn gần nhất", renewals: "Đã gia hạn {count} lần", qrCode: "Mã tra cứu QR",
  scopeLabel: "Phạm vi xác minh", aboutResult: "Về kết quả xác minh",
  verificationNote: "Kết quả đối chiếu với hồ sơ đã được duyệt trên hệ thống Vexim Global tại thời điểm tra cứu; không phải kết nối xác nhận trực tiếp từ {standard}.",
  gaccNote: "Thông tin đăng ký GACC cần được đối chiếu với cơ quan quản lý khi cần thiết.",
  fdaNote: "Đăng ký FDA không đồng nghĩa với việc FDA phê duyệt hoặc chứng nhận chất lượng sản phẩm.",
  verifiedBy: "Hồ sơ xác minh bởi", checking: "Đang kiểm tra…", refresh: "Kiểm tra lại", share: "Chia sẻ kết quả",
  supportLabel: "Hỗ trợ xác minh", supportTitle: "CẦN HỖ TRỢ XÁC MINH?", supportContact: "Liên hệ đơn vị thực hiện đăng ký",
  servicesTitle: "Hồ sơ đã sẵn sàng bạn đã có phương án đưa sản phẩm vào Mỹ chưa?",
  servicesSubtitle: "Khám phá mô hình phòng sale xuất khẩu & Vận hành Amazon tại Vexim",
  salesTitle: "Phòng Sale Xuất Khẩu Mỹ", salesDescription: "Kết nối buyer B2B, phát triển hệ thống phân phối và hỗ trợ chứng từ xuất khẩu.",
  amazonTitle: "Vận Hành Amazon US", amazonDescription: "Hỗ trợ Brand Registry, nội dung sản phẩm, quảng cáo PPC và vận hành FBA.",
  consult: "Đăng ký tư vấn", footer: "Registration verification · FDA & GACC", close: "Đóng hộp thoại",
  consultationHeading: "VEXIM GLOBAL · TƯ VẤN", contactName: "Họ tên / Tên doanh nghiệp", contactPhone: "Số điện thoại / Zalo",
  sending: "Đang gửi…", send: "Gửi yêu cầu tư vấn", copySuccess: "Đã sao chép vào bộ nhớ tạm.",
  copyFailure: "Không thể sao chép. Vui lòng sao chép trực tiếp từ thanh địa chỉ hoặc hồ sơ.",
  invalidContact: "Vui lòng nhập họ tên và số điện thoại hợp lệ.", sendFailed: "Không thể gửi yêu cầu. Vui lòng thử lại hoặc liên hệ Vexim Global.",
  consultationSuccess: "Đã gửi yêu cầu tư vấn. Vexim Global sẽ liên hệ với bạn.",
  metaTitle: "Xác minh chứng nhận | Vexim Global", metaDescription: "Tra cứu hồ sơ đăng ký FDA / GACC do Vexim Global quản lý.",
};

const en: Record<keyof typeof vi, string> = {
  home: "Vexim Global — home", language: "Language", lookup: "Registration lookup",
  documentHeading: "REGISTRATION VERIFICATION RECORD", countryHeading: "VIETNAM", country: "Vietnam",
  articleLabel: "Certificate verification result", resultHeading: "Verification result", verificationId: "Verification ID",
  copyId: "Copy Verification ID", lastChecked: "Last checked", checkedHint: "Time of lookup",
  companyTitle: "Company information", companySubtitle: "Business details", company: "Company",
  certificateType: "Certificate type", registrationType: "{standard} registration", authority: "Registration authority",
  registrationCountry: "Country of registration", verifier: "Verification provider",
  registrationTitle: "Registration details", registrationSubtitle: "{standard} registration details",
  registrationCode: "{standard} registration number", copyRegistration: "Copy {standard} registration number",
  gaccMarket: "Registration market", fdaMarket: "Regulated market", china: "China", usa: "United States",
  gaccScope: "Product category / Registration scope", fdaScope: "FDA registration scope", noScope: "Not provided in the record.",
  duns: "DUNS® number", usAgent: "U.S. Agent", unavailable: "Not provided",
  registrationDate: "Registration date", expiryDate: "Expiry date", term: "Registration term", termValue: "{count} years per registration term",
  validity: "Validity status", lastValidDay: "Last day of validity", daysLeft: "{count} days remaining",
  lastRenewal: "Last renewed", renewals: "Renewed {count} times", qrCode: "QR lookup code",
  scopeLabel: "Scope of verification", aboutResult: "About this verification",
  verificationNote: "This result is checked against approved records maintained by Vexim Global at the time of lookup; it is not a direct confirmation from {standard}.",
  gaccNote: "GACC registration details should be checked with the regulatory authority when necessary.",
  fdaNote: "FDA registration does not constitute FDA approval or certification of product quality.",
  verifiedBy: "Record verified by", checking: "Checking…", refresh: "Check again", share: "Share result",
  supportLabel: "Verification support", supportTitle: "NEED VERIFICATION SUPPORT?", supportContact: "Contact the registration service provider",
  servicesTitle: "Your registration is ready. Do you have a plan to bring your products to the U.S.?",
  servicesSubtitle: "Explore Vexim’s outsourced export sales team & Amazon operations services",
  salesTitle: "U.S. Export Sales Team", salesDescription: "Connect with B2B buyers, develop distribution networks and get support with export documentation.",
  amazonTitle: "Amazon U.S. Operations", amazonDescription: "Support for Brand Registry, product content, PPC advertising and FBA operations.",
  consult: "Request a consultation", footer: "Registration verification · FDA & GACC", close: "Close dialog",
  consultationHeading: "VEXIM GLOBAL · CONSULTATION", contactName: "Full name / Company name", contactPhone: "Phone number / Zalo",
  sending: "Sending…", send: "Send consultation request", copySuccess: "Copied to clipboard.",
  copyFailure: "Unable to copy. Please copy directly from the address bar or the record.",
  invalidContact: "Please enter your name and a valid phone number.", sendFailed: "Unable to send your request. Please try again or contact Vexim Global.",
  consultationSuccess: "Your consultation request has been sent. Vexim Global will contact you.",
  metaTitle: "Certificate Verification | Vexim Global", metaDescription: "Verify FDA / GACC registration records maintained by Vexim Global.",
};

export type VerificationTextKey = keyof typeof vi;
export function verificationText(locale: VerificationLocale, key: VerificationTextKey, params: Record<string, string | number> = {}) {
  const singular: Partial<Record<VerificationTextKey, string>> = {
    daysLeft: "{count} day remaining", renewals: "Renewed {count} time", termValue: "{count} year per registration term",
  };
  const text = locale === "en" && params.count === 1 && singular[key]
    ? singular[key]!
    : (locale === "vi" ? vi : en)[key];
  return text.replace(/\{(\w+)\}/g, (token, name: string) => params[name] === undefined ? token : String(params[name]));
}

export const verificationStatuses = {
  vi: {
    incomplete: { title: "Verification Pending", label: "Chưa xác nhận hiệu lực", description: "Hồ sơ chưa đủ điều kiện xác nhận hiệu lực. Vui lòng liên hệ Vexim Global để kiểm tra thông tin." },
    expired: { title: "Certificate Expired", label: "Hết hiệu lực", description: "Chứng nhận đã hết hiệu lực theo hồ sơ xác minh. Vui lòng liên hệ đơn vị thực hiện để kiểm tra tình trạng gia hạn." },
    unconfirmed: { title: "Verification Pending", label: "Chưa xác nhận hiệu lực", description: "Hồ sơ chưa được xác nhận hiệu lực. Vui lòng liên hệ Vexim Global để kiểm tra thông tin đăng ký." },
    future: { title: "Certificate Not Yet Valid", label: "Chưa có hiệu lực", description: "Chứng nhận chưa đến ngày bắt đầu hiệu lực theo hồ sơ xác minh." },
    valid: { title: "Certificate Verified", label: "Còn hiệu lực", description: "Chứng nhận hiện đang có hiệu lực và thông tin đăng ký khớp với hồ sơ xác minh." },
  },
  en: {
    incomplete: { title: "Verification Pending", label: "Validity unconfirmed", description: "This record is not yet eligible for validity confirmation. Please contact Vexim Global to check the details." },
    expired: { title: "Certificate Expired", label: "Expired", description: "This certificate has expired according to the verification record. Please contact the service provider to check its renewal status." },
    unconfirmed: { title: "Verification Pending", label: "Validity unconfirmed", description: "The validity of this record has not been confirmed. Please contact Vexim Global to check the registration details." },
    future: { title: "Certificate Not Yet Valid", label: "Not yet valid", description: "The validity period has not yet started according to the verification record." },
    valid: { title: "Certificate Verified", label: "Valid", description: "This certificate is currently valid and the registration details match the verification record." },
  },
};
