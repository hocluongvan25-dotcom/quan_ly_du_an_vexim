import { daysBetween, todayUtcIso } from "./utils";
import type { SessionUser } from "./types";

/* ============================================================================
 * CRM VẬN HÀNH — Vexim Global
 * Triết lý: trả lời 5 câu hỏi quản trị
 *  1. Đang có bao nhiêu cơ hội?          → pipeline counts
 *  2. Mỗi khách đang ở giai đoạn nào?    → stage bắt buộc, không "đang chăm sóc"
 *  3. Đã ở giai đoạn đó bao lâu?         → stage_entered_at + stage history
 *  4. Bước tiếp theo là gì?              → next_action + next_action_date
 *  5. Có dấu hiệu bị bỏ quên không?      → SLA breach / stale / no-action / follow-up quá hạn
 * ========================================================================== */

export type CrmPipelineKey = "FDA" | "GACC" | "SALE_EXPORT" | "AMAZON_OPS";

export type CrmCriterion = { key: string; label: string; required: boolean };

export type CrmStageDef = {
  key: string;
  name: string;
  color: string;
  sla_days: number; // 0 = không áp SLA (giai đoạn kết thúc)
  exit_criteria: CrmCriterion[];
  is_won: boolean;
  is_lost: boolean;
};

export type CrmPipelineDef = {
  key: CrmPipelineKey;
  name: string;
  service: string;
  description: string;
  sort_order: number;
  stages: CrmStageDef[];
};

