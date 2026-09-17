# Hợp đồng dịch vụ & Kế toán thu chi

## 1. Hợp đồng dịch vụ (`/dashboard/dich-vu`)

- 2 loại: **Sale xuất khẩu** (`VXM-SALE-YYYY-NNNN`), **Vận hành Amazon** (`VXM-AMZ-YYYY-NNNN`).
- **Tự sinh khi chốt deal**: kéo thẻ vào "Chốt hợp đồng" → HĐ tạo sẵn với dữ liệu từ deal
  (công ty, liên hệ, SĐT, email, giá trị). Sale chỉ xác nhận **ngày bắt đầu + chu kỳ** trong popup.
- Chu kỳ **nhập tay 1–60 tháng** (gợi ý nhanh 3/6/12) — ngày hết hạn tự tính từ ngày bắt đầu.
- Tạo tay chỉ dành cho khách ngoài CRM. Hết hạn → **Gia hạn** (giữ mã HĐ, nối từ ngày hết hạn cũ).
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

- Chốt deal **FDA/GACC** → màn hình ăn mừng + banner + chuông **📁 Hồ sơ** dẫn sang tạo hồ sơ
  (điền sẵn công ty, email, giá trị deal). Tạo xong → tự hết nhắc.
- Chốt deal **Sale/Amazon** → HĐ **tự sinh sẵn**, popup ăn mừng chỉ hỏi ngày bắt đầu + chu kỳ.
  Banner trang deal chuyển thành "Xem hợp đồng". Chuông chỉ nhắc các deal cũ chưa có HĐ.

## 5. Triển khai Supabase

Chạy toàn bộ `supabase/schema.sql` trên Supabase rồi:

```sql
NOTIFY pgrst, 'reload schema';
```

3 bảng mới: `service_contracts`, `invoices`, `invoice_payments` (RLS service-role full như các bảng cũ).
