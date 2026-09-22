# Báo giá dịch vụ — nhân viên chỉ cần nhập thông tin khách hàng

Màn hình `/dashboard/bao-gia` sinh ra để **không phải gõ lại báo giá từ đầu mỗi lần gửi khách**:
mẫu báo giá của từng dịch vụ (hạng mục, đơn giá, phạm vi công việc, hồ sơ cần cung cấp, điều khoản)
được dựng sẵn trong hệ thống. Nhân viên chọn dịch vụ → nhập thông tin công ty/người liên hệ → tải PDF.

**Giá dịch vụ nằm ở màn hình `/dashboard/bao-gia/bang-gia` (Bảng giá dịch vụ, chỉ Admin)** — sửa ở đó là
mọi báo giá tạo mới dùng giá mới ngay, không cần sửa code, không cần deploy.

## 1. Bốn mẫu báo giá có sẵn

| Mẫu (`template_key`) | Dịch vụ | Hạng mục chính | Hạng mục tùy chọn |
| --- | --- | --- | --- |
| `FDA` | Đăng ký FDA (Hoa Kỳ) | 3 | US Agent, mã DUNS, thêm nhóm sản phẩm/cơ sở, gia hạn 2 năm, rà soát nhãn 21 CFR |
| `GACC` | Đăng ký GACC / CIFER (Trung Quốc) | 3 | Thêm ngành hàng/cơ sở, cập nhật thông tin, hỗ trợ thanh tra, tập huấn |
| `SALE_EXPORT` | Sale xuất khẩu Mỹ | 2 (phí tháng × 3 + phí khởi tạo) | Catalogue, website tiếng Anh, company profile, hội chợ |
| `AMAZON_OPS` | Vận hành Amazon US | 2 (phí tháng × 3 + setup) | A+ Content, ảnh sản phẩm, PPC, FBA, Brand Registry |

> **⚠️ Giá trong mẫu (file `lib/quote-templates.ts`) chỉ là giá mẫu để chạy thử quy trình.**
> Giá chính thức nhập tại **Bảng giá dịch vụ** (`/dashboard/bao-gia/bang-gia`) — giá trong DB luôn
> đè giá trong file. Mỗi báo giá lưu **snapshot** hạng mục/đơn giá nên báo giá cũ không bị đổi theo.

## 1b. Bảng giá dịch vụ — chỗ duy nhất để chỉnh giá (`/dashboard/bao-gia/bang-gia`)

- **Ai sửa được:** chỉ **Admin** (`role = admin`). Nhân viên vẫn *xem* được bảng giá để biết giá hiện hành
  (API `GET` cho mọi người đã đăng nhập, `PUT`/`DELETE` chặn 403 với non-admin).
- **Sửa được gì:** tên dịch vụ, tên ngắn, mô tả, tiêu đề báo giá, **số ngày hiệu lực**, **VAT mặc định**,
  **từng hạng mục chính** (tên, đơn vị tính, số lượng gợi ý, đơn giá, ghi chú) — thêm/xóa tùy ý,
  **từng hạng mục tùy chọn** (mã, nhóm, SL, ĐVT, đơn giá, ghi chú), và nội dung in kèm
  (phạm vi công việc, hồ sơ khách cần cung cấp, điều khoản & lưu ý, tiến độ, điều khoản thanh toán).
- **Cột phải tự tính ngay**: thành tiền từng dòng, tạm tính, VAT và **tổng của 1 báo giá chuẩn** theo giá đang sửa.
- **Lưu / khôi phục**: nút *Lưu bảng giá* ghi vào bảng `quote_templates` (SQLite nội bộ hoặc Supabase);
  nút *Trả về giá mặc định* xóa dòng giá riêng để dùng lại giá trong file.
- **Ảnh hưởng:** chỉ báo giá **tạo mới** lấy giá mới. Báo giá đã lập là ảnh chụp (snapshot) — PDF đã gửi khách
  không bao giờ đổi số.
- Cùng bảng giá này cũng dùng cho ô chọn dịch vụ ở trang chi tiết báo giá khi sửa **bản nháp**
  (nhân viên được phép chỉnh số lượng/đơn giá từng dòng của bản nháp).

## 2. Luồng làm việc

1. **Tạo**: `/dashboard/bao-gia/moi` — **2 bước** trên một màn hình, có nút **Tiếp tục** ngay dưới danh sách hạng mục:
   **(1) Hạng mục & đơn giá** → **(2) Thông tin khách hàng & điều kiện**.
   Bước 1 chọn 1 trong 4 dịch vụ; hệ thống đổ sẵn hạng mục + đơn giá **theo bảng giá hiện hành**.
   Bấm Tiếp tục chỉ chạy khi hạng mục đã có nội dung (báo lỗi ngay nếu còn dòng trống hoặc thiếu hạng mục chính);
   có thể quay lại bước 1 bất cứ lúc nào, dữ liệu đã nhập không mất.
