# CRM FDA/GACC — Vexim Global

CRM hiện chỉ quản lý cơ hội đăng ký FDA và GACC. Hồ sơ khách hàng được theo dõi theo một hành trình thống nhất:

**Hồ sơ → Tiếp nhận → Báo giá → Chứng nhận → Duy trì**

- **Hồ sơ:** lưu thông tin doanh nghiệp trong Danh mục doanh nghiệp.
- **Tiếp nhận:** ghi nhận nhu cầu FDA/GACC thành cơ hội CRM, phân công người phụ trách và bước tiếp theo.
- **Báo giá:** tạo báo giá theo mẫu FDA hoặc GACC, liên kết với cơ hội khi có.
- **Chứng nhận:** sau khi khách hàng chấp thuận, tạo và lưu hồ sơ FDA/GACC.
- **Duy trì:** theo dõi hiệu lực, gia hạn, cảnh báo và các hóa đơn chứng nhận trong các khu vực tương ứng.

## Pipeline FDA/GACC

Hai pipeline dùng chung cách theo dõi; tên và tiêu chí cụ thể nằm trong `lib/crm-types.ts` (`PIPELINE_DEFS`):

1. Mới tiếp nhận
2. Đã xác nhận nhu cầu
3. Đã tư vấn
4. Đã gửi báo giá
5. Đang cân nhắc
6. Chờ thanh toán
7. Đã ký hợp đồng / Không phù hợp

Mỗi giai đoạn có SLA và tiêu chí chuyển tiếp. Ví dụ: khi rời giai đoạn **Đã tư vấn**, phải ghi phương án/lộ trình, xác nhận khách hiểu chi phí/thời gian và đồng ý nhận báo giá. Chuyển sang **Không phù hợp** cần ghi lý do. Chuyển lùi được phép và được lưu lịch sử.

## Người phụ trách và bước tiếp theo

- Mỗi cơ hội có một Owner.
- Cơ hội đang mở nên có `next_action` và `next_action_date`; thiếu hoặc trễ sẽ hiện cảnh báo.
- Ghi hoạt động (gọi, Zalo, gặp, báo giá, ghi chú) cùng lúc với cập nhật bước tiếp theo để tránh nhập liệu trùng.
- Admin có thể xem/sửa mọi cơ hội và đổi Owner. Specialist xem toàn đội, nhưng chỉ sửa/chuyển/gọi hoạt động cho cơ hội của mình.

## Dữ liệu và API

Bảng dùng: `crm_pipelines`, `crm_stages`, `crm_opportunities`, `crm_stage_history`, `crm_activities`, `crm_checklists`. SQLite tự di trú; Supabase dùng `supabase/schema.sql` và migration dữ liệu hiện hành.

- `GET /api/notifications?scope=mine|all` — hẹn follow-up, cơ hội đã chốt chưa có hồ sơ và cảnh báo SLA/bỏ quên/thiếu bước tiếp theo.
- `GET /api/crm/pipelines` — pipeline và giai đoạn.
- `GET /api/crm/owners` — danh sách nhân sự.
- `GET/POST /api/crm/opportunities` — danh sách, bộ lọc và tạo cơ hội.
- `GET/PATCH/DELETE /api/crm/opportunities/[id]` — chi tiết, lịch sử, hoạt động và checklist.
- `POST /api/crm/opportunities/[id]/move` — chuyển giai đoạn.
- `GET/POST /api/crm/opportunities/[id]/activities` — hoạt động.
- `GET /api/crm/dashboard?pipeline=FDA|GACC` — KPI, giai đoạn và cảnh báo.

## Giao diện

- `/dashboard/doanh-nghiep` — danh sách và hồ sơ doanh nghiệp.
- `/dashboard/doanh-nghiep/[id]` — hành trình 5 bước, các cơ hội, báo giá, chứng nhận và hóa đơn liên quan. Thao tác hóa đơn được mở trong Kế toán, không nằm ở trang lưu hồ sơ chứng nhận.
- `/dashboard/crm` — tổng quan CRM.
- `/dashboard/crm/pipeline` — Kanban FDA/GACC.
- `/dashboard/crm/co-hoi/moi` — tạo cơ hội; có thể nhận sẵn pipeline, doanh nghiệp, liên hệ, điện thoại, email và nguồn.
- `/dashboard/crm/co-hoi/[id]` — chi tiết, timeline, lịch sử giai đoạn và điều kiện chuyển tiếp.
- `/dashboard/bao-gia` — báo giá FDA/GACC; có thể tạo từ cơ hội CRM.
- `/dashboard/ho-so` — hồ sơ chứng nhận FDA/GACC. Màn hình chi tiết chỉ lưu/cập nhật hồ sơ.
- `/dashboard/ke-toan/hoa-don` — quản lý hóa đơn chứng nhận, độc lập với chức năng lưu hồ sơ.

Yêu cầu mới được tiếp nhận trực tiếp vào cơ hội FDA/GACC.
