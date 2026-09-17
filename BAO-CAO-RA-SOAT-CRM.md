# Báo cáo rà soát VEXIM CRM — 17/09/2026

Phạm vi: toàn bộ mã nguồn CRM (`app/`, `lib/`, `components/`, `supabase/`) sau lỗi
`23514 · staff_users_role_check` khi tạo tài khoản `ae@veximglobal.com`.
Cách kiểm chứng: `npx tsc --noEmit`, `npm run build`, và chạy thật (SQLite) để gọi API
theo từng vai trò (admin / ae / sr / lr / specialist).

---

## 1. Lỗi được báo cáo

| | |
| --- | --- |
| **Triệu chứng** | Tạo user `ae@veximglobal.com` (role `ae`) thất bại: `new row for relation "staff_users" violates check constraint "staff_users_role_check"` |
| **Vị trí phát sinh** | `lib/crm-supabase.ts` → `seedCrmSupabase()` → `ensureUser("ae@veximglobal.com", ...)`, chạy ở lần đăng nhập đầu tiên khi bảng `crm_teams` còn trống |
| **Nguyên nhân gốc** | `supabase/schema.sql` khai báo `role check (role in ('admin','specialist'))`. Muốn có 4 vai trò CRM (`ae`, `sr`, `lr` + `admin`) thì phải chạy tiếp `supabase/schema-crm.sql` — file này mới `drop constraint` cũ và `add constraint` mới. Database của bạn mới chỉ chạy file đầu. |
| **Cách xử lý** | Supabase → SQL Editor → chạy `supabase/schema-crm.sql`. Sau đó tải lại trang, seed tự chạy tiếp. |

---

## 1b. Lỗi thứ hai được báo cáo (sau khi chạy migration)

| | |
| --- | --- |
| **Triệu chứng** | `PGRST200 · Could not find a relationship between 'crm_leads' and 'crm_opportunities' in the schema cache` — hint `crm_leads_converted_opportunity_id_fkey` |
| **Vị trí phát sinh** | `lib/crm-supabase.ts` → `LEAD_COLS` embed `converted_opportunity:crm_opportunities!crm_leads_converted_opportunity_id_fkey(code)`, dùng ở **mọi** truy vấn lead (danh sách lead, chi tiết lead, dashboard) |
| **Nguyên nhân gốc** | Trong `supabase/schema-crm.sql`, cột `crm_leads.converted_opportunity_id` được khai báo `bigint` **không có `references`** → Postgres không sinh khoá ngoại, PostgREST không biết quan hệ nên từ chối mọi truy vấn có embed đó. Danh sách bảng bạn gửi (đủ 7 bảng) xác nhận migration đã chạy xong — thiếu đúng ràng buộc này. |
| **Cách xử lý** | Chạy lại `supabase/schema-crm.sql` (mục 7 thêm khoá ngoại + `notify pgrst, 'reload schema'` để PostgREST nạp lại cache) |

Đã bổ sung để lỗi này cũng không chặn công việc:

- `lib/crm-supabase.ts` **không còn embed quan hệ đó**; mã cơ hội của lead được nạp riêng trong `attachOpportunityCodes()` → thiếu khoá ngoại thì chỉ mất một nhãn, trang vẫn chạy.
- `lib/db-health.ts` nhận diện `PGRST200/PGRST201`, và `dbStatus()` kiểm tra riêng xem khoá ngoại còn thiếu không → CRM hiện dải cảnh báo vàng "Database cần đồng bộ thêm" kèm việc cần làm.
- `supabase/schema-crm.sql` tạo đủ hai khoá ngoại (`crm_leads → crm_opportunities`, `crm_opportunities → crm_leads`) theo đúng tên constraint mà code tham chiếu, và tự dọn dữ liệu mồ côi trước khi tạo ràng buộc.

---

## 1c. Phát hiện thêm khi kiểm chứng: lead đã chuyển cơ hội không được nối với cơ hội

Kiểm tra API trên database trắng cho thấy mọi lead `status = "converted"` đều có
`converted_opportunity_id = null` và `opportunity_code = null` — cả khi seed SQLite lẫn Supabase:
hàm seed tạo lead trước, tạo cơ hội sau, nhưng **không cập nhật ngược lại lead** (chỉ `createOpportunity()`
khi dùng thật mới làm việc đó). Hệ quả: danh sách lead mất nhãn "→ VXM-O-…", trang chi tiết lead mất
liên kết sang cơ hội, và luồng gắn hồ sơ FDA/GACC theo lead bị mất dấu.

