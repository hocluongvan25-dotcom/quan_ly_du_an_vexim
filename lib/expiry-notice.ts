/**
 * Shared presentation for the expiry-notification batches.
 * Kept free of server-only imports so email templates and client UI use one palette.
 */
export type NotificationType =
  | "90_days"
  | "60_days"
  | "30_days"
  | "14_days"
  | "7_days"
  | "3_days"
  | "1_day"
  | "expired"
  | "renewal_reminder";

export type ExpiryStagePresentation = {
  labelVi: string;
  labelEn: string;
  /** Remaining-days band used in the dashboard legend. */
  bandLabel: string;
  urgency: "low" | "medium" | "high" | "critical" | "complete";
  email: {
    accent: string;
    background: string;
    border: string;
  };
  badgeClass: string;
  cardClass: string;
  markerClass: string;
};

export const EXPIRY_STAGE_ORDER: NotificationType[] = [
  "90_days",
  "60_days",
  "30_days",
  "14_days",
  "7_days",
  "3_days",
  "1_day",
  "expired",
];

export const EXPIRY_STAGE_PRESENTATION: Record<NotificationType, ExpiryStagePresentation> = {
  "90_days": {
    labelVi: "Còn 90 ngày",
    labelEn: "90 days remaining",
    bandLabel: "Trên 60 ngày",
    urgency: "low",
    email: { accent: "#1D4ED8", background: "#EFF6FF", border: "#BFDBFE" },
    badgeClass: "border-blue-200 bg-blue-50 text-blue-800",
    cardClass: "border-blue-200 bg-blue-50/40",
    markerClass: "border-l-blue-500",
  },
  "60_days": {
    labelVi: "Còn 60 ngày",
    labelEn: "60 days remaining",
    bandLabel: "31–60 ngày",
    urgency: "low",
    email: { accent: "#0E7490", background: "#ECFEFF", border: "#A5F3FC" },
    badgeClass: "border-cyan-200 bg-cyan-50 text-cyan-900",
    cardClass: "border-cyan-200 bg-cyan-50/40",
    markerClass: "border-l-cyan-600",
  },
  "30_days": {
    labelVi: "Còn 30 ngày",
    labelEn: "30 days remaining",
    bandLabel: "15–30 ngày",
    urgency: "medium",
    email: { accent: "#A16207", background: "#FFFBEB", border: "#FDE68A" },
    badgeClass: "border-amber-300 bg-amber-50 text-amber-900",
    cardClass: "border-amber-200 bg-amber-50/40",
    markerClass: "border-l-amber-500",
  },
  "14_days": {
    labelVi: "Còn 14 ngày",
    labelEn: "14 days remaining",
    bandLabel: "8–14 ngày",
    urgency: "medium",
    email: { accent: "#C2410C", background: "#FFF7ED", border: "#FED7AA" },
    badgeClass: "border-orange-300 bg-orange-50 text-orange-900",
    cardClass: "border-orange-200 bg-orange-50/40",
    markerClass: "border-l-orange-500",
  },
  "7_days": {
    labelVi: "Còn 7 ngày",
    labelEn: "7 days remaining",
    bandLabel: "4–7 ngày",
    urgency: "high",
    email: { accent: "#BE123C", background: "#FFF1F2", border: "#FECDD3" },
    badgeClass: "border-rose-300 bg-rose-50 text-rose-900",
    cardClass: "border-rose-200 bg-rose-50/40",
    markerClass: "border-l-rose-600",
  },
  "3_days": {
    labelVi: "Còn 3 ngày",
    labelEn: "3 days remaining",
    bandLabel: "2–3 ngày",
    urgency: "high",
    email: { accent: "#B91C1C", background: "#FEF2F2", border: "#FECACA" },
    badgeClass: "border-red-300 bg-red-100 text-red-900",
    cardClass: "border-red-200 bg-red-50/50",
    markerClass: "border-l-red-600",
  },
  "1_day": {
    labelVi: "Còn 1 ngày",
    labelEn: "1 day remaining",
    bandLabel: "0–1 ngày",
    urgency: "critical",
    email: { accent: "#991B1B", background: "#FEE2E2", border: "#FCA5A5" },
    badgeClass: "border-red-400 bg-red-200 text-red-950",
    cardClass: "border-red-300 bg-red-50/70",
    markerClass: "border-l-red-800",
  },
  expired: {
    labelVi: "Đã hết hạn",
    labelEn: "Expired",
    bandLabel: "Đã quá hạn",
    urgency: "critical",
    email: { accent: "#7F1D1D", background: "#FEF2F2", border: "#FECACA" },
    badgeClass: "border-red-900 bg-red-800 text-white",
    cardClass: "border-red-300 bg-red-100/70",
    markerClass: "border-l-red-950",
  },
  renewal_reminder: {
    labelVi: "Đã gia hạn",
    labelEn: "Renewal confirmed",
    bandLabel: "Đã gia hạn",
    urgency: "complete",
    email: { accent: "#047857", background: "#ECFDF5", border: "#A7F3D0" },
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
    cardClass: "border-emerald-200 bg-emerald-50/40",
    markerClass: "border-l-emerald-500",
  },
};

/**
 * Map a live remaining-day count to the nearest reminder band for dashboard colors.
 * The number shown to staff remains the exact remaining-day count.
 */
export function expiryStageForRemaining(remainingDays: number): NotificationType {
  if (remainingDays < 0) return "expired";
  if (remainingDays <= 1) return "1_day";
  if (remainingDays <= 3) return "3_days";
  if (remainingDays <= 7) return "7_days";
  if (remainingDays <= 14) return "14_days";
  if (remainingDays <= 30) return "30_days";
  if (remainingDays <= 60) return "60_days";
  return "90_days";
}

export function expiryStagePresentation(type: NotificationType): ExpiryStagePresentation {
  return EXPIRY_STAGE_PRESENTATION[type];
}
