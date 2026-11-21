# Cấu hình email Zoho — thông báo FDA/GACC

Ứng dụng dùng Zoho SMTP để gửi email thông báo liên quan đến hồ sơ chứng nhận, như nhắc gia hạn và xác nhận gia hạn. Thư gửi đến doanh nghiệp lấy từ email trên hồ sơ hoặc Danh mục doanh nghiệp; hệ thống đồng gửi tới địa chỉ quản trị trong `ZOHO_TO_EMAIL`.

Ứng dụng chỉ gửi email SMTP; hộp thư đến được đọc và quản lý trực tiếp trong Zoho Mail, không được đồng bộ vào dashboard.

## 1. Cấu hình SMTP

Tạo App Password trong Zoho Mail: **My Account → Security → App Passwords → Generate New Password**. Không dùng mật khẩu đăng nhập thường.

Thiết lập các biến môi trường trong `.env.local` và môi trường deploy:

```env
ZOHO_SMTP_HOST=smtp.zoho.com
ZOHO_SMTP_PORT=465
ZOHO_SMTP_USER=contact@veximglobal.com
ZOHO_SMTP_PASS=your-zoho-app-password
ZOHO_FROM_EMAIL=contact@veximglobal.com
ZOHO_FROM_NAME=Vexim Global
ZOHO_TO_EMAIL=contact@veximglobal.com
```

- Dùng host Zoho phù hợp với trung tâm dữ liệu của tài khoản (`smtp.zoho.com`, `smtp.zoho.eu`, v.v.).
- Cổng `465` dùng SSL; `587` dùng TLS.
- `ZOHO_TO_EMAIL` là địa chỉ nhận bản sao nội bộ của email chứng nhận và thư test.

Để tăng khả năng gửi thư vào inbox, cấu hình SPF và DKIM theo hướng dẫn DNS của Zoho. Nếu cần nhận email tại hộp thư, cấu hình MX của domain riêng trong Zoho Mail Admin; thao tác nhận thư không thuộc ứng dụng này.

## 2. Kiểm tra kết nối

1. Đăng nhập bằng tài khoản Admin.
2. Gọi `GET /api/email/test` để xem cấu hình SMTP và trạng thái kết nối.
3. Gọi `POST /api/email/test` để gửi thư kiểm tra tới `ZOHO_TO_EMAIL`.
4. Kiểm tra inbox Zoho. Nếu chưa cấu hình `ZOHO_SMTP_PASS`, hệ thống trả trạng thái mock và chỉ ghi log thay vì gửi thật.

API kiểm tra email chỉ dành cho Admin. Các mẫu email chứng nhận nằm trong `lib/email.ts`; gửi nhắc hạn được điều phối bởi `lib/expiry-checker.ts`.

## 3. Checklist triển khai

- [ ] Tạo App Password Zoho và lưu an toàn trong secret/environment của môi trường deploy.
- [ ] Set `ZOHO_SMTP_*`, `ZOHO_FROM_*` và `ZOHO_TO_EMAIL`.
- [ ] Cấu hình SPF/DKIM (và MX nếu cần nhận thư trực tiếp trong Zoho).
- [ ] Test `GET /api/email/test` và `POST /api/email/test` bằng Admin.
- [ ] Kiểm tra log gửi email nhắc hạn trong môi trường thử nghiệm.
