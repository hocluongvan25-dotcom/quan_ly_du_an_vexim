export type Role = "admin" | "specialist" | "ae" | "sr" | "lr";
export type Standard = "FDA" | "GACC";
export type CertificateStatus = "draft" | "published" | "expired";

export type User = {
  id: number;
  email: string;
  name: string;
  role: Role;
  team_id: number | null;
  created_at: string;
};

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: Role;
  team_id: number | null;
};

export type Certificate = {
  id: number;
  public_code: string;
  certificate_no: string;
  standard: Standard;
  registration_code: string;
  service_price: number;
  company_name: string;
  scope: string;
  registered_at: string;
  expires_at: string;
  validity_confirmed: number;
  status: CertificateStatus;
  published_at: string | null;
  revenue_recorded: number;
  renewal_count: number;
  last_renewed_at: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
};

export type PublicCertificate = {
  public_code: string;
  certificate_no: string;
  standard: Standard;
  registration_code: string;
  company_name: string;
  scope: string;
  registered_at: string;
  expires_at: string;
  validity_confirmed: boolean;
  status: CertificateStatus;
  remaining_ms: number;
  remaining_days: number;
  total_days: number;
  elapsed_days: number;
  is_valid: boolean;
};

/* ------------------------------------------------------------------ *
 * CRM — Sales Operation Management
 * ------------------------------------------------------------------ */

/** Lead đã được chuyển thành opportunity hay chưa. */
export type LeadStatus = "new" | "contacted" | "qualified" | "unqualified" | "converted";

/** Nguồn lead — dùng để đo chất lượng từng kênh. */
export type LeadSource =
  | "referral"
  | "website"
  | "trade_show"
  | "outbound"
  | "social"
  | "list_import"
  | "other";

/** Các stage của pipeline. Thứ tự trong CRM_STAGES là thứ tự tiến. */
export type OpportunityStage =
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export type ActivityType =
  | "research_note"
  | "qualification"
  | "call"
  | "email"
  | "meeting"
  | "whatsapp"
  | "task"
  | "note";

export type Team = {
  id: number;
  name: string;
  ae_id: number | null;
  created_at: string;
  ae_name?: string;
  member_count?: number;
};

export type CrmLead = {
  id: number;
  code: string;
  company_name: string;
  contact_name: string;
  contact_title: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  country: string;
  industry: string;
  employee_size: string;
  annual_revenue: string;
  main_products: string;
  target_market: string;
  current_standards: string;
  pain_points: string;
  notes: string;
  source: LeadSource;
  source_detail: string;
  status: LeadStatus;
  quality_score: number;
  created_by: number;
  owner_id: number | null;
  team_id: number | null;
  assigned_at: string | null;
  last_activity_at: string | null;
  converted_opportunity_id: number | null;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  owner_name?: string;
  opportunity_code?: string;
  /** Hồ sơ gắn trên chính lead này. */
  certificate_id?: number | null;
  /** Hồ sơ gắn trên opportunity đã chuyển đổi (nếu có) — để không lẫn với certificate_id. */
  opportunity_certificate_id?: number | null;
};

export type CrmOpportunity = {
  id: number;
  code: string;
  title: string;
  lead_id: number | null;
  company_name: string;
  standard: Standard | null;
  stage: OpportunityStage;
  stage_entered_at: string;
  stage_changed_by: number | null;
  value: number;
  probability: number;
  currency: string;
  owner_id: number | null;
  team_id: number | null;
  expected_close_date: string | null;
  closed_at: string | null;
  lost_reason: string;
  next_action: string;
  next_action_due: string | null;
  next_action_owner_id: number | null;
  last_activity_at: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  owner_name?: string;
  lead_code?: string;
  lead_company?: string;
  /** Hồ sơ FDA/GACC gắn trên chính cơ hội này. */
  certificate_id?: number | null;
  /** Hồ sơ gắn trên lead nguồn (nếu có). */
  lead_certificate_id?: number | null;
  next_action_owner_name?: string;
};

export type CrmActivity = {
  id: number;
  lead_id: number | null;
  opportunity_id: number | null;
  type: ActivityType;
  subject: string;
  content: string;
  performed_at: string;
  created_by: number;
  is_follow_up: number;
  due_at: string | null;
  completed_at: string | null;
  created_by_name?: string;
  company_name?: string;
  owner_name?: string;
};

export type CrmStageEvent = {
  id: number;
  opportunity_id: number;
  from_stage: OpportunityStage | null;
  to_stage: OpportunityStage;
  changed_by: number | null;
  note: string;
  changed_at: string;
  changed_by_name?: string;
};

