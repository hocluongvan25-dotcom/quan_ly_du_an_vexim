"use client";

import { Check, ShieldAlert, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";

export function ValiditySeal({
  valid,
  confirmed,
  size = "md",
  className,
}: {
  valid: boolean;
  confirmed?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { t } = useI18n();
  const dims =
    size === "lg"
      ? "h-28 w-28 text-[15px]"
      : size === "sm"
        ? "h-14 w-14 text-[9px]"
        : "h-20 w-20 text-[11px]";

  if (!confirmed && !valid) {
    return (
      <div
        className={cn(
          "grid place-items-center rounded-full border-2 border-dashed border-navy-900/20 bg-white/70 text-navy-900/45",
          dims,
          className
        )}
      >
        <div className="text-center font-display font-extrabold tracking-widest">PENDING</div>
      </div>
    );
  }

  if (!valid) {
    return (
      <div
        className={cn(
          "grid place-items-center rounded-full border-[3px] border-rose-500 bg-rose-50 text-rose-600",
          dims,
          className
        )}
      >
        <div className="flex flex-col items-center">
          <ShieldAlert className="mb-0.5 h-6 w-6" />
          <span className="font-display font-extrabold tracking-[0.18em]">{t("status.expired")}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "seal-pulse grid place-items-center rounded-full border-[3px] border-emerald-500 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-[0_10px_30px_rgba(16,185,129,0.35)]",
        dims,
        className
      )}
    >
      <div className="flex flex-col items-center">
        {size === "lg" ? <ShieldCheck className="mb-1 h-8 w-8" /> : <Check className="mb-0.5 h-5 w-5" strokeWidth={3} />}
        <span className="font-display font-extrabold tracking-[0.22em]">{t("status.valid")}</span>
      </div>
    </div>
  );
}