Đã sửa:
- Seed Supabase/SQLite nối lead ↔ cơ hội ngay khi tạo (giống hành vi thật của `createOpportunity`).
- Có bước **vá dữ liệu cũ** chạy tự động: SQLite vá một lần khi mở DB; Supabase vá một lần mỗi tiến trình (`backfillConvertedLeads`). Lỗi vá chỉ ghi log, không bao giờ làm hỏng CRM.
- Câu `update` tương đương cũng nằm trong `supabase/schema-crm.sql` để ai muốn chạy tay thì có sẵn.

Đã bổ sung để lỗi này không còn "khó hiểu" về sau:

- `supabase/schema.sql` giờ đã bao gồm luôn 5 vai trò + cột `team_id` (idempotent) — chạy file đầu là đã tạo được tài khoản CRM.
- `supabase/schema-crm.sql` mở đầu bằng cảnh báo đúng mã lỗi 23514 và `raise exception` nếu chạy sai thứ tự (chưa có `staff_users`).
- `lib/db-health.ts` dịch lỗi Postgres/PostgREST (23514, 42P01/PGRST205, 42703/PGRST204) thành hướng dẫn tiếng Việt.
- API trả `503` kèm `{ error, detail, fix }`; trang `/dashboard/crm*` hiện thẻ **"Cơ sở dữ liệu chưa sẵn sàng"**; các trang khác hiện banner; `app/error.tsx` thay cho màn hình lỗi trắng của Next.js.
- `/api/users` trước đây nuốt mọi lỗi thành "Email đã tồn tại" — nay chỉ báo vậy khi đúng lỗi 23505, còn lại trả chẩn đoán thật.

---

## 2. Lỗi chức năng đã sửa trong lần rà soát này

| # | Mức độ | Vấn đề | Cách sửa |
| --- | --- | --- | --- |
| 1 | 🔴 Cao | **Nút "Xong" ở checklist follow-up gọi sai API.** Danh sách trả về opportunity nhưng lại `PUT /api/crm/activities/{opportunity_id}` → đóng nhầm một hoạt động khác, hoặc không tồn tại. | Checklist trả về hàng chuẩn hoá `kind`+`id` (`lib/crm-core.ts::buildFollowUps`). Opportunity đóng bằng `complete_next_action`, activity đóng bằng `PUT /api/crm/activities/:id`. |
| 2 | 🔴 Cao | **Follow-up đã hẹn (`crm_activities.is_follow_up`) không xuất hiện ở bất kỳ màn hình nào.** AE hẹn việc rồi tự quên. | Checklist gom cả 2 nguồn: next action của cơ hội + follow-up chưa xong. |
| 3 | 🔴 Cao | **`PUT /api/crm/activities/:id` không kiểm tra phạm vi** — đăng nhập CRM là đoán id và đóng được follow-up của team khác. | Kiểm tra `canSeeRecord` trên lead/cơ hội gắn với hoạt động. |
| 4 | 🔴 Cao | **AE không phân công được lead/cơ hội.** Các trang CRM gọi `/api/users` (chỉ Founder) → 403 → dropdown thành viên trống. | Thêm `GET /api/crm/members` trả đúng phạm vi (Founder: tất cả; AE: team mình; SR/LR: chính mình) và chuyển 4 trang CRM sang dùng. |
| 5 | 🟠 Vừa | **`certificate.manage` có trong ma trận quyền nhưng không ai kiểm tra** — mọi vai trò đăng nhập đều tạo/sửa/xoá hồ sơ FDA/GACC. | Enforce ở `POST /api/certificates`, `PUT`/`DELETE /api/certificates/:id` (admin, ae, specialist). |
| 6 | 🟠 Vừa | **SR/LR đọc được chi tiết mọi cơ hội của team** (trái spec "SR/LR chỉ thấy việc của mình + lead chưa ai nhận"). | `canSeeRecord(..., kind)` phân biệt lead và opportunity: cross-team chỉ còn với lead. |
| 7 | 🟠 Vừa | **Đặt/đổi next action không kiểm tra quyền** — người xem được cơ hội là sửa được việc tiếp theo. | `complete_next_action` và `next_action` yêu cầu owner / AE / Founder. |
| 8 | 🟡 Thấp | **Gắn hồ sơ vào cơ hội ghi nhật ký sai người** (`created_by` = người tạo cơ hội thay vì người thao tác). | Truyền actor vào `linkCertificate` ở cả hai tầng dữ liệu. |
| 9 | 🟡 Thấp | **Trang "Người dùng & vai trò" không sửa được vai trò/team**, không gán được AE cho team; `setTeamLeader`, `setUserTeam` là code chết. | Thêm `PUT /api/users/:id`, `PUT /api/crm/teams/:id` + điều khiển ngay trên danh sách; chặn tự hạ quyền chính mình; chặn gán người không phải AE làm Pipeline Owner. |
| 10 | 🟡 Thấp | **Nhãn "Ngủ quên" luôn hiển thị "7+ ngày"** bất kể thực tế 20–30 ngày. | Hiển thị số ngày thật (`daysSince(last_activity_at)`). |
| 11 | 🟡 Thấp | Lỗi database trả về HTML 500 / trang trắng, log chỉ có `digest` — rất khó tự xử lý. | Chuẩn hoá lỗi API (`lib/api-error.ts`) + thẻ hướng dẫn (`components/DbSetupNotice.tsx`) + `app/error.tsx`. |
| 12 | 🟠 Vừa | **Mọi truy vấn lead chết vì `PGRST200`** khi database thiếu khoá ngoại `crm_leads.converted_opportunity_id`. | Bỏ phụ thuộc embed (nạp mã cơ hội bằng truy vấn riêng) + bổ sung khoá ngoại trong SQL + cảnh báo mềm khi thiếu. |
| 13 | 🟠 Vừa | **Lead đã chuyển cơ hội không được nối với cơ hội** (seed bỏ sót `converted_opportunity_id`) → mất nhãn cơ hội và mất liên kết sang hồ sơ. | Seed nối đúng như luồng thật + tự vá dữ liệu cũ ở cả hai tầng dữ liệu. |

