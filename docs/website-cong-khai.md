# Website công khai (trang chủ tra cứu mã)

Trang chủ là nơi khách và đối tác tra cứu mã FDA, GACC của doanh nghiệp mình, đồng thời là trang giới thiệu bốn dịch vụ của Vexim Global.

| Đường dẫn | Nội dung |
| --- | --- |
| `/` | Trang chủ tiếng Việt (nguồn chính, `hreflang="vi"`) |
| `/en` | Trang chủ tiếng Anh (`hreflang="en"`) |
| `/login` | Đăng nhập nội bộ, gắn `noindex, nofollow` và `nofollow` ở mọi liên kết trỏ tới |
| `/robots.txt`, `/sitemap.xml` | Sinh tự động, chặn `/dashboard`, `/login`, `/api/` |

## Sửa nội dung ở đâu

Toàn bộ chữ trên trang chủ nằm trong `lib/public-content.ts`, chia làm hai nhánh `vi` và `en`.
Phần hiển thị và phần schema JSON-LD dùng **cùng một nguồn**, nên câu hỏi và câu trả lời trong
`FAQPage` luôn trùng với mục Câu hỏi thường gặp trên trang.

Thành phần giao diện:

- `components/public/SiteHeader.tsx`: thanh trên, điều hướng, chuyển ngôn ngữ, menu mobile.
- `components/public/CodeLookup.tsx`: ô tra cứu, phân loại mã, kết quả, trạng thái hiệu lực.
- `components/public/QrScanner.tsx`: quét mã QR bằng camera (BarcodeDetector).
- `components/public/SiteSections.tsx`: mục Dịch vụ và Câu hỏi thường gặp.
- `components/public/SiteFooter.tsx`: chân trang.
- `components/public/JsonLd.tsx`: schema của trang chủ.
- `app/site.css`: toàn bộ giao diện website công khai (không ảnh hưởng dashboard).

## Tra cứu

`GET /api/public/lookup?type=FDA|GACC&q=<số đăng ký hoặc tên doanh nghiệp>`

- Tìm theo tên doanh nghiệp (bỏ dấu tiếng Việt, không phân biệt hoa thường) hoặc theo số đăng ký.
- Chỉ trả về hồ sơ **đã xuất bản**: tên doanh nghiệp, loại mã, tình trạng, hạn tiếp theo, mã công khai.
- Không trả phí dịch vụ, email, tài khoản cổng khách hàng.
- Tình trạng: còn hiệu lực, sắp hết hạn (còn 60 ngày trở xuống), hết hiệu lực.
- Tối đa 6 kết quả mỗi lần tra cứu, không cache.

Logic lọc nằm ở `lib/public-lookup.ts` để dùng chung với kiểm thử.

## Quy ước văn phong

Câu ngắn, mỗi câu một ý. Không dùng biểu tượng, mũi tên, gạch dài hay dấu chấm than. Gọi người đọc là
"bạn" ở câu kêu gọi và "Quý doanh nghiệp" ở phần thông tin. Dùng "đăng ký FDA", "mã đăng ký FDA";
không dùng "chứng nhận FDA", "giấy phép FDA", "giải pháp toàn diện", "nâng tầm".

`tests/home-page.test.cjs` kiểm tra các quy ước này cùng thứ tự tiêu đề, nội dung bốn dịch vụ,
bảy câu hỏi và schema. `tests/public-lookup.test.cjs` kiểm tra tra cứu và dữ liệu không bị lộ.