/** Pipeline chuẩn của Vexim — single source of truth, dùng để seed DB. */
export const PIPELINE_DEFS: CrmPipelineDef[] = [
  {
    key: "FDA",
    name: "FDA — Đăng ký & Tư vấn",
    service: "FDA",
    description: "Pipeline dịch vụ FDA: từ lead mới đến ký hợp đồng",
    sort_order: 1,
    stages: [
      {
        key: "lead_moi",
        name: "Lead mới",
        color: "#64748b",
        sla_days: 2,
        exit_criteria: [
          { key: "contacted", label: "Đã liên hệ được với khách", required: true },
          { key: "need_noted", label: "Đã ghi nhận nhu cầu sơ bộ", required: true },
        ],
        is_won: false,
        is_lost: false,
      },
      {
        key: "xac_nhan_nhu_cau",
        name: "Đã xác nhận nhu cầu",
        color: "#0ea5e9",
        sla_days: 3,
        exit_criteria: [
          { key: "need_clear", label: "Nhu cầu khách rõ ràng", required: true },
          { key: "fit_service", label: "Sản phẩm / dịch vụ phù hợp", required: true },
          { key: "decision_maker", label: "Đã xác định người quyết định", required: true },
        ],
        is_won: false,
        is_lost: false,
      },
      {
        key: "da_tu_van",
        name: "Đã tư vấn",
        color: "#8b5cf6",
        sla_days: 5,
        exit_criteria: [
          { key: "plan_done", label: "Đã tư vấn phương án + lộ trình", required: true },
          { key: "cost_time_ok", label: "Khách hiểu chi phí & thời gian", required: true },
          { key: "agree_quote", label: "Khách đồng ý nhận báo giá", required: true },
        ],
        is_won: false,
        is_lost: false,
      },
      {
        key: "da_gui_bao_gia",
        name: "Đã gửi báo giá",
        color: "#f59e0b",
        sla_days: 7,
        exit_criteria: [
          { key: "quote_sent", label: "Báo giá đã gửi (Zalo / Email)", required: true },
          { key: "quote_received", label: "Khách xác nhận đã nhận", required: true },
          { key: "reply_date", label: "Đã hẹn ngày phản hồi cụ thể", required: true },
        ],
        is_won: false,
        is_lost: false,
      },
      {
        key: "dang_can_nhac",
        name: "Đang cân nhắc",
        color: "#f97316",
        sla_days: 7,
        exit_criteria: [
          { key: "followup_done", label: "Đã follow-up ít nhất 1 lần", required: true },
          { key: "objection_done", label: "Đã xử lý objection chính", required: true },
          { key: "plan_confirmed", label: "Khách chốt phương án", required: true },
        ],
        is_won: false,
        is_lost: false,
      },
      {
        key: "cho_thanh_toan",
        name: "Chờ thanh toán",
        color: "#14b8a6",
        sla_days: 5,
        exit_criteria: [
          { key: "contract_sent", label: "Hợp đồng / báo giá chốt đã gửi", required: true },
          { key: "payment_info", label: "Thông tin thanh toán đã gửi", required: true },
          { key: "pay_date", label: "Đã hẹn ngày thanh toán", required: true },
        ],
        is_won: false,
        is_lost: false,
      },
      {
        key: "da_ky_hop_dong",
        name: "Đã ký hợp đồng",
        color: "#16a34a",
        sla_days: 0,
        exit_criteria: [],
        is_won: true,
        is_lost: false,
      },
      {
        key: "khong_phu_hop",
        name: "Không phù hợp",
        color: "#dc2626",
        sla_days: 0,
        exit_criteria: [],
        is_won: false,
        is_lost: true,
      },
    ],
  },
  {
    key: "GACC",
    name: "GACC — Đăng ký xuất khẩu Trung Quốc",
    service: "GACC",
    description: "Pipeline dịch vụ GACC (Nghị định 248)",
    sort_order: 2,
    stages: [
      {
        key: "lead_moi",
        name: "Lead mới",
        color: "#64748b",
        sla_days: 2,
        exit_criteria: [
          { key: "contacted", label: "Đã liên hệ được với khách", required: true },
          { key: "need_noted", label: "Đã ghi nhận nhu cầu sơ bộ", required: true },
        ],
        is_won: false,
        is_lost: false,
      },
      {
        key: "xac_nhan_nhu_cau",
        name: "Đã xác nhận nhu cầu",
        color: "#0ea5e9",
        sla_days: 3,
        exit_criteria: [
          { key: "need_clear", label: "Nhu cầu khách rõ ràng", required: true },
          { key: "fit_service", label: "Sản phẩm thuộc diện GACC", required: true },
          { key: "decision_maker", label: "Đã xác định người quyết định", required: true },
        ],
        is_won: false,
        is_lost: false,
      },
      {
        key: "da_tu_van",
        name: "Đã tư vấn",
        color: "#8b5cf6",
        sla_days: 5,
        exit_criteria: [
          { key: "plan_done", label: "Đã tư vấn hồ sơ + quy trình GACC", required: true },
          { key: "cost_time_ok", label: "Khách hiểu chi phí & thời gian", required: true },
          { key: "agree_quote", label: "Khách đồng ý nhận báo giá", required: true },
        ],
        is_won: false,
        is_lost: false,
      },
      {
        key: "da_gui_bao_gia",
        name: "Đã gửi báo giá",
        color: "#f59e0b",
        sla_days: 7,
        exit_criteria: [
          { key: "quote_sent", label: "Báo giá đã gửi (Zalo / Email)", required: true },
          { key: "quote_received", label: "Khách xác nhận đã nhận", required: true },
          { key: "reply_date", label: "Đã hẹn ngày phản hồi cụ thể", required: true },
        ],
        is_won: false,
        is_lost: false,
      },
      {
        key: "dang_can_nhac",
        name: "Đang cân nhắc",
        color: "#f97316",
        sla_days: 7,
        exit_criteria: [
          { key: "followup_done", label: "Đã follow-up ít nhất 1 lần", required: true },
          { key: "objection_done", label: "Đã xử lý objection chính", required: true },
          { key: "plan_confirmed", label: "Khách chốt phương án", required: true },
        ],
        is_won: false,
        is_lost: false,
      },
      {
        key: "cho_thanh_toan",
        name: "Chờ thanh toán",
        color: "#14b8a6",
        sla_days: 5,
        exit_criteria: [
          { key: "contract_sent", label: "Hợp đồng / báo giá chốt đã gửi", required: true },
          { key: "payment_info", label: "Thông tin thanh toán đã gửi", required: true },
          { key: "pay_date", label: "Đã hẹn ngày thanh toán", required: true },
        ],
        is_won: false,
        is_lost: false,
      },
      {
        key: "da_ky_hop_dong",
        name: "Đã ký hợp đồng",
        color: "#16a34a",
        sla_days: 0,
        exit_criteria: [],
        is_won: true,
        is_lost: false,
      },
      {
        key: "khong_phu_hop",
        name: "Không phù hợp",
        color: "#dc2626",
        sla_days: 0,
        exit_criteria: [],
        is_won: false,
        is_lost: true,
      },
    ],
  },
  {
    key: "SALE_EXPORT",
    name: "Sale xuất khẩu Mỹ",
    service: "SALE_EXPORT",
    description: "Pipeline dịch vụ sale xuất khẩu (veximtrade.com)",
    sort_order: 3,
    stages: [
      {
        key: "lead_moi",
        name: "Lead mới",
        color: "#64748b",
        sla_days: 2,
        exit_criteria: [
          { key: "contacted", label: "Đã liên hệ được với khách", required: true },
        ],
        is_won: false,
        is_lost: false,
      },
      {
        key: "da_lien_he",
        name: "Đã liên hệ",
        color: "#0ea5e9",
        sla_days: 3,
        exit_criteria: [
          { key: "need_clear", label: "Nhu cầu xuất khẩu rõ", required: true },
          { key: "decision_maker", label: "Đã xác định người quyết định", required: true },
        ],
        is_won: false,
        is_lost: false,
      },
      {
        key: "khao_sat_nhu_cau",
        name: "Khảo sát nhu cầu",
        color: "#8b5cf6",
        sla_days: 5,
        exit_criteria: [
          { key: "product_fit", label: "Sản phẩm phù hợp thị trường Mỹ", required: true },
          { key: "volume_ok", label: "Sản lượng / năng lực đáp ứng", required: true },
        ],
        is_won: false,
        is_lost: false,
      },
      {
        key: "da_gui_bao_gia",
        name: "Đã gửi báo giá",
        color: "#f59e0b",
        sla_days: 5,
        exit_criteria: [
          { key: "quote_sent", label: "Báo giá / proposal đã gửi", required: true },
          { key: "reply_date", label: "Đã hẹn ngày phản hồi", required: true },
        ],
        is_won: false,
        is_lost: false,
      },
      {
        key: "thuong_thao",
        name: "Thương thảo",
        color: "#f97316",
        sla_days: 7,
        exit_criteria: [
          { key: "terms_ok", label: "Đã thống nhất điều khoản chính", required: true },
        ],
        is_won: false,
        is_lost: false,
      },
      {
        key: "chot_hop_dong",
        name: "Chốt hợp đồng",
        color: "#16a34a",
        sla_days: 0,
        exit_criteria: [],
        is_won: true,
        is_lost: false,
      },
      {
        key: "khong_phu_hop",
        name: "Không phù hợp",
        color: "#dc2626",
        sla_days: 0,
        exit_criteria: [],
        is_won: false,
        is_lost: true,
      },
    ],
  },
  {
    key: "AMAZON_OPS",
    name: "Vận hành Amazon US",
    service: "AMAZON_OPS",
    description: "Pipeline dịch vụ Amazon US (veximops.com)",
    sort_order: 4,
    stages: [
      {
        key: "lead_moi",
        name: "Lead mới",
        color: "#64748b",
        sla_days: 2,
        exit_criteria: [
          { key: "contacted", label: "Đã liên hệ được với khách", required: true },
        ],
        is_won: false,
        is_lost: false,
      },
      {
        key: "da_lien_he",
        name: "Đã liên hệ",
        color: "#0ea5e9",
        sla_days: 3,
        exit_criteria: [
          { key: "need_clear", label: "Nhu cầu bán Amazon rõ", required: true },
          { key: "decision_maker", label: "Đã xác định người quyết định", required: true },
        ],
        is_won: false,
        is_lost: false,
      },
      {
        key: "audit_gian_hang",
        name: "Audit gian hàng / sản phẩm",
        color: "#8b5cf6",
        sla_days: 5,
        exit_criteria: [
          { key: "audit_done", label: "Đã audit sản phẩm / listing", required: true },
          { key: "potential_ok", label: "Đánh giá tiềm năng xong", required: true },
        ],
        is_won: false,
        is_lost: false,
      },
      {
        key: "de_xuat_phuong_an",
        name: "Đề xuất phương án",
        color: "#f59e0b",
        sla_days: 5,
        exit_criteria: [
          { key: "proposal_sent", label: "Proposal / báo giá đã gửi", required: true },
          { key: "reply_date", label: "Đã hẹn ngày phản hồi", required: true },
        ],
        is_won: false,
        is_lost: false,
      },
      {
        key: "thuong_thao",
        name: "Thương thảo",
        color: "#f97316",
        sla_days: 7,
        exit_criteria: [
          { key: "terms_ok", label: "Đã thống nhất điều khoản chính", required: true },
        ],
        is_won: false,
        is_lost: false,
      },
      {
        key: "chot_hop_dong",
        name: "Chốt hợp đồng",
        color: "#16a34a",
        sla_days: 0,
        exit_criteria: [],
        is_won: true,
        is_lost: false,
      },
      {
        key: "khong_phu_hop",
        name: "Không phù hợp",
        color: "#dc2626",
        sla_days: 0,
        exit_criteria: [],
        is_won: false,
        is_lost: true,
      },
    ],
  },
];