export type CrmCustomer = {
  id: number;
  company_name: string;
  opportunity_id: number;
  opportunity_code: string;
  value: number;
  standard: Standard | null;
  won_at: string;
  owner_name?: string;
  certificate_id?: number | null;
  certificate_no?: string;
};

/** Số ngày không có hoạt động thì opportunity bị coi là "stale". */
export const STALE_DAYS = 7;

export const CRM_STAGES: Array<{
  key: OpportunityStage;
  label: string;
  short: string;
  probability: number;
  closed: boolean;
}> = [
  { key: "contacted", label: "Đã liên hệ", short: "Liên hệ", probability: 20, closed: false },
  { key: "qualified", label: "Đã qualify", short: "Qualify", probability: 40, closed: false },
  { key: "proposal", label: "Đã gửi báo giá", short: "Báo giá", probability: 60, closed: false },
  { key: "negotiation", label: "Đang đàm phán", short: "Đàm phán", probability: 80, closed: false },
  { key: "won", label: "Thắng deal", short: "Won", probability: 100, closed: true },
  { key: "lost", label: "Mất deal", short: "Lost", probability: 0, closed: true },
];

export const OPEN_STAGES = CRM_STAGES.filter((s) => !s.closed).map((s) => s.key);

export const STAGE_PROBABILITY: Record<OpportunityStage, number> = CRM_STAGES.reduce(
  (acc, s) => ({ ...acc, [s.key]: s.probability }),
  {} as Record<OpportunityStage, number>
);

export const STAGE_LABEL: Record<OpportunityStage, string> = CRM_STAGES.reduce(
  (acc, s) => ({ ...acc, [s.key]: s.label }),
  {} as Record<OpportunityStage, string>
);

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "Lead mới",
  contacted: "Đã liên hệ",
  qualified: "Đủ điều kiện",
  unqualified: "Không đủ điều kiện",
  converted: "Đã chuyển cơ hội",
};

export const LEAD_SOURCE_LABEL: Record<LeadSource, string> = {
  referral: "Giới thiệu",
  website: "Website",
  trade_show: "Hội chợ / triển lãm",
  outbound: "Outbound (SR/LR tìm)",
  social: "Mạng xã hội",
  list_import: "Import danh sách",
  other: "Nguồn khác",
};

export const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = {
  research_note: "Research note",
  qualification: "Qualification",
  call: "Cuộc gọi",
  email: "Email",
  meeting: "Gặp mặt",
  whatsapp: "Chat / Zalo",
  task: "Việc cần làm",
  note: "Ghi chú nội bộ",
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Founder / Admin",
  ae: "AE — Sales Leader",
  sr: "SR — Sales Research",
  lr: "LR — Lead Research",
  specialist: "Bộ phận chuyên môn",
};

export const ROLE_SHORT: Record<Role, string> = {
  admin: "Founder",
  ae: "AE",
  sr: "SR",
  lr: "LR",
  specialist: "Chuyên môn",
};

export const ROLE_DUTY: Record<Role, string> = {
  admin:
    "Xem toàn bộ dữ liệu, dashboard tổng thể, pipeline doanh thu và hiệu suất từng team/member. Không quản lý task hằng ngày.",
  ae: "Pipeline Owner: phân công lead, quản lý opportunity, review hoạt động SR/LR, kiểm tra follow-up.",
  sr: "Research doanh nghiệp, qualification, bổ sung dữ liệu và viết research note.",
  lr: "Tạo nguồn lead, thu thập thông tin contact / company ban đầu.",
  specialist: "Điền và xuất bản hồ sơ FDA / GACC sau khi đăng ký xong.",
};

export const CRM_ROLES: Role[] = ["admin", "ae", "sr", "lr", "specialist"];

export const COMPANY = {
  name: "Vexim Global",
  legal: "CÔNG TY TNHH VEXIM GLOBAL",
  address: "Số 25/6/51 Ngọa Long, Tây Tựu, Bắc Từ Liêm, Hà Nội",
  phone: "0373 685 634",
  phoneHref: "tel:0373685634",
  email: "contact@veximglobal.com",
  website: "https://www.veximglobal.com",
  websiteLabel: "www.veximglobal.com",
  hours: "T2–T6: 8:00–18:00 · T7: 8:00–12:00",
};

export const STANDARD_YEARS: Record<Standard, number> = {
  FDA: 2,
  GACC: 5,
};
