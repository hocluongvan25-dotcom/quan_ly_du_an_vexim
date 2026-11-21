"use client";

import { useEffect, useMemo, useState } from "react";
import { countdownFor } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";

export function CountdownRing({
  registeredAt,
  expiresAt,
  running,
}: {
  registeredAt: string;
  expiresAt: string;
  running: boolean;
}) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  // Luôn tính từ bây giờ: hồ sơ nháp quá hạn cũng phải hiện đã hết hạn, không hiện lại cả kỳ hạn
  const state = useMemo(
    () => countdownFor(registeredAt, expiresAt, new Date(now)),
    [registeredAt, expiresAt, now]
  );
  const { remainMs, totalMs, days, hours, minutes, seconds, expired, lastDay } = state;
  const pct = Math.max(0, Math.min(1, remainMs / totalMs));

  const summary = expired
    ? t("countdown.expired")
    : lastDay
      ? t("countdown.lastDay")
      : t("countdown.remaining", { days });
  const r = 54;
  const c = 2 * Math.PI * r;
  const dash = c * pct;

  const items = [
    { label: t("countdown.days"), value: days },
    { label: t("countdown.hours"), value: hours },
    { label: t("countdown.minutes"), value: minutes },
    { label: t("countdown.seconds"), value: seconds },
  ];

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
          <circle cx="64" cy="64" r={r} fill="none" stroke="#f3e6c2" strokeWidth="10" />
          {/* Hết hạn thì không vẽ cung tiến độ, tránh chấm tròn lạ ở đỉnh vòng */}
          {!expired && (
            <circle
              cx="64"
              cy="64"
              r={r}
              fill="none"
              stroke={pct > 0.15 ? "#E8B22A" : "#e11d48"}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c}`}
            />
          )}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="font-display text-2xl font-extrabold text-navy-900">
              {days}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-navy-900/50">
              {expired
                ? t("countdown.expired")
                : `${t("countdown.days")} ${t("common.days") === "ngày" ? "còn lại" : "remaining"}`}
            </div>
          </div>
        </div>
      </div>
      <div className="grid w-full grid-cols-4 gap-2">
        {items.map((it) => (
          <div
            key={it.label}
            className="rounded-2xl bg-navy-900 px-1 py-2.5 text-center text-white shadow-card"
          >
            <div className="font-display text-lg font-bold tabular-nums">
              {String(it.value).padStart(2, "0")}
            </div>
            <div className="text-[9px] uppercase tracking-wider text-white/60">{it.label}</div>
          </div>
        ))}
      </div>
      <p className="max-w-xs text-center text-[11px] leading-relaxed text-navy-900/55">
        {summary}
      </p>
    </div>
  );
}