export function getPipelineDef(key: string): CrmPipelineDef | undefined {
  return PIPELINE_DEFS.find((p) => p.key === key);
}

/* ------------------------------- DB types -------------------------------- */

export type CrmPipeline = {
  id: number;
  key: string;
  name: string;
  service: string;
  description: string;
  is_active: boolean;
  sort_order: number;
  stages?: CrmStage[];
};

export type CrmStage = {
  id: number;
  pipeline_id: number;
  key: string;
  name: string;
  sort_order: number;
  color: string;
  sla_days: number;
  exit_criteria: CrmCriterion[];
  is_won: boolean;
  is_lost: boolean;
};

export type CrmOpportunity = {
  id: number;
  pipeline_id: number;
  stage_id: number;
  title: string;
  company_name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  industry: string;
  source: string;
  estimated_value: number;
  owner_id: number | null;
  owner_name?: string;
  next_action: string;
  next_action_date: string | null; // YYYY-MM-DD
  stage_entered_at: string;
  last_activity_at: string | null;
  expected_close_date: string | null;
  lost_reason: string;
  notes: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
};

export type CrmAlertType = "sla" | "stale" | "followup" | "no_action";

export type CrmAlert = { type: CrmAlertType; label: string; detail: string };

export type CrmOpportunityEnriched = CrmOpportunity & {
  pipeline_key: string;
  pipeline_name: string;
  stage_key: string;
  stage_name: string;
  stage_color: string;
  sla_days: number;
  is_won: boolean;
  is_lost: boolean;
  is_open: boolean;
  days_in_stage: number;
  days_since_activity: number | null;
  days_to_followup: number | null; // âm = quá hạn
  alerts: CrmAlert[];
  health: "good" | "warning" | "danger";
};