---

## 3. Việc còn dang dở & khuyến nghị

### 3.1. Bảo mật — nên xử lý trước khi mở cho khách hàng

1. **Tài khoản demo tự tạo trên production.** Khi bảng trống, hệ thống tự tạo `admin@veximglobal.com / Vexim@Admin2026`… và trang `/login` in sẵn mật khẩu. → Đặt `VEXIM_DISABLE_DEMO_SEED=1` và xoá khối "Tài khoản demo" ở `app/login/page.tsx`.
2. **`AUTH_SECRET` có giá trị mặc định trong mã nguồn** (`lib/auth.ts`). Nếu quên khai báo biến môi trường, kẻ tấn công biết khoá là giả mạo được phiên đăng nhập. → Bắt buộc có biến này khi `NODE_ENV=production` và fail-fast nếu thiếu.
3. **Không có giới hạn số lần đăng nhập sai / rate limit** trên `/api/auth/login`.
4. **`/dashboard/nguoi-dung` không được chặn ở tầng server** — chỉ API trả 403; người không phải Founder vẫn thấy giao diện quản trị.
5. **`/api/certificates` (GET) trả `service_price` cho mọi vai trò nội bộ.** Chấp nhận được, nhưng nên cắt trường này khi vai trò không phải admin/specialist nếu muốn chặt hơn.

### 3.2. Hoàn thiện chức năng

