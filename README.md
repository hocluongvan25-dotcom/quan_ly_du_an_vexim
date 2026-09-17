# Vexim Global — VEXIM CRM & Quản lý hồ sơ FDA / GACC

Hệ thống nội bộ của **Công ty TNHH Vexim Global**, gồm hai khối gắn với nhau:

1. **VEXIM CRM** — sales operation: `lead → opportunity → customer`, pipeline doanh thu, theo dõi
   trách nhiệm từng cơ hội.
2. **Quản lý hồ sơ FDA / GACC** — thời hạn chứng chỉ, QR xác thực, thống kê doanh thu.

Nguyên tắc thiết kế của CRM:

> CRM không phải công cụ nhập báo cáo cho quản lý. CRM là hệ thống vận hành để đội sales tạo doanh thu.

- FDA hiệu lực **2 năm**, GACC hiệu lực **5 năm**
- Landing page quét QR **không hiển thị giá dịch vụ**
- Dữ liệu trên **Supabase** (PostgreSQL) hoặc **SQLite** khi chạy local không có Supabase
- Deploy **Vercel**, font **Be Vietnam Pro**

---

## 1. Vai trò & phân quyền

| Vai trò | Mã | Trách nhiệm | Phạm vi dữ liệu |
| --- | --- | --- | --- |
| Founder / Admin | `admin` | Xem toàn bộ dữ liệu, dashboard, pipeline, hiệu suất team/member. Không quản lý task hằng ngày. | Toàn công ty |
| AE (Sales Leader) | `ae` | **Pipeline Owner**: xem lead của team, phân công lead, quản lý opportunity, review hoạt động SR/LR, kiểm tra follow-up | Team của mình |
| SR (Sales Research) | `sr` | Research doanh nghiệp, qualification, bổ sung dữ liệu, viết research note | Việc của mình + lead chưa ai nhận (được research chéo trong team) |
| LR (Lead Research) | `lr` | Tạo nguồn lead, thu thập contact / company information | Việc của mình + lead chưa ai nhận |
| Bộ phận chuyên môn | `specialist` | Điền và xuất bản hồ sơ FDA / GACC | **Không có vai trò trong CRM** |

Bộ phận chuyên môn bị chặn ở **cả hai tầng**: `app/dashboard/crm/layout.tsx` chặn toàn bộ trang
`/dashboard/crm/*` (kể cả khi gõ thẳng URL), và mọi route `/api/crm/*` kiểm tra quyền `crm.access`
trước khi đụng tới dữ liệu (trả về 403). Sidebar cũng không hiện nhóm CRM với vai trò này.

Ba quy tắc cứng của pipeline (được enforce trong code, không chỉ là quy ước):

1. **Mọi opportunity phải có owner** — khi tạo/chuyển đổi, owner mặc định là người tạo và AE có thể đổi.
2. **Mọi opportunity phải có next action** — thiếu next action sẽ bị đánh dấu cảnh báo trên dashboard và pipeline board.
3. **Không để opportunity không cập nhật** — quá `STALE_DAYS = 7` ngày không có hoạt động nào thì tự
   động gắn nhãn "ngủ quên"; mất deal bắt buộc phải ghi lý do.

Ma trận quyền nằm ở `lib/permissions.ts`, thống kê dùng chung ở `lib/crm-core.ts`.

## 2. Dashboard

**Founder / Admin** (`/dashboard/crm`) — đúng 6 chỉ số theo spec:

- Total Pipeline Value (kèm weighted theo xác suất stage)
- New Leads (30 ngày / trong tháng)
- Opportunities by Stage (số deal + giá trị từng stage)
- Stale Opportunities (ngủ quên, thiếu next action, thiếu owner, follow-up quá hạn)
- Conversion Rate (lead → cơ hội, win rate, conversion)
- Expected Revenue (weighted pipeline + đã thắng)

**AE** — cùng dashboard nhưng scope = team, cộng thêm:

- Follow-up checklist (next action đến hạn / quá hạn, bấm "Xong" để đóng)
- Hiệu suất từng member & team (`/dashboard/crm/hieu-suat`): lead tạo, lead chuyển đổi, hoạt động
  30 ngày, pipeline đang giữ, won, win rate, số cơ hội ngủ quên.

**SR / LR** — danh sách lead, trang chi tiết lead (research note, qualification, activity log).

## 3. Các trang CRM

| Đường dẫn | Nội dung |
| --- | --- |
| `/dashboard/crm` | Dashboard sales operation theo vai trò |
| `/dashboard/crm/leads` | Danh sách lead, tạo lead, qualify, phân công, chuyển thành cơ hội |
| `/dashboard/crm/leads/[id]` | Chi tiết lead: thông tin doanh nghiệp, research note, activity log |
| `/dashboard/crm/co-hoi` | Pipeline board (6 stage) + bảng, cảnh báo ngủ quên / thiếu next action |
| `/dashboard/crm/co-hoi/[id]` | Chi tiết cơ hội: next action, đổi stage, đổi owner, lịch sử stage, activity |
| `/dashboard/crm/khach-hang` | Khách hàng đã thắng, nối sang hồ sơ FDA/GACC |
| `/dashboard/crm/hieu-suat` | Hiệu suất member & team (Founder / AE) |