export type CrmStageHistory = {
  id: number;
  opportunity_id: number;
  from_stage_id: number | null;
  from_stage_name?: string;
  to_stage_id: number;
  to_stage_name?: string;
  duration_days: number;
  note: string;
  changed_by: number | null;
  changed_by_name?: string;
  created_at: string;
};

export type CrmActivityType =
  | "call"
  | "zalo"
  | "email"
  | "meeting"
  | "visit"
  | "quote"
  | "note"
  | "other";

export type CrmActivity = {
  id: number;
  opportunity_id: number;
  type: CrmActivityType;
  title: string;
  content: string;
  outcome: string;
  created_by: number | null;
  created_by_name?: string;
  created_at: string;
};

export type CrmChecklistState = {
  stage_key: string;
  criterion_key: string;
  is_checked: boolean;
  checked_by_name?: string;
  checked_at: string | null;
};

/* -------------------------------- constants ------------------------------ */

export const INDUSTRIES = [
  "Thực phẩm",
  "Thủy sản",
  "Nông sản",
  "Mỹ phẩm",
  "Dược phẩm / TPCN",
  "Đồ gỗ / Nội thất",
  "Dệt may",
  "Điện tử",
  "Bao bì",
  "Khác",
];

export const OPP_SOURCES = [
  "Website",
  "Zalo",
  "Facebook",
  "Giới thiệu",
  "Verify QR",
  "Telesale",
  "Hội chợ / Sự kiện",
  "Lead tư vấn",
  "Khác",
];