1b. **Tự mapping thông tin công ty**: ở bước 2, gõ tên công ty **đã có trong Danh mục doanh nghiệp** là hệ thống tự điền
   địa chỉ, mã số thuế, người liên hệ, số điện thoại, email (có gợi ý ngay khi gõ; bấm vào gợi ý để lấy đủ dữ liệu).
   Công ty chưa có trong danh mục thì nhập tay — dữ liệu đã mapping **không bị xoá** khi sửa tên.
   Điều kiện báo giá (ngày, hiệu lực, chiết khấu %, VAT %) nằm chung bước 2 cho gọn.
1c. **Chỉ gợi ý doanh nghiệp chưa đăng ký dịch vụ đang báo giá**: báo giá **FDA** thì danh mục đã ẩn doanh nghiệp
   đã có chứng nhận FDA (vẫn hiện doanh nghiệp mới chỉ có GACC để bán chéo dịch vụ), và ngược lại với **GACC**.
   Doanh nghiệp đã đăng ký đúng dịch vụ đó bị **ẩn hoàn toàn**: không xuất hiện trong gợi ý *và* gõ đúng tên cũng
   không tự điền — tránh báo giá trùng cho khách đã đăng ký. Dòng dưới ô tên công ty ghi rõ
   *“Đã ẩn N doanh nghiệp đã đăng ký FDA”*; mỗi gợi ý còn ghi doanh nghiệp đã có dịch vụ nào
   (ví dụ *“Chưa đăng ký FDA (đã có: GACC)”*). Báo giá **Sale xuất khẩu Mỹ** và **Vận hành Amazon US** chưa gắn chứng
   nhận nên vẫn hiện đầy đủ danh mục. Đổi dịch vụ ở bước 1 thì bộ lọc áp dụng lại ngay.
2. **Tự động tính toán (thấy ngay khi nhập)**: mọi ô *số lượng / đơn giá / chiết khấu / VAT* đều được tính lại
   tức thì — thành tiền từng dòng ở ngay cạnh dòng đó, và cột **Tổng kết tự tính** bên phải hiển thị
   tạm tính → chiết khấu → VAT → **TỔNG CỘNG** kèm *bằng chữ*, cập nhật theo từng phím gõ.
   Số tiền vẫn được **server tính lại lần nữa khi lưu** (client không thể gửi tổng sai).
2b. **Thêm mục khác**: nút *Thêm hạng mục khác* cho phép thêm dòng tự do ngay trong báo giá (dịch vụ riêng lẻ,
   phí phát sinh…), sửa/xóa dòng, và nút *Nạp lại giá chuẩn của mẫu* để quay về giá trong bảng giá.
2c. **Chọn hạng mục tùy chọn**: tick các mục như US Agent / PPC / catalogue… Chúng in trong báo giá với ghi chú
   *“chưa tính vào tổng, áp dụng khi Quý khách chọn thêm”* — không làm phồng tổng tiền chào. Bỏ tick để in ở
   khối riêng, hoặc sửa để đưa thành hạng mục chính nếu khách chốt.
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

### Nhận diện trên báo giá (navy + vàng đồng)

- **Xanh navy** là màu chủ đạo: dải đầu trang và chân trang, tiêu đề mục, khối **TỔNG CỘNG**, bảng hạng mục.
- **Vàng đồng** chỉ dùng làm điểm nhấn sang trọng: đường kẻ dưới dải navy, gạch đầu dòng, vạch nhấn dải thông tin,
  số tiền tổng, đường kẻ chân trang và gạch dưới tên người ký.
- **Logo chỉ có chữ, không kèm slogan**: file `assets/quote/logo-wordmark-white.png` (bản trắng dùng trên nền navy)
  và `assets/quote/logo-wordmark.png` (bản mực dùng trên nền sáng). Bản xem trước trên màn hình dùng
  `public/quote/logo-wordmark-white.png`. Muốn đổi logo: thay 3 file PNG này (nền trong suốt, cắt sát chữ).
- Bảng hạng mục dùng dòng kẻ chẵn màu navy rất nhạt; dòng **HẠNG MỤC TÙY CHỌN** có nền kem + vạch vàng.
- **Khối thông tin thanh toán** (đơn vị thụ hưởng · số tài khoản · ngân hàng, lấy từ `lib/payment-request.ts`) chia 3 cột
  theo tỉ lệ **52% · 20% · 28%** (`PAYMENT_COL_RATIOS`) và chỉ in khi trang cuối còn đủ chỗ, để chữ ký 2 bên không bị đẩy
  sang trang mới.
