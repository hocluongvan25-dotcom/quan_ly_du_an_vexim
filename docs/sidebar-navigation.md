# Sidebar thu gọn

- Desktop (từ 768px): rộng 228px khi mở, 64px khi thu gọn. Nút « / » cạnh/dưới chữ Vexim Global đổi chế độ; phần nội dung tự giãn theo flex layout, không để khoảng trống cố định.
- Khi thu gọn vẫn giữ chữ thương hiệu, biểu tượng menu, trạng thái mục đang chọn, tài khoản và đăng xuất. Tên mục hiển thị khi rê chuột hoặc focus bằng bàn phím; Escape đóng chú thích. Chuyển ngôn ngữ vẫn có ở header.
- Trạng thái được lưu bằng cookie `vexim-sidebar` trong 1 năm, phạm vi `/dashboard`, `SameSite=Lax`, có `Secure` trên HTTPS. Server đọc trạng thái ngay khi render để tránh nháy sidebar lớn rồi nhỏ lúc tải lại. Không đọc/ghi preference qua localStorage; cookie bị chặn thì nút vẫn hoạt động trong phiên trang đang mở.
- Điện thoại luôn mở drawer đủ nhãn (268px, tự giới hạn trên màn hình nhỏ), không dùng trạng thái thu gọn desktop. Bấm mục menu, nút đóng, vùng bên ngoài hoặc Escape đều đóng drawer. Chặn cuộn nền, giữ focus trong drawer và trả focus khi đóng. Drawer dùng portal để không bị khung header/backdrop-filter giới hạn chiều cao. Resize về desktop sẽ đóng drawer.
- Menu có thêm mục **Báo Giá Dịch Vụ** (`/dashboard/bao-gia`) cho cả admin và specialist, đứng cạnh «Hợp Đồng Dịch Vụ»; trang con `/dashboard/bao-gia/[id]` vẫn đánh dấu đúng mục đang chọn.
- Quyền và đường dẫn chức năng không thay đổi; specialist không thấy menu chỉ dành cho admin. Mục đang chọn cũng được đánh dấu ở các trang con của dịch vụ/kế toán/doanh nghiệp.
- Không cần migration database hoặc thay đổi dữ liệu nghiệp vụ.

Kiểm tra tự động: `node --test tests/sidebar.test.cjs`; kiểm tra toàn bộ: `node --test tests/*.test.cjs`, `npx tsc --noEmit`, `npm run build`.

Đã kiểm tra trên trình duyệt: 320/390/768/1024/1280/1440px, rộng 228/64px và diện tích nội dung tăng 164px, hover/focus/keyboard, chuyển trang/tải lại/mở tab, cookie bị chặn, VI/EN, mobile drawer, resize và đăng xuất. Chưa triển khai lên môi trường production thật.