Pipeline: `contacted (20%) → qualified (40%) → proposal (60%) → negotiation (80%) → won (100%) / lost (0%)`.

## 4. Supabase

1. Tạo project tại [supabase.com](https://supabase.com)
2. SQL Editor → chạy `supabase/schema.sql` **rồi** chạy `supabase/schema-crm.sql`
   (cả hai file đều **chạy lại được nhiều lần**, không sợ chạy trùng)
3. Settings → API, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (chỉ dùng phía server)

Lần đăng nhập đầu tiên hệ thống tự tạo tài khoản demo + dữ liệu CRM mẫu nếu bảng còn trống.
Đặt biến `VEXIM_DISABLE_DEMO_SEED=1` để tắt việc tự tạo demo (nên bật khi chạy production thật).

### Sự cố thường gặp: `23514 · staff_users_role_check`

```
new row for relation "staff_users" violates check constraint "staff_users_role_check"
Failing row contains (3, ae@veximglobal.com, Lương Văn Học, $2a$10$..., ae, ...)
```

**Nguyên nhân:** database mới chỉ chạy `supabase/schema.sql`, chưa chạy `supabase/schema-crm.sql`.
Bảng `staff_users` khi đó chỉ cho phép hai vai trò `admin` và `specialist`, nên bước tạo tài khoản
demo `ae@veximglobal.com` (role `ae`) bị Postgres chặn. Lỗi xuất hiện ngay ở lần đăng nhập đầu tiên,
khi CRM seed dữ liệu mẫu.

**Cách xử lý:** mở Supabase → SQL Editor → chạy `supabase/schema-crm.sql`. Sau đó tải lại trang,
hệ thống tự chạy tiếp phần seed còn dang dở.

Từ bản này, app **tự phát hiện** tình trạng trên và hiển thị hướng dẫn ngay trên giao diện thay vì
báo lỗi 500 khó hiểu: API trả `503` kèm việc cần làm, trang CRM hiện thẻ "Cơ sở dữ liệu chưa sẵn sàng".

## 5. Chạy local

```bash
cp .env.example .env.local
# điền 3 biến Supabase (hoặc bỏ trống để dùng SQLite data/vexim.db)
npm install
npm run dev
```

Kiểm tra nhanh: `npx tsc --noEmit` và `npm run build`.

Yêu cầu **Node >= 22.5** (đã khai báo trong `package.json` → `engines`) vì chế độ chạy không cần
Supabase dùng module `node:sqlite` của Node.

## 6. Deploy Vercel

```bash
npx vercel
```

Thêm đúng 4 biến trong `.env.example` vào Project → Settings → Environment Variables, hoặc kết nối
GitHub repo `hocluongvan25-dotcom/quan_ly_du_an_vexim`.

Vercel cần Node 22.5+ (xem `engines` trong `package.json`). Trước khi mở cho khách dùng thật, nên:
đổi `AUTH_SECRET`, đặt `VEXIM_DISABLE_DEMO_SEED=1`, và xoá khối "Tài khoản demo" ở `app/login/page.tsx`.

## Tài khoản demo

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Founder / Admin | `admin@veximglobal.com` | `Vexim@Admin2026` |
| AE — Sales Leader | `ae@veximglobal.com` | `Vexim@AE2026` |
| SR — Sales Research | `sr@veximglobal.com` | `Vexim@SR2026` |
| LR — Lead Research | `lr@veximglobal.com` | `Vexim@LR2026` |
| Chuyên môn hồ sơ | `chuyenmon@veximglobal.com` | `Vexim@CM2026` |

## Cấu trúc mã nguồn

```
lib/
  types.ts          kiểu dữ liệu + hằng số CRM (stage, nguồn lead, vai trò)
  permissions.ts    ma trận quyền & phạm vi dữ liệu theo vai trò
  crm-core.ts       logic thuần: stale/overdue, thống kê dashboard, hiệu suất
  crm-sqlite.ts     tầng dữ liệu SQLite cho CRM (+ seed demo)
  crm-supabase.ts   tầng dữ liệu Supabase cho CRM (+ seed demo)
  db.ts             facade chuyển SQLite <-> Supabase
  db-health.ts      dịch lỗi schema Supabase thành hướng dẫn cần chạy file SQL nào
  api-error.ts      chuẩn hoá lỗi API (503 khi database thiếu migration)
app/api/crm/        leads, opportunities, activities, customers, dashboard, performance, teams, members
app/dashboard/crm/  các trang CRM
components/DbSetupNotice.tsx  thẻ "Cơ sở dữ liệu chưa sẵn sàng"
supabase/schema.sql      schema gốc (chạy được nhiều lần)
supabase/schema-crm.sql  schema CRM cho PostgreSQL (chạy được nhiều lần)
```

## Liên hệ Vexim Global

Số 25/6/51 Ngọa Long, Tây Tựu, Bắc Từ Liêm, Hà Nội · 0373 685 634 · contact@veximglobal.com