- **Chữ ký 2 bên canh theo cột**: cột *ĐẠI DIỆN KHÁCH HÀNG* kết thúc ở mốc cột “Số tài khoản”, còn cột
  *ĐẠI DIỆN VEXIM GLOBAL* (chức danh **GIÁM ĐỐC** + tên **LƯƠNG VĂN HỌC**) bắt đầu đúng mốc cột **NGÂN HÀNG** và
  gạch ký kéo dài ra tận lề ngoài của trang, thẳng hàng với dải thông tin thanh toán phía trên.
- **Khối chữ ký cách nội dung phía trên đúng 3 dòng** (`SIGNATURE_TOP_GAP = 3 × 13.5pt`) để có chỗ ký và đóng dấu;
  nếu thêm khoảng cách mà trang cuối không còn đủ chỗ cho dải thanh toán + chữ ký thì dải thanh toán tự ẩn để
  chữ ký không bị đẩy sang trang mới. Bản xem trước trên màn hình dùng cùng khoảng cách đó (`mt-[4.6rem]`).
- Màu được khai báo một chỗ trong `lib/quote-pdf.ts` (`NAVY`, `GOLD`, `NAVY_TINT`, `IVORY`, `GOLD_LIGHT`…).
- PDF dùng font Tinos đã bundle (đủ dấu tiếng Việt), khổ A4, tự ngắt trang và **lặp lại tiêu đề bảng** khi sang trang.

## 4. Điểm kết nối trong CRM

- Trang cơ hội (`/dashboard/crm/co-hoi/[id]`) có nút **Tạo báo giá** — điền sẵn dịch vụ theo pipeline
  (FDA/GACC/Sale XK/Amazon), tên công ty, người liên hệ, SĐT, email và gắn `opportunity_id`.
- Sidebar có mục **Báo Giá Dịch Vụ** cho cả Admin và nhân viên, và mục **Bảng Giá Dịch Vụ** (chỉ Admin) để sửa giá.
- Nút **⚙️ Bảng giá dịch vụ** ở đầu danh sách báo giá và ở màn hình tạo báo giá.

## 5. Triển khai Supabase

Chạy `supabase/schema.sql` (hoặc riêng `supabase/migrations/20260921_quotes.sql`) rồi:

```sql
NOTIFY pgrst, 'reload schema';
```

Hai bảng mới:

- `quotes` — `items`, `scope`, `documents`, `terms` lưu dạng `jsonb`.
- `quote_templates` — bảng giá dịch vụ do Admin chỉnh trong app (`payload jsonb`, `updated_by`, `updated_at`).
  Dòng nào chưa có ⇒ dùng giá mặc định trong `lib/quote-templates.ts`; payload hỏng bị bỏ qua và ghi log.

Cả hai đều bật RLS + grant `service_role`/`postgres` như các bảng cũ. SQLite nội bộ tự tạo/cập nhật bảng khi
`npm run dev` (kể cả nâng cấp DB cũ chưa có cột `documents`).

Chạy migration riêng cho bảng giá nếu DB đã có dữ liệu: `supabase/migrations/20260922_price_book.sql` (chạy lại nhiều lần vẫn an toàn).

## 6. Kiểm thử

```bash
npm run test:quotes     # 17 test: mẫu, tính tiền, bảng giá, khóa bản đã gửi, API, PDF, preview, Supabase mock, migration DB cũ
npm run test:quote-ui   # 1 test giao diện (jsdom): 2 bước + nút Tiếp tục + tự mapping công ty + tính tiền ngay
npm run test:all      # chạy toàn bộ test trong tests/
```

Trong đó 3 test của **bảng giá dịch vụ** kiểm tra: non-admin bị chặn 403 khi PUT, Admin sửa giá + thêm hạng mục
mới thì báo giá tạo sau đó dùng giá mới, **báo giá cũ giữ nguyên số cũ**, xóa dòng giá riêng thì quay về giá mặc định,
dữ liệu hỏng trong DB bị bỏ qua, và các trường hợp sai (thiếu tên, giá âm, quá số ngày hiệu lực, VAT sai, mã tùy chọn sai) trả 400.

`tests/quote-create-ui.test.cjs` dựng giao diện thật bằng jsdom và kiểm tra: nút **Tiếp tục** ở dưới danh sách hạng mục,
còn đúng 2 bước, tự mapping thông tin công ty, **bộ lọc doanh nghiệp đã đăng ký theo từng dịch vụ** (ẩn cả gợi ý lẫn tự
điền, vẫn cho bán chéo dịch vụ khác), và tiền tự tính lại ngay khi sửa số lượng/đơn giá/chiết khấu/VAT.
