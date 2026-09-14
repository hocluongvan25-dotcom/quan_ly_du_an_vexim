# Vexim Global — Quản lý hồ sơ FDA & GACC

Hệ thống nội bộ của **Công ty TNHH Vexim Global** để quản lý hồ sơ đăng ký FDA / GACC, theo dõi hiệu lực, xuất bản mã QR xác thực và thống kê doanh thu.

## Tính năng

- **FDA** hiệu lực **2 năm**, gia hạn 1 chu kỳ mỗi lần
- **GACC** hiệu lực **5 năm**, gia hạn 1 chu kỳ mỗi lần
- Vai trò **Admin** (điều hành, doanh thu, người dùng) và **Bộ phận chuyên môn** (điền hồ sơ sau đăng ký)
- Trường hồ sơ: Certificate No, Standards, Mã số, Giá dịch vụ (nội bộ), Tên công ty, Scope, ngày đăng ký / hết hạn, số ngày còn lại, Certificate validity
- Nhấn **Xác nhận hiệu lực** → biểu tượng **VALID** xanh và đồng hồ đếm từ ngày hết hạn về ngày đăng ký
- **Xuất bản** → lưu, tính thời hạn, cộng doanh thu, tạo QR đẹp để in lên chứng chỉ
- Landing page quét QR tối ưu mobile, có logo / địa chỉ / hotline Vexim, **không hiển thị giá dịch vụ**
- Thống kê doanh thu theo **tháng / quý / năm**, tách FDA và GACC

## Chạy local

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`

## Tài khoản demo

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Admin | `admin@veximglobal.com` | `Vexim@Admin2026` |
| Chuyên môn | `chuyenmon@veximglobal.com` | `Vexim@CM2026` |

## Liên hệ Vexim Global

- Địa chỉ: Số 25/6/51 Ngọa Long, Tây Tựu, Bắc Từ Liêm, Hà Nội
- Hotline: 0373 685 634
- Email: contact@veximglobal.com
- Website: https://www.veximglobal.com
