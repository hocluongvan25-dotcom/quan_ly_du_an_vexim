# Vexim Global — Quản lý hồ sơ FDA & GACC

Hệ thống nội bộ của **Công ty TNHH Vexim Global**: quản lý hồ sơ FDA / GACC, xác thực QR, thống kê doanh thu.

- FDA hiệu lực **2 năm**, GACC hiệu lực **5 năm**
- Vai trò Admin và Bộ phận chuyên môn
- Landing page quét QR **không hiển thị giá dịch vụ**
- Dữ liệu quản trị trên **Supabase** (PostgreSQL)
- Deploy **Vercel**

Font chữ: **Be Vietnam Pro** (hỗ trợ đầy đủ dấu tiếng Việt).

## 1. Supabase

1. Tạo project tại [supabase.com](https://supabase.com)
2. SQL Editor → dán và chạy `supabase/schema.sql`
3. Settings → API, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (chỉ dùng phía server, không đưa ra client)

Lần đăng nhập đầu tiên hệ thống tự tạo tài khoản demo nếu bảng `staff_users` trống.

## 2. Chạy local

```bash
cp .env.example .env.local
# điền 3 biến Supabase
npm install
npm run dev
```

Nếu **chưa** có biến Supabase, app tạm dùng SQLite `data/vexim.db` để xem giao diện.

## 3. Deploy Vercel

```bash
npx vercel
```

Trên Vercel → Project → Settings → Environment Variables, thêm đúng 4 biến trong `.env.example`.

Hoặc kết nối GitHub repo `hocluongvan25-dotcom/quan_ly_du_an_vexim` và Import trên vercel.com.

## Tài khoản demo

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Admin | `admin@veximglobal.com` | `Vexim@Admin2026` |
| Chuyên môn | `chuyenmon@veximglobal.com` | `Vexim@CM2026` |

## Liên hệ Vexim Global

Số 25/6/51 Ngọa Long, Tây Tựu, Bắc Từ Liêm, Hà Nội · 0373 685 634 · contact@veximglobal.com
