/**
 * Chẩn đoán trạng thái cơ sở dữ liệu.
 *
 * Lý do tồn tại: SQLite tự migrate nên không bao giờ lệch schema, còn Supabase thì
 * phải chạy tay `supabase/schema.sql` rồi `supabase/schema-crm.sql`. Nếu quên bước 2,
 * Postgres sẽ trả về lỗi khó hiểu (23514 · staff_users_role_check, 42P01, 42703...).
 * Module này biến những lỗi đó thành thông báo tiếng Việt nói rõ cần chạy file nào.
 */

import { isSupabaseEnabled, supabaseAdmin } from "./supabase";

export type DbProblem = {
  /** Tiêu đề ngắn hiển thị trên UI. */
  title: string;
  /** Chi tiết kỹ thuật (giữ nguyên thông điệp gốc của Postgres để còn tra cứu). */
  detail: string;
  /** Việc cần làm, càng cụ thể càng tốt. */
  fix: string;
  /** Mã lỗi gốc của Postgres/PostgREST (nếu có). */
  code?: string;
};

export type DbStatus = {
  ready: boolean;
  /** Supabase hay SQLite. */
  driver: "supabase" | "sqlite";
  problem: DbProblem | null;
};

export const MIGRATION_FIX =
  "Mở Supabase → SQL Editor, dán toàn bộ nội dung supabase/schema.sql rồi chạy, " +
  "sau đó dán tiếp supabase/schema-crm.sql và chạy. Cả hai file đều chạy lại được nhiều lần.";

function pgError(raw: unknown): { code: string; message: string; details: string } {
  const e = (raw || {}) as { code?: unknown; message?: unknown; details?: unknown };
  return {
    code: e.code == null ? "" : String(e.code),
    message: e.message == null ? "" : String(e.message),
    details: e.details == null ? "" : String(e.details),
  };
}

/**
 * Dịch lỗi của Postgres/PostgREST sang việc cần làm.
 * Trả về `null` nếu lỗi không liên quan tới schema (ví dụ trùng email, mất kết nối).
 */
export function describeDbError(raw: unknown): DbProblem | null {
  if (!raw || typeof raw !== "object") return null;
  const { code, message, details } = pgError(raw);
  const haystack = `${message} ${details}`;
  const detail = message || details || String(raw);

  // 23514 — CHECK constraint. Ca phổ biến nhất: chưa nâng cấp role CRM.
  if (code === "23514" || /violates check constraint/i.test(message)) {
    if (/staff_users_role_check/.test(haystack)) {
      return {
        title: "Database chưa nâng cấp vai trò CRM",
        detail,
        code,
        fix:
          "Ràng buộc staff_users_role_check trong Postgres vẫn chỉ cho phép 'admin' và 'specialist', " +
          "nên tài khoản ae / sr / lr không tạo được. " +
          MIGRATION_FIX,
      };
    }
    return { title: "Dữ liệu vi phạm ràng buộc của database", detail, code, fix: MIGRATION_FIX };
  }

  // 42703 — cột không tồn tại; PGRST204 — cột không có trong schema cache.
  // Kiểm tra cột TRƯỚC bảng: câu lỗi của Postgres ("column ... does not exist")
  // cũng khớp regex của bảng nếu so khớp thứ tự ngược lại.
  if (
    code === "42703" ||
    code === "PGRST204" ||
    /column .* does not exist/i.test(haystack) ||
    /could not find the '.*' column/i.test(haystack)
  ) {
    return {
      title: "Database thiếu cột mới của VEXIM CRM",
      detail,
      code,
      fix: `Cột staff_users.team_id (và các cột CRM khác) chưa được thêm. ${MIGRATION_FIX}`,
    };
  }

  // 42P01 — bảng không tồn tại; PGRST205 — PostgREST không thấy bảng trong schema cache.
  if (
    code === "42P01" ||
    code === "PGRST205" ||
    /could not find the table/i.test(haystack) ||
    /relation .* does not exist/i.test(haystack)
  ) {
    return {
      title: "Database thiếu bảng của VEXIM CRM",
      detail,
      code,
      fix: `Các bảng crm_teams / crm_leads / crm_opportunities / crm_activities / crm_stage_events chưa có. ${MIGRATION_FIX}`,
    };
  }

  return null;
}

/** Rút gọn lỗi bất kỳ thành chuỗi dễ đọc cho log/UI. */
export function dbErrorMessage(raw: unknown): string {
  const problem = describeDbError(raw);
  if (problem) return `${problem.title}. ${problem.fix}`;
  if (raw instanceof Error) return raw.message;
  const { message, details } = pgError(raw);
  return message || details || "Lỗi không xác định từ cơ sở dữ liệu.";
}

let cached: { at: number; status: DbStatus } | null = null;
const CACHE_MS = 30_000;

/**
 * Kiểm tra schema có đủ để chạy CRM hay không.
 * - SQLite: luôn sẵn sàng (schema tự migrate lúc mở DB).
 * - Supabase: thử đọc `staff_users.team_id` và bảng `crm_teams`.
 * Kết quả được cache 30 giây để không tốn round-trip mỗi lần render.
 */
export async function dbStatus(force = false): Promise<DbStatus> {
  if (!isSupabaseEnabled()) {
    return { ready: true, driver: "sqlite", problem: null };
  }
  if (!force && cached && Date.now() - cached.at < CACHE_MS) return cached.status;

  const problem = await probeSupabase();
  const status: DbStatus = { ready: !problem, driver: "supabase", problem };
  cached = { at: Date.now(), status };
  return status;
}

async function probeSupabase(): Promise<DbProblem | null> {
  const sb = supabaseAdmin();

  const users = await sb.from("staff_users").select("id, role, team_id").limit(1);
  if (users.error) {
    return (
      describeDbError(users.error) || {
        title: "Không đọc được bảng staff_users",
        detail: dbErrorMessage(users.error),
        fix: "Kiểm tra NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY trong biến môi trường.",
      }
    );
  }

  const teams = await sb.from("crm_teams").select("id").limit(1);
  if (teams.error) {
    return (
      describeDbError(teams.error) || {
        title: "Chưa chạy được phần CRM của database",
        detail: dbErrorMessage(teams.error),
        fix: MIGRATION_FIX,
      }
    );
  }

  return null;
}

/** Xoá cache — gọi sau khi seed/migrate để lần kiểm tra sau là mới nhất. */
export function resetDbStatusCache() {
  cached = null;
}
