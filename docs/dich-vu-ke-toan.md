# Kế toán — hóa đơn chứng nhận và thu chi

Hóa đơn và các đợt thu được quản lý trong khu vực **Kế toán**. Trang `/dashboard/ho-so/[id]` chỉ lưu và cập nhật hồ sơ chứng nhận; không tạo, sửa hay thu tiền hóa đơn tại đó.

## 1. Lập và quản lý hóa đơn

- Chỉ Admin/kế toán được xem và thao tác hóa đơn.
- Vào `/dashboard/ke-toan/hoa-don/moi`, chọn hồ sơ FDA/GACC làm chứng từ gốc, sau đó lập hóa đơn cho từng đợt thu.
- Danh sách tập trung tại `/dashboard/ke-toan/hoa-don`; từng hóa đơn có trang chi tiết và đường dẫn về khu vực quản lý hóa đơn của hồ sơ tương ứng.
- Mỗi đợt thu là một hóa đơn (`VXM-INV-YYYY-NNNN`). Mỗi hóa đơn chỉ tham chiếu một hồ sơ chứng nhận (`ref_type = certificate`).
- Nhập số tiền chưa VAT và VAT % (mặc định 8%); hệ thống tự tính tiền VAT và tổng.
- Ghi nhận nhiều lần thu cho mỗi hóa đơn (ngày, hình thức, mã giao dịch, ghi chú).
- Trạng thái được suy ra từ khoản đã thu và hạn thanh toán: Đã xuất, Sắp đến hạn, Quá hạn, Thu một phần, Đã thu đủ hoặc Đã hủy.
- Khóa số tiền sau lần thu đầu tiên; chỉ được sửa nội dung/hạn/ghi chú. Hủy hoặc xóa theo các điều kiện hiện có.
- Có thể tạo/in giấy đề nghị thanh toán A4 từ trang hóa đơn; giấy đề nghị không thay thế hóa đơn điện tử thuế.

## 2. Tổng quan kế toán (`/dashboard/ke-toan`, chỉ Admin)

- KPI: tổng đã xuất hóa đơn / đã thu / còn phải thu / quá hạn.
- Hai danh sách: quá hạn và đến hạn trong 7 ngày.
- Biểu đồ dòng tiền 12 tháng: đã xuất và đã thu.
- `/dashboard/ke-toan/hoa-don`: tra cứu mọi hóa đơn, lọc theo trạng thái và lập hóa đơn mới.

## 3. Nhắc việc liên thông CRM

- Cơ hội FDA/GACC đã tiếp nhận và chốt có thể liên kết với hồ sơ chứng nhận; hoàn tất hồ sơ thì nhắc việc tương ứng được đóng.
- Hóa đơn và thông báo đến hạn được theo dõi trong khu vực Kế toán/chuông thông báo, độc lập với trang lưu hồ sơ.

## 4. Triển khai Supabase

Chạy `supabase/schema.sql` trên Supabase. Với cơ sở dữ liệu đã chạy trước khi loại bỏ hóa đơn hợp đồng dịch vụ, áp dụng migration `supabase/migrations/20261121_remove_sale_amazon.sql` theo kế hoạch triển khai đã kiểm tra; migration xóa dữ liệu hóa đơn dịch vụ cũ trước khi giới hạn `invoices.ref_type` còn `certificate`.

Các bảng kế toán đang dùng: `invoices`, `invoice_payments`. SQLite tự di trú dữ liệu cũ khi khởi động ứng dụng.
