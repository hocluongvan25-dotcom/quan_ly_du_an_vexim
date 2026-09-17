# Hợp đồng dịch vụ & Kế toán thu chi

## 1. Hợp đồng dịch vụ (`/dashboard/dich-vu`)

- 2 loại: **Sale xuất khẩu** (`VXM-SALE-YYYY-NNNN`), **Vận hành Amazon** (`VXM-AMZ-YYYY-NNNN`).
- Chu kỳ **3 / 6 / 12 tháng** — ngày hết hạn tự tính từ ngày bắt đầu.
- Tạo mới = hiệu lực ngay. Hết hạn → bấm **Gia hạn** (giữ mã HĐ, nối từ ngày hết hạn cũ, đếm số lần gia hạn).
- Chấm dứt sớm / kích hoạt lại bằng 1 nút. Xóa chỉ khi chưa có hóa đơn nào.

## 2. Hóa đơn & thu tiền (chỉ Admin/kế toán)

- Nằm trong trang chi tiết **Hồ sơ FDA/GACC** và **Hợp đồng dịch vụ**: mỗi **đợt thu = 1 hóa đơn** (`VXM-INV-YYYY-NNNN`).
- Nhập số tiền **chưa VAT** + **VAT %** (mặc định **8%**) → hệ thống tự tính tiền VAT & tổng.
- Mỗi hóa đơn ghi được **nhiều lần thu** (ngày, hình thức, mã giao dịch, ghi chú).
- Trạng thái tự suy ra: Đã xuất → Sắp đến hạn (≤7 ngày) → Quá hạn / Thu một phần / Đã thu đủ.
- **Khóa số tiền** sau khi đã thu đồng đầu tiên (chỉ sửa nội dung/hạn/ghi chú). Hủy/xóa chỉ khi chưa thu.
- Nút **In** ra hóa đơn A4 (có số tiền bằng chữ) để gửi khách / lưu PDF.

## 3. Tổng quan kế toán (`/dashboard/ke-toan`, chỉ Admin)

- KPI: tổng đã xuất HĐ / đã thu / còn phải thu / quá hạn.
- 2 bảng: **quá hạn** và **đến hạn trong 7 ngày** (bấm vào xem chi tiết).
- Biểu đồ dòng tiền **12 tháng**: đã xuất vs đã thu.
- `/dashboard/ke-toan/hoa-don`: tra cứu mọi hóa đơn, lọc theo trạng thái.

## 4. Nhắc việc liên thông CRM

- Chốt deal **cả 4 tuyến** (FDA / GACC / Sale XK / Amazon) → màn hình ăn mừng + banner trang deal + chuông **📁 Hồ sơ** đều dẫn sang tạo hồ sơ/hợp đồng (điền sẵn công ty, email, giá trị deal).
- Tạo xong hồ sơ/hợp đồng cùng công ty + cùng tuyến → tự hết nhắc.

## 5. Triển khai Supabase

Chạy toàn bộ `supabase/schema.sql` trên Supabase rồi:

```sql
NOTIFY pgrst, 'reload schema';
```

3 bảng mới: `service_contracts`, `invoices`, `invoice_payments` (RLS service-role full như các bảng cũ).
