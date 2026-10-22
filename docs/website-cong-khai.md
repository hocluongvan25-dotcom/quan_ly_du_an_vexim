# Website công khai vanhanh.veximglobal.com

Tài liệu này mô tả cách website công khai được tổ chức trong mã nguồn và cách sửa nội dung
mà không làm lệch đặc tả ngày 22/10/2026.

## 1. Đường dẫn

| Đường dẫn | Nội dung | Thẻ robots |
| --- | --- | --- |
| `/` | Trang chủ tiếng Việt, bản chính | index, follow |
| `/en` | Bản tiếng Anh | index, follow |
| `/tra-cuu-ma-fda` | Trang tra cứu mã FDA | index, follow |
| `/tra-cuu-ma-gacc` | Trang tra cứu mã GACC | index, follow |
| `/tra-cuu` | Đích của `SearchAction` (`?q=`, `?type=`) | noindex |
| `/dich-vu/dang-ky-gacc` | Dịch vụ 01 | index, follow |
| `/dich-vu/dang-ky-fda` | Dịch vụ 02 | index, follow |
| `/dich-vu/niem-yet-vexim-trade` | Dịch vụ 03 | index, follow |
| `/dich-vu/thiet-ke-website` | Dịch vụ 04 | index, follow |
| `/cau-hoi-thuong-gap` | Toàn bộ 12 câu hỏi thường gặp | index, follow |
| `/lien-he` | Liên hệ, thông tin pháp nhân | index, follow |
| `/chinh-sach-bao-mat` | Chính sách bảo mật | index, follow |
| `/dieu-khoan-su-dung` | Điều khoản sử dụng | index, follow |
| `/login` | Đăng nhập nội bộ | noindex, nofollow |
| `/dashboard`, `/verify/[code]` | Hệ thống nội bộ và trang QR | không đưa vào sitemap |

`/sitemap.xml` và `/robots.txt` sinh tự động từ `app/sitemap.ts` và `app/robots.ts`.

## 2. Cấu trúc mã nguồn

```
lib/site/company.ts   Thông tin pháp nhân dùng chung cho chân trang, trang liên hệ và schema
lib/site/content.ts    Toàn bộ chữ hiển thị của hai trang chủ (vi, en)
lib/site/faq.ts        12 câu hỏi, dùng chung cho phần hiển thị và khối FAQPage
lib/site/pages.ts      Nội dung bốn trang dịch vụ và hai trang tra cứu
lib/site/schema.ts     Sinh JSON-LD @graph (Organization, WebSite, WebPage, BreadcrumbList, Service, FAQPage)
lib/site/lookup.ts     Ẩn số đăng ký, tính tình trạng hiệu lực, thông báo theo mùa (dùng được ở client)
lib/site/records.ts    Truy vấn hồ sơ đã công bố cho API tra cứu (chỉ chạy trên server)
components/site/       Các khối giao diện dùng lại: header, footer, panel tra cứu, FAQ, banner liên hệ
```

Nguyên tắc: chữ hiển thị nằm trong `lib/site/*`, không viết rải trong JSX. Sửa nội dung ở một
chỗ thì trang, schema và thẻ meta cùng đổi theo.

## 3. Việc cần làm khi cập nhật nội dung

### Thêm hoặc sửa câu hỏi thường gặp

1. Sửa `FAQ_VI` (và `FAQ_EN` nếu có bản tiếng Anh) trong `lib/site/faq.ts`.
2. Giữ nguyên `id` để các trang con tham chiếu đúng câu hỏi.
3. Phần hiển thị và khối FAQPage tự động lấy cùng một nguồn, không cần chép lại.
4. Chạy `node --test tests/public-site.test.cjs` để xác nhận 12 câu hỏi vẫn khớp schema.

### Đổi thông tin doanh nghiệp

Sửa `lib/site/company.ts`. Chuỗi trong file này được dùng cho chân trang, trang liên hệ và
schema Organization, nên thông tin luôn trùng khớp từng chữ.

