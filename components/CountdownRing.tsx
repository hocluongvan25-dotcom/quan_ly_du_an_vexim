"use client";

import { useEffect, useMemo, useState } from "react";
import { remainingMs, splitCountdown } from "@/lib/utils";
export function CountdownRing({
  registeredAt,
  expiresAt,
  running,
}: {
  registeredAt: string;
  expiresAt: string;
  running: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  const { remain, total, parts } = useMemo(() => {
    const start = new Date(registeredAt.slice(0, 10) + "T00:00:00").getTime();
    const end = new Date(expiresAt.slice(0, 10) + "T23:59:59").getTime();
    const totalMs = Math.max(1, end - start);
    const remainMs = running ? remainingMs(expiresAt, new Date(now)) : totalMs;
    return {
      remain: remainMs,
      total: totalMs,
      parts: splitCountdown(remainMs),
    };
  }, [registeredAt, expiresAt, now, running]);

  const pct = Math.max(0, Math.min(1, remain / total));
  const r = 54;
  const c = 2 * Math.PI * r;
  const dash = c * pct;

  const items = [
    { label: "Days", value: parts.days },
    { label: "Hours", value: parts.hours },
    { label: "Minutes", value: parts.minutes },
    { label: "Seconds", value: parts.seconds },
  ];

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
          <circle cx="64" cy="64" r={r} fill="none" stroke="#f3e6c2" strokeWidth="10" />
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
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="font-display text-2xl font-extrabold text-navy-900">
              {Math.ceil(remain / 86400000)}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-navy-900/50">
              days remaining
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
        Validity clock counts from expiry date back to registration date — remaining time of the certificate.
      </p>
    </div>
  );
}