export const ACTIVITY_TYPES: Array<{ key: CrmActivityType; label: string }> = [
  { key: "call", label: "Gọi điện" },
  { key: "zalo", label: "Zalo" },
  { key: "email", label: "Email" },
  { key: "meeting", label: "Gặp mặt" },
  { key: "visit", label: "Thăm VP / xưởng" },
  { key: "quote", label: "Báo giá" },
  { key: "note", label: "Ghi chú" },
  { key: "other", label: "Khác" },
];

export const LOST_REASONS = [
  "Không có nhu cầu thực",
  "Giá cao / không đủ ngân sách",
  "Chọn đơn vị khác",
  "Chưa đủ điều kiện pháp lý",
  "Không liên hệ được",
  "Hoãn dự án",
  "Trùng / sai thông tin",
  "Lý do khác",
];

/** Số ngày không có hoạt động thì coi là "bị bỏ quên" */
export const STALE_DAYS = 14;

/* ------------------------------ health logic ----------------------------- */

/**
 * Tính "sức khỏe" của 1 cơ hội — trả lời câu hỏi 3, 4, 5.
 * Dùng chung cho cả Supabase và SQLite.
 */
export function enrichOpportunity(
  opp: CrmOpportunity,
  pipeline: CrmPipeline,
  stage: CrmStage,
  today = todayUtcIso()
): CrmOpportunityEnriched {
  const is_won = !!stage.is_won;
  const is_lost = !!stage.is_lost;
  const is_open = !is_won && !is_lost;

  const enteredDate = String(opp.stage_entered_at || opp.updated_at || opp.created_at).slice(0, 10);
  const days_in_stage = Math.max(0, daysBetween(enteredDate, today));

  const lastAct = opp.last_activity_at ? String(opp.last_activity_at).slice(0, 10) : null;
  const days_since_activity = lastAct
    ? Math.max(0, daysBetween(lastAct, today))
    : Math.max(0, daysBetween(String(opp.created_at).slice(0, 10), today));

  const days_to_followup = opp.next_action_date
    ? daysBetween(today, String(opp.next_action_date).slice(0, 10))
    : null;

  const alerts: CrmAlert[] = [];
  if (is_open) {
    if (stage.sla_days > 0 && days_in_stage > stage.sla_days) {
      alerts.push({
        type: "sla",
        label: `Quá SLA ${days_in_stage - stage.sla_days} ngày`,
        detail: `Ở "${stage.name}" ${days_in_stage} ngày (chuẩn ≤ ${stage.sla_days} ngày)`,
      });
    }
    if (days_since_activity !== null && days_since_activity >= STALE_DAYS) {
      alerts.push({
        type: "stale",
        label: `${days_since_activity} ngày chưa cập nhật`,
        detail: "Không có hoạt động nào — nguy cơ bị bỏ quên",
      });
    }
    if (days_to_followup !== null && days_to_followup < 0) {
      alerts.push({
        type: "followup",
        label: `Trễ follow-up ${Math.abs(days_to_followup)} ngày`,
        detail: opp.next_action || "Có hẹn follow-up nhưng đã quá hạn",
      });
    }
    if (!opp.next_action || !opp.next_action.trim()) {
      alerts.push({
        type: "no_action",
        label: "Chưa có bước tiếp theo",
        detail: "Cơ hội mở nhưng không có next action",
      });
    }
  }

  const health: CrmOpportunityEnriched["health"] = is_open
    ? alerts.some((a) => a.type === "sla" || a.type === "stale")
      ? "danger"
      : alerts.length > 0
        ? "warning"
        : "good"
    : "good";

  return {
    ...opp,
    pipeline_key: pipeline.key,
    pipeline_name: pipeline.name,
    stage_key: stage.key,
    stage_name: stage.name,
    stage_color: stage.color,
    sla_days: stage.sla_days,
    is_won,
    is_lost,
    is_open,
    days_in_stage,
    days_since_activity,
    days_to_followup,
    alerts,
    health,
  };
}

