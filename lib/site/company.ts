/**
 * Thông tin pháp nhân dùng cho website công khai.
 *
 * Quy tắc: chuỗi hiển thị ở chân trang, ở trang liên hệ và trong schema JSON-LD
 * phải trùng khớp từng chữ để công cụ tìm kiếm nhận diện cùng một doanh nghiệp.
 */
export const SITE_URL = "https://vanhanh.veximglobal.com";

export const COMPANY = {
  name: "Công ty TNHH Vexim Global",
  legalName: "VEXIM GLOBAL CO., LTD",
  /** Mã số thuế chưa có trong hồ sơ bàn giao. Điền vào đây khi có giấy phép kinh doanh. */
  taxCode: "",
  streetAddress: "Số 25/6/51 Ngõa Long, Tây Tựu",
  locality: "Bắc Từ Liêm",
  region: "Hà Nội",
  country: "VN",
  /** Địa chỉ đầy đủ hiển thị trên trang. Kiểm tra lại theo đơn vị hành chính sau sắp xếp 2025. */
  address: "Số 25/6/51 Ngõa Long, Tây Tựu, Bắc Từ Liêm, Hà Nội",
  phone: "0373 685 634",
  phoneHref: "tel:+84373685634",
  email: "contact@veximglobal.com",
  website: "https://www.veximglobal.com",
  websiteLabel: "www.veximglobal.com",
  hoursVi: "Thứ Hai đến Thứ Sáu, 8:00 đến 18:00. Thứ Bảy, 8:00 đến 12:00.",
  hoursEn: "Monday to Friday, 8:00 to 18:00. Saturday, 8:00 to 12:00.",
  logo: `${SITE_URL}/logo.png`,
} as const;
