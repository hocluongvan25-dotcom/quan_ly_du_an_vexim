# Báo giá dịch vụ — nhân viên chỉ cần nhập thông tin khách hàng

Màn hình `/dashboard/bao-gia` sinh ra để **không phải gõ lại báo giá từ đầu mỗi lần gửi khách**:
mẫu báo giá của từng dịch vụ (hạng mục, đơn giá, phạm vi công việc, hồ sơ cần cung cấp, điều khoản)
được dựng sẵn trong hệ thống. Nhân viên chọn dịch vụ → nhập thông tin công ty/người liên hệ → tải PDF.

## 1. Bốn mẫu báo giá có sẵn

| Mẫu (`template_key`) | Dịch vụ | Hạng mục chính | Hạng mục tùy chọn |
| --- | --- | --- | --- |
| `FDA` | Đăng ký FDA (Hoa Kỳ) | 3 | US Agent, mã DUNS, thêm nhóm sản phẩm/cơ sở, gia hạn 2 năm, rà soát nhãn 21 CFR |
| `GACC` | Đăng ký GACC / CIFER (Trung Quốc) | 3 | Thêm ngành hàng/cơ sở, cập nhật thông tin, hỗ trợ thanh tra, tập huấn |
| `SALE_EXPORT` | Sale xuất khẩu Mỹ | 2 (phí tháng × 3 + phí khởi tạo) | Catalogue, website tiếng Anh, company profile, hội chợ |
| `AMAZON_OPS` | Vận hành Amazon US | 2 (phí tháng × 3 + setup) | A+ Content, ảnh sản phẩm, PPC, FBA, Brand Registry |

> **⚠️ Giá trong mẫu hiện là giá mẫu để chạy thử quy trình** (xem `lib/quote-templates.ts`,
> hằng số ghi chú `QUOTE_PRICE_NOTE`). Khi có bảng giá chính thức, sửa số trong file đó là
> toàn hệ thống dùng giá mới; hoặc sửa trực tiếp trên một báo giá nháp rồi lưu — mỗi báo giá
> lưu **snapshot** hạng mục nên báo giá cũ không bị đổi theo.

## 2. Luồng làm việc

1. **Tạo**: `/dashboard/bao-gia/moi` — chọn 1 trong 4 dịch vụ, nhập công ty, người liên hệ, ngày báo giá,
   hiệu lực (mặc định 15 ngày, tối đa 180 ngày), chiết khấu %, VAT %.
2. **Chọn hạng mục tùy chọn**: tick các mục như US Agent / PPC / catalogue… Chúng in trong báo giá với ghi chú
   *“chưa tính vào tổng, áp dụng khi Quý khách chọn thêm”* — không làm phồng tổng tiền chào.
3. **Bản nháp**: báo giá luôn sinh ở trạng thái **Nháp**. Ở trạng thái này có thể sửa mọi thứ, kể cả đơn giá từng dòng.
4. **Gửi khách**: tải **PDF** hoặc bấm **Copy nội dung gửi khách** (đoạn nhắn Zalo/Email soạn sẵn: hạng mục,
   tổng tiền, bằng chữ, hạng mục tùy chọn, điều khoản thanh toán). Sau đó đánh dấu **Đã gửi khách**.
5. **Theo dõi phản hồi**: **Khách đồng ý** / **Khách từ chối**; quá ngày hiệu lực mà chưa phản hồi → tự hiển thị
   **Hết hiệu lực**.

### Quy tắc khóa (giữ đúng bản đã gửi khách)

- Báo giá **Nháp**: người lập hoặc Admin sửa/xóa tự do.
- Báo giá **đã gửi khách / đã phản hồi**: không sửa trực tiếp, không quay lại trạng thái Nháp. Cần chỉnh thì bấm
  **Nhân bản để sửa** → sinh báo giá nháp mới cùng nội dung (mã mới, ngày mới). Chỉ Admin được xóa.
- Cơ hội CRM liên kết vẫn giữ nguyên khi nhân bản để không mất dấu vết bán hàng.

## 3. Nội dung một báo giá

- **Bảng hạng mục**: STT, nội dung, ĐVT, số lượng, đơn giá, thành tiền + phần *Hạng mục tùy chọn* riêng.
- **Tổng cộng**: tạm tính → chiết khấu → VAT → tổng, kèm **số tiền bằng chữ** và tổng hạng mục tùy chọn.
- **Phạm vi công việc** (5 mục theo dịch vụ), **Hồ sơ Quý khách cần cung cấp** (5 mục), **Tiến độ thực hiện**,
  **Điều khoản thanh toán**, **Điều khoản & lưu ý chung**, **Vì sao chọn Vexim Global**.
- **Chữ ký 2 bên** + ngày lập (`Hà Nội, ngày … tháng … năm …`), tên/người ký lấy từ mẫu chứng từ thanh toán
  (`LƯƠNG VĂN HỌC — GIÁM ĐỐC`), thông tin pháp lý ở chân trang mọi trang.
- PDF dùng font Tinos đã bundle (đủ dấu tiếng Việt), khổ A4, tự ngắt trang và **lặp lại tiêu đề bảng** khi sang trang.

## 4. Điểm kết nối trong CRM

- Trang cơ hội (`/dashboard/crm/co-hoi/[id]`) có nút **Tạo báo giá** — điền sẵn dịch vụ theo pipeline
  (FDA/GACC/Sale XK/Amazon), tên công ty, người liên hệ, SĐT, email và gắn `opportunity_id`.
- Sidebar có mục **Báo Giá Dịch Vụ** cho cả Admin và nhân viên.

## 5. Triển khai Supabase

Chạy `supabase/schema.sql` (hoặc riêng `supabase/migrations/20260921_quotes.sql`) rồi:

```sql
NOTIFY pgrst, 'reload schema';
```

Bảng mới `quotes` (RLS + grant `service_role`/`postgres` như các bảng cũ; `items`, `scope`, `documents`, `terms`
lưu dạng `jsonb`). SQLite nội bộ tự tạo/cập nhật bảng khi `npm run dev` (kể cả nâng cấp DB cũ chưa có cột `documents`).

## 6. Kiểm thử

```bash
npm run test:quotes   # 13 test: mẫu, tính tiền, khóa bản đã gửi, API, PDF, preview, Supabase mock, migration DB cũ
npm run test:all      # chạy toàn bộ test trong tests/
```
