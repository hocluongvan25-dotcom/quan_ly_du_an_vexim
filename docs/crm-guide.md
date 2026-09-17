# CRM Vận Hành — Vexim Global

Hệ thống trả lời 5 câu hỏi quản trị:

1. **Đang có bao nhiêu cơ hội?** → Dashboard KPI + Pipeline counts
2. **Mỗi khách ở giai đoạn nào?** → Kanban, mỗi khách bắt buộc ở 1 stage
3. **Đã ở đó bao lâu?** → `stage_entered_at` + lịch sử giai đoạn
4. **Bước tiếp theo là gì?** → `next_action` + `next_action_date`
5. **Có bị bỏ quên không?** → Cảnh báo SLA / stale ≥14 ngày / trễ follow-up / thiếu next action

Triết lý: thiết kế cho **sale giỏi không bỏ sót cơ hội** — "Việc của tôi hôm nay",
ghi hoạt động 1 chạm, nhắc follow-up — chứ không phải để nhân viên báo cáo cho sếp.

## Pipeline theo dịch vụ

| Pipeline | Key | Giai đoạn |
|---|---|---|
| FDA — Đăng ký & Tư vấn | `FDA` | Lead mới → Đã xác nhận nhu cầu → Đã tư vấn → Đã gửi báo giá → Đang cân nhắc → Chờ thanh toán → **Đã ký hợp đồng** / Không phù hợp |
| GACC | `GACC` | (tương tự FDA) |
| Sale xuất khẩu Mỹ | `SALE_EXPORT` | Lead mới → Đã liên hệ → Khảo sát nhu cầu → Đã gửi báo giá → Thương thảo → **Chốt hợp đồng** / Không phù hợp |
| Vận hành Amazon US | `AMAZON_OPS` | Lead mới → Đã liên hệ → Audit gian hàng → Đề xuất phương án → Thương thảo → **Chốt hợp đồng** / Không phù hợp |

Không có trạng thái "Đang chăm sóc" — vì nó không tạo thông tin quản trị.

## SLA + Điều kiện chuyển tiếp

- Mỗi stage có **SLA (số ngày chuẩn)**. VD: Lead mới ≤ 2 ngày, Đã gửi báo giá ≤ 7 ngày.
  Quá SLA → cảnh báo đỏ trên Dashboard/Kanban.
- Chuyển **tiến** yêu cầu tick đủ **exit criteria** của stage hiện tại.
  VD: rời "Đã tư vấn" phải có: phương án + lộ trình đã tư vấn, khách hiểu chi phí &
  thời gian, khách đồng ý nhận báo giá.
- Chuyển sang **Không phù hợp** bắt buộc chọn **lý do** (để thống kê mất khách ở đâu).
- Chuyển **lùi** được phép, chỉ ghi log.

Định nghĩa pipeline/SLA/criteria nằm ở `lib/crm-types.ts` (`PIPELINE_DEFS`) —
single source of truth, tự đồng bộ vào DB mỗi lần khởi động.

## Owner & Next action

- Mỗi cơ hội có đúng 1 **Owner** (người chịu trách nhiệm).
- Mỗi cơ hội đang mở nên có **Next action + ngày hẹn**. Thiếu → cảnh báo vàng.
- Ghi hoạt động (gọi/Zalo/gặp/báo giá...) đồng thời cập nhật next action → sale
  không cần nhập liệu 2 lần.

## Phân quyền

| | Admin | Specialist (Sale) |
|---|---|---|
| Xem dashboard/Kanban/chi tiết | Tất cả | Tất cả (minh bạch team) |
| Tạo cơ hội | ✅ (gán owner tùy ý) | ✅ (mặc định mình là owner) |
| Sửa / chuyển giai đoạn / ghi hoạt động | Mọi cơ hội | Chỉ cơ hội mình là Owner |
| Đổi Owner | ✅ | ❌ |
| Xóa cơ hội | ✅ | ❌ |

Logic ở `canMutateOpportunity` / `canDeleteOpportunity` / `canReassignOwner`
(`lib/crm-types.ts`), enforce ở API routes.

## Dữ liệu & API

Bảng Supabase (chạy `supabase/schema.sql`): `crm_pipelines`, `crm_stages`,
`crm_opportunities`, `crm_stage_history`, `crm_activities`, `crm_checklists`.
SQLite (`data/vexim.db`) tự migrate + seed demo.

API:
- `GET /api/notifications?scope=mine|all` — trung tâm thông báo cá nhân hóa
  (hẹn follow-up đến hạn/trễ + cảnh báo SLA/bỏ quên/thiếu action + leads mới).
  Chuông trên header tự quét 30 giây, kêu chuông + popup trình duyệt khi có hẹn mới đến hạn.
- `GET /api/crm/pipelines` — pipeline + stages (SLA, criteria)
- `GET /api/crm/owners` — danh sách nhân sự
- `GET/POST /api/crm/opportunities` — list (lọc `pipeline/scope/owner/q/stage`) / tạo
- `GET/PATCH/DELETE /api/crm/opportunities/[id]` — chi tiết (+history/activities/checklist)
- `POST /api/crm/opportunities/[id]/move` — chuyển giai đoạn (`to_stage_id`, `checklist`, `note`, `lost_reason`)
- `GET/POST /api/crm/opportunities/[id]/activities` — hoạt động
- `GET /api/crm/dashboard?pipeline=` — KPI, pipeline counts, alerts, insights

Giao diện:
- `/dashboard/tong-quan` — **Toàn cảnh (chỉ Admin)**: KPI tổng, phễu Leads → Cơ hội → Chốt,
  biểu đồ tăng trưởng tháng/quý/năm (giá trị chốt CRM + doanh thu ghi nhận + leads),
  KPI + biểu đồ từng nhân viên theo kỳ (cơ hội, chốt, tỷ lệ, hoạt động, doanh thu)
- `/dashboard/crm` — Dashboard quản trị (5 câu hỏi + tổng kết theo kỳ + insights: thời gian TB/giai đoạn,
  hiệu suất sale, điểm mất khách)
- `/dashboard/crm/pipeline` — Kanban theo pipeline
- `/dashboard/crm/co-hoi/moi` — tạo mới (nhận prefill `?pipeline=&company=&contact=&phone=&source=`)
- `/dashboard/crm/co-hoi/[id]` — chi tiết: timeline, lịch sử giai đoạn, điều kiện đi tiếp
- Trang Leads có nút **"＋ Tạo cơ hội CRM"** để chuyển lead tư vấn thành cơ hội.

## Dữ liệu cho AI sau này

`crm_stage_history` (thời gian từng giai đoạn) + hoạt động + kết quả won/lost là
nguồn để dự báo: thời gian chốt TB, tỷ lệ chuyển đổi theo sale/giai đoạn/ngành,
tín hiệu mua cao.
