# Chỉnh sửa hồ sơ, duyệt và QR

## Quy trình

- Nhân viên và admin đều được nhập/sửa thông tin, bấm **Lưu thay đổi**.
- Hồ sơ mới vẫn là nháp cho đến khi admin bấm **Duyệt và xuất bản**.
- Với hồ sơ đã xuất bản (kể cả hết hạn), bản sửa lưu vào `pending_changes`. Các trường công khai, giá dịch vụ/doanh thu và thời hạn đã duyệt chưa thay đổi.
- Form hiển thị bản sửa đã lưu, kèm nhãn chờ duyệt và bảng đối chiếu bản công khai → đề xuất. Danh sách hồ sơ cũng đánh dấu chờ duyệt.
- Chỉ admin được duyệt/xuất bản và gia hạn. API chặn cả action cũ `confirm` để không vượt quyền qua yêu cầu thủ công.
- Admin phải lưu nội dung đang sửa trước khi duyệt. Nếu phiên khác thay đổi hồ sơ, yêu cầu lưu/duyệt cũ nhận HTTP 409, cần tải lại để kiểm tra.
- Duyệt áp dụng bản sửa vào hồ sơ hiện tại và xóa `pending_changes`, giữ nguyên `public_code`, số chứng nhận và ngày xuất bản lần đầu.
- Mở lại hồ sơ chỉ đọc dữ liệu mới nhất (`no-store`). QR đã xuất bản tự hiện, không cần xuất bản lại. Nút “Đã xuất bản” bị vô hiệu hóa khi không có gì cần duyệt.
- Lưu không đổi hoặc xuất bản lại hồ sơ đã duyệt là no-op. Sửa tên/phạm vi/email không tính lại ngày hết hạn đã gia hạn; chỉ thay đổi dữ liệu thời hạn mới tính lại ngày hết hạn.
- Trang QR và public API không truyền bản sửa chờ duyệt, phí hoặc email doanh nghiệp cho khách hàng.

## Triển khai

### Supabase — chạy trước khi deploy mã mới

Chạy `supabase/migrations/20260920_certificate_approval.sql` trong SQL Editor của đúng project:

```sql
alter table public.certificates
  add column if not exists pending_changes jsonb;
notify pgrst, 'reload schema';
```

Migration thêm cột nullable, không sửa dữ liệu hồ sơ/QR hiện có. `supabase/schema.sql` cũng đã cập nhật cho cài mới.

SQLite tự bổ sung cột khi mở database. Không cần thao tác dữ liệu thủ công.

Không tự động sửa thời hạn lịch sử đã bị tính lại trước đây: cần đối chiếu hồ sơ thật và bản sao lưu nếu phát hiện sai.

## Kiểm thử

Node 22+:

```sh
npm ci
npm run test:certificates
npx tsc --noEmit
npm run build
```

Bộ test dùng SQLite tạm riêng và mock Supabase query client (không kết nối database production), bao phủ quyền API, nháp, bản sửa chờ duyệt, không lộ bản sửa qua public API/SSR allowlist, QR cố định, no-op, gia hạn, hồ sơ hết hạn, GACC và xung đột phiên.

Kiểm tra thủ công sau deploy:

1. Nhân viên mở hồ sơ đã xuất bản: QR tự hiện; không có nút duyệt/gia hạn.
2. Sửa phạm vi hoặc tên doanh nghiệp, lưu; tải lại vẫn thấy bản sửa chờ duyệt và cùng QR.
3. Mở QR ẩn danh: vẫn là thông tin đã duyệt cũ.
4. Admin mở hồ sơ, xem đối chiếu và duyệt; QR cũ hiển thị thông tin mới.
5. F5, rời trang rồi quay lại: QR vẫn hiện, không cần thao tác xuất bản.
6. Hồ sơ có gia hạn: sửa email, lưu và duyệt; ngày hết hạn gia hạn không đổi.
7. Hai phiên cùng mở: một phiên lưu trước, phiên còn lại duyệt bản cũ phải nhận thông báo tải lại.

Giới hạn kiểm tra trong sandbox: không truy cập được tên miền production; tải Chromium cũng bị lỗi mạng nên chưa chạy kiểm thử trình duyệt tự động. Đã kiểm tra HTTP thực trên Next server local, gồm đăng nhập, quyền sửa/duyệt, lưu trạng thái và chống lộ bản chờ duyệt trong HTML trang QR. Cần xác nhận lại hồ sơ số 5 trên production sau migration và deploy.
