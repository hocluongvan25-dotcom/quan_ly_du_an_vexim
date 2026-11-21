# Cấu hình Email Zoho - contact@veximglobal.com

## 1. Tổng quan hệ thống email tự động

Hệ thống hiện tại đã được cấu hình để **gửi và nhận tự động** qua Zoho Mail với email `contact@veximglobal.com`.

### Luồng hoạt động:
1. **Khách quét QR** → vào trang `/verify/[code]` (giao diện B2B mobile-first)
2. **Khách bấm tư vấn** 2 dịch vụ:
   - Phòng Sale Xuất Khẩu Mỹ (veximtrade.com)
   - Vận Hành Amazon US (veximops.com)
3. **Form submit** → POST `/api/consultation`
4. **Dữ liệu đổ về 3 nơi đồng thời**:
   - **Database**: bảng `consultation_leads` (SQLite local + Supabase cloud)
   - **Email tức thì**: gửi về `contact@veximglobal.com` qua Zoho SMTP
   - **Dashboard**: `/dashboard/leads` để admin theo dõi, đổi trạng thái, gọi/Zalo

5. **Auto-reply** (nếu khách có nhập email): gửi email cảm ơn tự động từ `contact@veximglobal.com`

## 2. Cấu hình Zoho SMTP

### Bước 1: Tạo App Password trong Zoho

1. Đăng nhập https://mail.zoho.com với `contact@veximglobal.com`
2. Vào **My Account** → **Security** → **App Passwords**
3. Click **Generate New Password**
   - App Name: `Vexim Website`
4. Copy password dạng `xxxx xxxx xxxx xxxx` (bỏ dấu cách khi dùng)

> **Lưu ý**: Không dùng password đăng nhập thường, phải dùng App Password nếu bật 2FA. Nếu chưa bật 2FA, Zoho vẫn yêu cầu App Password cho SMTP.

### Bước 2: Cấu hình ENV

Thêm vào file `.env` (hoặc `.env.local`) và trên hosting (Vercel, v.v.):

```env
ZOHO_SMTP_HOST=smtp.zoho.com
ZOHO_SMTP_PORT=465
ZOHO_SMTP_USER=contact@veximglobal.com
ZOHO_SMTP_PASS=your-zoho-app-password-here
ZOHO_FROM_EMAIL=contact@veximglobal.com
ZOHO_FROM_NAME=Vexim Global
ZOHO_TO_EMAIL=contact@veximglobal.com
NEXT_PUBLIC_CONTACT_EMAIL=contact@veximglobal.com
```

- **Host**: 
  - `smtp.zoho.com` nếu tài khoản Zoho đăng ký ở US DC
  - `smtppro.zoho.com` nếu là tài khoản US với domain riêng (khuyên dùng)
  - `smtp.zoho.eu` nếu EU DC
  - `smtp.zoho.com.cn` nếu China
- **Port**: 
  - `465` SSL (khuyên dùng, `secure: true`)
  - `587` TLS (`secure: false`)
- **User**: chính là `contact@veximglobal.com`
- **Pass**: App Password vừa tạo

### Bước 3: Cấu hình DNS (để email không vào spam)

Vào nơi quản lý DNS của `veximglobal.com` (Cloudflare, Namecheap, v.v.):

#### SPF (bắt buộc)
Thêm TXT record:
```
Host: @
Value: v=spf1 include:zoho.com ~all
```

Nếu đã có SPF, thêm `include:zoho.com` vào.

#### DKIM (khuyên dùng, tăng uy tín)
1. Vào Zoho Mail Admin Panel: https://mailadmin.zoho.com
2. **Email Authentication** → **DKIM** → Chọn domain `veximglobal.com` → **Add Selector** → Generate
3. Zoho sẽ cho 1 TXT record dạng:
   ```
   Host: zmail._domainkey.veximglobal.com
   Value: v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ...
   ```
4. Thêm vào DNS, sau đó Verify trong Zoho Admin.

#### MX (nếu chưa có, để nhận email)
Nếu email `contact@veximglobal.com` chưa nhận được email, kiểm tra MX:
```
@  mx.zoho.com 10
@  mx2.zoho.com 20
@  mx3.zoho.com 50
```

### Bước 4: Test

1. Đăng nhập dashboard với admin `admin@veximglobal.com`
2. Truy cập `GET /api/email/test` để kiểm tra kết nối SMTP:
   - Nếu `verify.ok = true` → cấu hình đúng
   - Nếu `ok = false` và lỗi về password → kiểm tra App Password
3. Gửi test email: `POST /api/email/test` (admin only)
   - Sẽ gửi 1 email test về `contact@veximglobal.com`
4. Kiểm tra inbox `contact@veximglobal.com` trong https://mail.zoho.com

## 3. Form tư vấn đổ dữ liệu về đâu?

### 3.1. Database (chính)

