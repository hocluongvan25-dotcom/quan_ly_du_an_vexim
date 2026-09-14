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

## 4. Troubleshooting

### Lỗi PGRST205: Could not find the table 'public.staff_users' in the schema cache

**Nguyên nhân:** Bảng `staff_users` / `certificates` chưa được tạo trong Supabase, hoặc PostgREST schema cache chưa reload sau khi tạo bảng.

**Cách fix:**

1. Vào **Supabase Dashboard** → chọn project → **SQL Editor** → **New query**
2. Copy toàn bộ nội dung file `supabase/schema.sql` và chạy (Run)
3. Sau khi chạy xong, chạy thêm lệnh:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```
   Hoặc:
   ```sql
   SELECT pg_notify('pgrst', 'reload schema');
   ```
4. Đợi 5-10 giây cho cache reload
5. Kiểm tra lại bằng cách vào **Table Editor** xem đã có 2 bảng `staff_users` và `certificates` chưa
6. Test API health: truy cập `/api/health` trên website của bạn, phải trả về `status: ok`

**Kiểm tra biến môi trường trên Vercel:**

- `NEXT_PUBLIC_SUPABASE_URL` phải là URL dạng `https://xxxx.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` là anon key
- `SUPABASE_SERVICE_ROLE_KEY` là service_role key (quan trọng, phải có để bypass RLS)
- Sau khi sửa biến môi trường, nhớ **Redeploy** lại

**Nếu vẫn lỗi:**

- Vào Supabase → Settings → API → kiểm tra **Exposed schemas** có chứa `public` không
- Vào Database → Roles → đảm bảo `service_role` có quyền
- Thử tắt RLS tạm thời để test: `ALTER TABLE public.staff_users DISABLE ROW LEVEL SECURITY;`

### Debug nhanh

Truy cập endpoint `/api/health` sẽ cho biết:
- Supabase có được cấu hình không
- Bảng có tồn tại không
- Số lượng bản ghi hiện tại

## Tài khoản demo

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Admin | `admin@veximglobal.com` | `Vexim@Admin2026` |
| Chuyên môn | `chuyenmon@veximglobal.com` | `Vexim@CM2026` |

## Liên hệ Vexim Global

Số 25/6/51 Ngọa Long, Tây Tựu, Bắc Từ Liêm, Hà Nội · 0373 685 634 · contact@veximglobal.com