6. **Không có giao diện xoá hồ sơ** dù API `DELETE /api/certificates/:id` đã có (và đã kiểm tra "không xoá hồ sơ đã xuất bản"). Cũng chưa có "thu hồi/huỷ xuất bản".
7. **Trang hồ sơ dùng `window.prompt()` để hỏi phí gia hạn** — không validate, không dùng được trên mobile.
8. **Không có phân trang** cho lead/cơ hội/hoạt động; các tầng dữ liệu dùng `limit` cứng (200–500) rồi lọc trong bộ nhớ.
9. **`lib/crm-supabase.ts::listActivities` tải 4× số bản ghi cần dùng rồi lọc bằng JS** — sẽ chậm dần khi dữ liệu lớn; nên đẩy điều kiện scope xuống truy vấn (view hoặc RPC).
10. **`crm_teams.ae_id` không ràng buộc phải là tài khoản AE** ở tầng database (đã chặn ở API, nhưng nên thêm ràng buộc/trigger nếu muốn chắc).
11. **`crm_leads.team_id`, `crm_opportunities.team_id`, `staff_users.team_id` vẫn là `bigint` trơn** (không có khoá ngoại tới `crm_teams`) — app không join qua chúng nên chưa gây lỗi, nhưng nếu muốn ràng buộc chặt thì nên thêm FK `on delete set null` sau khi dọn dữ liệu mồ côi.
12. **Chưa có màn hình nhật ký kiểm toán tổng hợp** (ai đổi stage nào, ai sửa giá hồ sơ); dữ liệu đã ghi trong `crm_stage_events`/`crm_activities` nhưng chỉ xem được theo từng cơ hội/lead.
13. **Chưa có thông báo** (email/Zalo) khi next action quá hạn — hiện chỉ hiện trên dashboard khi có người mở vào xem.
14. **Code chết cần dọn:** khối `const by = (email) => ...; void by;` trong `lib/db-supabase.ts` (seed chứng chỉ mẫu).

### 3.3. Hạ tầng / vận hành

15. **Chế độ SQLite dùng `node:sqlite`, cần Node ≥ 22.5.** `lib/db.ts` import tĩnh `lib/db-sqlite.ts`, nên kể cả khi đã cấu hình Supabase, runtime thiếu module này vẫn lỗi ngay lúc import. Đã khai báo `engines.node >= 22.5.0`; nếu deploy nơi không kiểm soát được Node thì nên lazy-load tầng SQLite.
16. **Chưa có test tự động và CI.** Toàn bộ kiểm chứng hiện làm thủ công (`tsc`, `build`, curl theo vai trò). Nên thêm tối thiểu: test ma trận quyền (`lib/permissions.ts`), test `buildFollowUps`, test luồng lead → cơ hội → won.
17. **`npm run lint` chưa có cấu hình ESLint** (`next lint` sẽ hỏi thiết lập ở lần chạy đầu).
18. **`schema.sql` + `schema-crm.sql` phải chạy tay hai lần.** Có thể thay bằng `supabase migration`/script `npm run db:push` để tránh lặp lại sự cố 23514.

---

## 4. Đã kiểm chứng sau khi sửa

```
npx tsc --noEmit        → 0 lỗi
npm run build           → thành công (34 route)
Xoá data/vexim.db → đăng nhập lại 5 vai trò → seed đủ 8 lead / 6 cơ hội / 18 hoạt động
```

Ma trận hành vi đã test trên bản production build:

| Hành vi | Kết quả |
| --- | --- |
| `GET /api/crm/members` (ae, admin) | 200 + đúng thành viên |
| `GET /api/crm/members` (specialist) | 403 |
| `GET /api/crm/opportunities/1` (sr, lr) | 403 (không xem pipeline team) |
| `GET /api/crm/leads/1` (sr) | 200 (research chéo lead trong team) |
| `PUT complete_next_action` (ae) | 200, next action được đóng, đồng hồ stale reset |
| `PUT complete_next_action` / `next_action` (sr) | 403 |
| `POST /api/certificates` (specialist, ae) | 200 |
| `POST /api/certificates` (sr) | 403 |
| `PUT /api/users/1 { role: "lr" }` (admin tự hạ quyền) | 400 |
| `PUT /api/users/3` (ae) | 403 |
| `DELETE /api/crm/opportunities/1` (lr) | 403 |
| `DELETE /api/crm/opportunities/5` (đã won) | 400 — không xoá khách hàng |
| Mọi trang `/dashboard*` | 200 |
| DB thiếu migration (mô phỏng) | Thẻ "Cơ sở dữ liệu chưa sẵn sàng" chỉ đúng file SQL cần chạy |
| Seed từ DB trắng | 5 lead `converted` đều có `converted_opportunity_id` + `opportunity_code` (VXM-O-…) |
| Vá dữ liệu cũ (mô phỏng) | Lead `converted` được nối lại, lead `qualified` giữ nguyên |
| Lead chưa chuyển đổi | Không bị gán nhầm liên kết cơ hội |
