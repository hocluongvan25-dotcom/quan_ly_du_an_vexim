# Ngôn ngữ trang xác minh QR

Trang `/verify/[code]` hỗ trợ giao diện Việt–Anh, giữ nguyên bố cục, dữ liệu và đường dẫn QR.

## Thứ tự chọn ngôn ngữ

1. `?lang=vi` hoặc `?lang=en` trong link luôn được ưu tiên.
2. Lựa chọn trước đó trên trang xác minh, lưu bằng cookie `vexim-verify-locale` (path `/verify`, thời hạn 1 năm).
3. Ngôn ngữ chính trong `Accept-Language` của trình duyệt: tiếng Việt → VI, còn lại → EN.
4. Không có thông tin hợp lệ → EN.

Ngôn ngữ được chọn ngay khi server render, tránh chớp tiếng Việt trước khi hiện tiếng Anh và tránh lệch nội dung hydration. Không dùng IP/vị trí địa lý. Cookie riêng, không thay đổi ngôn ngữ dashboard.

## Sử dụng

- Bấm **VI | EN** ở phần đầu trang. Giữ nguyên vị trí cuộn và các query parameter khác.
- **Chia sẻ kết quả / Share result** luôn thêm ngôn ngữ đang xem vào link.
- Muốn gửi đối tác bản tiếng Anh: `/verify/<mã-QR-thực-tế>?lang=en`.
- Không cần tạo lại mã QR hoặc in lại chứng nhận. Chuyển ngôn ngữ không ghi dữ liệu hồ sơ, không duyệt/xuất bản lại.
- Nếu trình duyệt chặn lưu cookie, chuyển ngôn ngữ và link chỉ định ngôn ngữ vẫn hoạt động; chỉ không lưu được sở thích cho các link khác.

## Phạm vi dịch

Nhãn bảng, trạng thái, thông báo, nút, phần dịch vụ và form tư vấn được dịch sẵn. Các mã định danh, tên doanh nghiệp, US Agent và phạm vi đăng ký lấy nguyên văn từ hồ sơ đã duyệt, không tự dịch hay tạo thêm dữ liệu. Bản tiếng Anh hiển thị ngày đăng ký/hết hạn dạng `20 Sep 2026` để tránh nhầm ngày/tháng; thời điểm tra cứu vẫn theo ICT.

Không thay đổi quy tắc hiệu lực, cấu trúc bảng, màu sắc hoặc quyền truy cập. Không cần SQL migration.

## Kiểm thử

- `npm run test:verification`: chọn ngôn ngữ, link chia sẻ, cấu trúc bảng giống nhau ở cả hai ngôn ngữ, bảo toàn dữ liệu, trạng thái và thông báo.
- `npx tsc --noEmit` và `npm run build`.
- Đã kiểm tra trình duyệt local với VI/EN/FR, link chỉ định ngôn ngữ, lưu lựa chọn/tải lại, chặn cookie, copy/share, refresh, FDA/GACC, trạng thái hết hạn/chưa xác nhận, form tư vấn (mock POST) và màn hình 320–1280px. Không thao tác database production.
