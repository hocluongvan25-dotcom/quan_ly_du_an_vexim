import type { Role, SessionUser } from "./types";

/**
 * Ma trận quyền CRM.
 *
 * Nguyên tắc của VEXIM CRM: CRM là hệ thống vận hành để đội sales tạo doanh thu,
 * không phải công cụ nhập báo cáo. Vì vậy quyền được chia theo "ai phải hành động":
 *
 *  - Founder/Admin : nhìn thấy mọi thứ, không thao tác vận hành hằng ngày.
 *  - AE            : Pipeline Owner của team mình — phân công, đổi owner, đổi stage.
 *  - SR            : research + qualification trên lead (của mình, của team hoặc chưa ai nhận).
 *  - LR            : tạo nguồn lead, bổ sung contact/company information.
 */

export type CrmPermission =
  | "crm.access"
  | "crm.view_all"
  | "crm.view_team"
  | "crm.create_lead"
  | "crm.edit_lead"
  | "crm.assign_lead"
  | "crm.convert_lead"
  | "crm.qualify_lead"
  | "crm.create_opportunity"
  | "crm.edit_opportunity"
  | "crm.change_stage"
  | "crm.reassign"
  | "crm.log_activity"
  | "crm.review_activity"
  | "crm.view_dashboard"
  | "crm.view_performance"
  | "certificate.manage";

const MATRIX: Record<Role, CrmPermission[]> = {
  admin: [
    "crm.access",
    "crm.view_all",
    "crm.view_team",
    "crm.create_lead",
    "crm.edit_lead",
    "crm.assign_lead",
    "crm.convert_lead",
    "crm.qualify_lead",
    "crm.create_opportunity",
    "crm.edit_opportunity",
    "crm.change_stage",
    "crm.reassign",
    "crm.log_activity",
    "crm.review_activity",
    "crm.view_dashboard",
    "crm.view_performance",
    "certificate.manage",
  ],
  ae: [
    "crm.access",
    "crm.view_team",
    "crm.create_lead",
    "crm.edit_lead",
    "crm.assign_lead",
    "crm.convert_lead",
    "crm.qualify_lead",
    "crm.create_opportunity",
    "crm.edit_opportunity",
    "crm.change_stage",
    "crm.reassign",
    "crm.log_activity",
    "crm.review_activity",
    "crm.view_dashboard",
    "certificate.manage",
  ],
  sr: ["crm.access", "crm.create_lead", "crm.edit_lead", "crm.qualify_lead", "crm.log_activity"],
  lr: ["crm.access", "crm.create_lead", "crm.edit_lead", "crm.log_activity"],
  // Bộ phận chuyên môn không có vai trò nào trong CRM.
  specialist: ["certificate.manage"],
};

export function permissionsOf(role: Role): CrmPermission[] {
  return MATRIX[role] || [];
}

export function can(role: Role | undefined, permission: CrmPermission) {
  if (!role) return false;
  return (MATRIX[role] || []).includes(permission);
}

export function canUser(user: SessionUser | null, permission: CrmPermission) {
  return can(user?.role, permission);
}

/**
 * Có được vào CRM hay không. Founder/AE/SR/LR có; bộ phận chuyên môn không.
 * Dùng làm cổng cho toàn bộ trang và API dưới /dashboard/crm và /api/crm.
 */
export function hasCrmAccess(user: SessionUser | null) {
  return can(user?.role, "crm.access");
}

/** Founder/Admin nhìn thấy toàn bộ dữ liệu. */
export function seesAll(role: Role | undefined) {
  return role === "admin";
}

/** AE là Pipeline Owner của team: nhìn thấy toàn bộ lead/opportunity của team. */
export function isTeamLeader(role: Role | undefined) {
  return role === "ae" || role === "admin";
}

/**
 * Phạm vi dữ liệu một user được nhìn thấy.
 *  - all        : mọi bản ghi
 *  - team       : mọi bản ghi có team_id = team của user
 *  - owned      : bản ghi do user tạo hoặc được giao
 */
export type Scope = "all" | "team" | "owned";

export function scopeOf(user: SessionUser | null): Scope {
  if (!user) return "owned";
  if (seesAll(user.role)) return "all";
  if (user.role === "ae") return user.team_id ? "team" : "owned";
  return "owned";
}

export type CrmScopeFilter = {
  scope: Scope;
  userId: number;
  teamId: number | null;
};

export function scopeFilter(user: SessionUser | null): CrmScopeFilter {
  return {
    scope: scopeOf(user),
    userId: user?.id || 0,
    teamId: user?.team_id ?? null,
  };
}

/**
 * Danh sách (pipeline board, dashboard) chỉ hiển thị đúng phạm vi:
 *  - Founder: toàn công ty
 *  - AE: team của mình
 *  - SR/LR: việc của chính mình + lead chưa ai nhận
 */
export function inListScope(
  user: SessionUser | null,
  record: { owner_id: number | null; team_id: number | null; created_by?: number }
) {
  if (!user) return false;
  const scope = scopeOf(user);
  if (scope === "all") return true;
  if (scope === "team") {
    if (record.team_id != null && user.team_id != null && record.team_id === user.team_id) return true;
    return record.owner_id === user.id || record.created_by === user.id;
  }
  return record.owner_id === null || record.owner_id === user.id || record.created_by === user.id;
}

/**
 * Quyền MỞ một bản ghi cụ thể. Rộng hơn danh sách một chút:
 * SR/LR được research chéo lead trong cùng team (đúng trách nhiệm của họ),
 * nhưng KHÔNG được nhìn pipeline cơ hội của cả team — vì vậy phải truyền `kind`.
 */
export function canSeeRecord(
  user: SessionUser | null,
  record: { owner_id: number | null; team_id: number | null; created_by?: number },
  kind: "lead" | "opportunity" = "lead"
) {
  if (!user) return false;
  if (inListScope(user, record)) return true;
  if (kind === "opportunity") return false;
  return (
    ["sr", "lr"].includes(user.role) &&
    record.team_id != null &&
    user.team_id != null &&
    record.team_id === user.team_id
  );
}