**Bảng `consultation_leads`**:

| Field | Mô tả |
|-------|-------|
| `id` | ID tự tăng |
| `service_type` | `sales` (Phòng Sale Mỹ - veximtrade.com) hoặc `amazon` (Amazon US - veximops.com) |
| `name` | Họ tên / Tên nhà máy |
| `phone` | SĐT / Zalo (bắt buộc, min 9 số) |
| `email` | Email khách (optional, nếu có sẽ auto-reply) |
| `company_name` | Tên công ty từ chứng nhận đang xem |
| `certificate_no` | Số chứng nhận FDA/GACC |
| `public_code` | Mã public code của cert |
| `message` | Ghi chú thêm (optional) |
| `source_url` | URL trang verify khách đang xem |
| `ip` | IP khách |
| `status` | `new` → `contacted` → `converted` → `closed` |
| `created_at` | Thời gian tạo |

- **SQLite local**: `data/vexim.db` → bảng `consultation_leads`
- **Supabase cloud**: bảng `public.consultation_leads` (đã có trong `supabase/schema.sql`, cần chạy lại schema.sql trong Supabase SQL Editor + `NOTIFY pgrst, 'reload schema'`)

### 3.2. Email tức thì về contact@veximglobal.com

Mỗi khi có lead mới, hệ thống gửi email HTML đẹp về `contact@veximglobal.com` qua Zoho SMTP:

- **Subject**: `[Vexim Lead] Phòng Sale Xuất Khẩu Mỹ - Tên - SĐT`
- **Nội dung**: Tên, SĐT (có nút Gọi ngay + Chat Zalo), công ty, certificate, public code, source URL, IP, thời gian
- **Reply-To**: email khách nếu có

Nếu Zoho chưa cấu hình (thiếu `ZOHO_SMTP_PASS`), hệ thống chạy ở **mock mode**: log ra console, không fail, lead vẫn lưu DB.

### 3.3. Dashboard nội bộ

Truy cập `/dashboard/leads` (đăng nhập admin/specialist):

- **Stats**: Tổng leads, Sale Mỹ, Amazon, chưa liên hệ
- **Filter**: theo service_type (sales/amazon) và status
- **Bảng**: thời gian, dịch vụ, khách hàng, SĐT (click gọi), Zalo link, chứng nhận, nguồn, IP, đổi trạng thái
- **Action**: đổi status, reload

### 3.4. Mở rộng (optional, chưa implement nhưng đã chuẩn bị)

Bạn có thể dễ dàng thêm:

1. **Google Sheets**: Thêm webhook trong `app/api/consultation/route.ts` gọi Google Apps Script
   ```env
   GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/...
   ```

2. **Telegram**: Gửi thông báo về group Telegram
   ```env
   TELEGRAM_BOT_TOKEN=...
   TELEGRAM_CHAT_ID=...
   ```

3. **Forward tới veximtrade.com / veximops.com**: Thêm webhook POST tới 2 site kia để đồng bộ lead

4. **CRM**: HubSpot, GoHighLevel, v.v.

## 4. Nhận email tự động (inbound)

- **Nhận**: Zoho Mail tự nhận tất cả email gửi tới `contact@veximglobal.com` (cần MX đúng)
- **Gửi tự động**: Code đã gửi qua SMTP, khách sẽ thấy email từ `contact@veximglobal.com`
- **Auto-reply**: Nếu form có email, hệ thống tự gửi email cảm ơn từ `contact@veximglobal.com` với link tới veximtrade.com / veximops.com

Để nhận lead qua email trên điện thoại: cài **Zoho Mail app** (iOS/Android) đăng nhập `contact@veximglobal.com`, bật push notification.

## 5. Checklist triển khai

- [ ] Tạo App Password trong Zoho cho `contact@veximglobal.com`
- [ ] Set ENV `ZOHO_SMTP_*` trên local `.env.local` và trên Vercel/hosting
- [ ] Thêm SPF `v=spf1 include:zoho.com ~all` vào DNS
- [ ] Thêm DKIM từ Zoho Admin vào DNS và Verify
- [ ] Kiểm tra MX nếu chưa nhận được email
- [ ] Chạy `supabase/schema.sql` trong Supabase SQL Editor để tạo bảng `consultation_leads` + `NOTIFY pgrst, 'reload schema'`
- [ ] Test `GET /api/email/test` và `POST /api/email/test`
- [ ] Test form tư vấn ở `/verify/[code]` → kiểm tra DB `/dashboard/leads` và inbox `contact@veximglobal.com`
- [ ] Cài Zoho Mail app cho team để nhận lead tức thì

## 6. Liên hệ hỗ trợ

Nếu cần hỗ trợ cấu hình Zoho, liên hệ Zoho Support hoặc Vexim dev team. Log email sẽ hiện trong server logs nếu có lỗi SMTP.