- `taxCode` đang để trống vì chưa có trong hồ sơ bàn giao. Khi có giấy phép kinh doanh, điền mã số
  thuế vào đây, chân trang và trang liên hệ sẽ tự hiển thị thêm dòng mã số thuế.
- Địa chỉ cần đối chiếu lại theo đơn vị hành chính sau sắp xếp năm 2025 (phường Tây Tựu, Hà Nội)
  trước khi đăng.

### Thêm trang dịch vụ mới

Thêm một mục vào `SERVICE_DETAILS` trong `lib/site/pages.ts`. Trang `/dich-vu/<slug>` và khối
Service trong schema được sinh tự động từ danh sách này.

## 4. Tra cứu công khai

- Giao diện: `components/site/LookupPanel.tsx` gọi `GET /api/public/lookup?q=...&type=FDA|GACC`.
- Dữ liệu: `lib/site/records.ts` chỉ lấy hồ sơ đã công bố (bỏ bản nháp), tìm theo số đăng ký, số
  hồ sơ, mã công khai, tên doanh nghiệp và mã số thuế của doanh nghiệp trong danh bạ.
- Kết quả chỉ trả về: tên doanh nghiệp, loại đăng ký, số đăng ký đã ẩn phần giữa, tình trạng,
  ngày hết hạn, ngày cập nhật. Không trả phí dịch vụ, số hợp đồng, tài liệu, người liên hệ,
  U.S. Agent hay DUNS.
- Tình trạng: `valid` khi còn hơn 90 ngày, `expiring` khi còn từ 0 đến 90 ngày, `expired` khi đã
  qua ngày hết hạn. Đổi ngưỡng tại `EXPIRING_SOON_DAYS` trong `lib/site/lookup.ts`.
- API khai báo `force-dynamic` và trả `Cache-Control: no-store` để khách quét lại thấy dữ liệu mới.

## 5. Quy tắc biên tập đã áp dụng

- Không dùng biểu tượng cảm xúc, mũi tên, dấu gạch dài, dấu chấm than liên tiếp.
- Không dùng các từ sáo rỗng (hành trình, khám phá, kiến tạo, bứt phá, vượt trội, đột phá, toàn diện,
  tối ưu hóa, nâng tầm, chìa khóa, trong thời đại số).
- Không cam kết tuyệt đối. Thời gian xử lý nêu dạng dự kiến kèm điều kiện hồ sơ đầy đủ.
- Gọi đúng tên thủ tục: "đăng ký cơ sở thực phẩm với FDA", "mã đăng ký GACC". Không dùng
  "chứng nhận FDA", "giấy phép FDA", "FDA phê duyệt".
- Xưng "Vexim Global" hoặc "chúng tôi", gọi người đọc là "Quý doanh nghiệp" hoặc "Quý khách".

`tests/public-site.test.cjs` kiểm tra tự động các quy tắc trên trên toàn bộ tệp nội dung.

## 6. Ghi chú kỹ thuật còn mở

- `potentialAction` trong schema trỏ tới `/tra-cuu?q=`, đường dẫn này đã hoạt động. Nếu đổi cơ chế
  tra cứu, cập nhật `lib/site/schema.ts`.
- `sameAs` hiện chỉ có `https://www.veximglobal.com`. Khi có Facebook, LinkedIn hoặc Zalo OA chính
  thức, thêm vào `sameAs` trong `lib/site/schema.ts` và cập nhật hồ sơ Google Business.
- Câu hỏi 11 về vị trí ghi mã GACC cần đối chiếu hướng dẫn ghi nhãn hiện hành của GACC trước khi đăng.
- Ngôn ngữ của thẻ `<html>` được đặt trong `app/layout.tsx` theo đường dẫn hiện tại (middleware gắn
  `x-pathname`), nên bản tiếng Việt trả `lang="vi"` và bản tiếng Anh trả `lang="en"` ngay từ HTML máy chủ.