/* ---------------------------- transition rules --------------------------- */

export type TransitionCheck = { ok: boolean; missing: string[]; error?: string };

/**
 * Kiểm tra điều kiện chuyển giai đoạn.
 * - Chuyển TIẾN (sort_order tăng) hoặc sang WON: bắt buộc checklist exit của stage HIỆN TẠI.
 * - Chuyển sang LOST: bắt buộc lost_reason.
 * - Chuyển LÙI: cho phép, chỉ ghi log.
 */
export function validateTransition(input: {
  fromStage: CrmStage;
  toStage: CrmStage;
  checklist: Record<string, boolean>;
  lost_reason?: string;
}): TransitionCheck {
  const { fromStage, toStage, checklist, lost_reason } = input;
  if (fromStage.pipeline_id !== toStage.pipeline_id) {
    return { ok: false, missing: [], error: "Không thể chuyển khác pipeline." };
  }
  if (fromStage.id === toStage.id) {
    return { ok: false, missing: [], error: "Cơ hội đã ở giai đoạn này." };
  }
  if (toStage.is_lost) {
    if (!lost_reason || !lost_reason.trim()) {
      return { ok: false, missing: [], error: "Chuyển sang 'Không phù hợp' bắt buộc phải có lý do." };
    }
    return { ok: true, missing: [] };
  }
  const isForward = toStage.sort_order > fromStage.sort_order;
  if (isForward || toStage.is_won) {
    const missing = (fromStage.exit_criteria || [])
      .filter((c) => c.required && !checklist[c.key])
      .map((c) => c.label);
    if (missing.length > 0) {
      return {
        ok: false,
        missing,
        error: `Chưa đủ điều kiện rời "${fromStage.name}": ${missing.join("; ")}`,
      };
    }
  }
  return { ok: true, missing: [] };
}

/* ------------------------------- permissions ----------------------------- */

/**
 * Phân quyền CRM:
 * - admin: toàn quyền (xem/sửa/xóa/chuyển owner mọi cơ hội)
 * - specialist (sale): xem tất cả (minh bạch team), nhưng chỉ tạo + sửa +
 *   chuyển giai đoạn + ghi hoạt động trên cơ hội MÌNH LÀ OWNER. Không xóa, không đổi owner.
 */
export function canMutateOpportunity(user: SessionUser, opp: CrmOpportunity): boolean {
  if (user.role === "admin") return true;
  return opp.owner_id === user.id;
}

export function canDeleteOpportunity(user: SessionUser): boolean {
  return user.role === "admin";
}

export function canReassignOwner(user: SessionUser): boolean {
  return user.role === "admin";
}

export function formatCrmValue(n: number): string {
  if (!n || n <= 0) return "—";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(n % 1_000_000_000 === 0 ? 0 : 1)} tỷ`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)} tr`;
  return new Intl.NumberFormat("vi-VN").format(n);
}
