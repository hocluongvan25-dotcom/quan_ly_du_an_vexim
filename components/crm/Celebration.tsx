"use client";

import { useEffect } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { PartyPopper, X } from "lucide-react";

/** Fanfare chiến thắng: C – E – G – C ngân nga */
function playFanfare() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes: Array<[number, number, number]> = [
      [523.25, 0, 0.35], // C5
      [659.25, 0.15, 0.35], // E5
      [783.99, 0.3, 0.35], // G5
      [1046.5, 0.45, 0.8], // C6 ngân
    ];
    for (const [freq, start, dur] of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    }
  } catch {}
}

const BRAND = ["#E8B22A", "#F6D36B", "#FBEFCC", "#ffffff", "#16a34a"];

function fireCelebration() {
  const z = { zIndex: 9999, disableForReducedMotion: true };

  // 1. Bùm trung tâm
  confetti({
    ...z,
    particleCount: 160,
    spread: 100,
    origin: { y: 0.6 },
    colors: BRAND,
  });

  // 2. Hai pháo hai bên
  setTimeout(() => {
    confetti({ ...z, particleCount: 90, angle: 60, spread: 60, origin: { x: 0, y: 0.75 }, colors: BRAND });
    confetti({ ...z, particleCount: 90, angle: 120, spread: 60, origin: { x: 1, y: 0.75 }, colors: BRAND });
  }, 250);

  // 3. Mưa sao vàng
  setTimeout(() => {
    confetti({
      ...z,
      particleCount: 60,
      spread: 120,
      startVelocity: 25,
      gravity: 0.8,
      ticks: 220,
      origin: { y: 0.2 },
      colors: ["#E8B22A", "#F6D36B", "#FFF3C4"],
      shapes: ["star"],
      scalar: 1.4,
    });
  }, 600);

  // 4. Encore kết màn
  setTimeout(() => {
    confetti({
      ...z,
      particleCount: 220,
      spread: 130,
      origin: { y: 0.6 },
      colors: BRAND,
      scalar: 0.9,
    });
  }, 1100);
}

export function WinCelebration({
  companyName,
  valueLabel,
  ownerName,
  detailHref,
  pipelineKey,
  contactEmail,
  estimatedValue,
  onClose,
}: {
  companyName: string;
  valueLabel: string;
  ownerName: string;
  detailHref: string;
  pipelineKey: string;
  contactEmail?: string;
  estimatedValue?: number;
  onClose: () => void;
}) {
  const needsRecord = pipelineKey === "FDA" || pipelineKey === "GACC";
  const recordHref = needsRecord
    ? `/dashboard/ho-so/moi?${new URLSearchParams({
        standard: pipelineKey,
        company: companyName,
        ...(contactEmail ? { email: contactEmail } : {}),
        ...(estimatedValue ? { price: String(estimatedValue) } : {}),
      }).toString()}`
    : "";
  useEffect(() => {
    fireCelebration();
    playFanfare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-[2px]">
      <div className="relative w-full max-w-md overflow-hidden rounded-[28px] bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 p-[2px] shadow-lift">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-teal-500/30 blur-2xl" />
        <div className="absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-gold-400/20 blur-2xl" />
        <div className="relative rounded-[26px] bg-gradient-to-b from-white to-[#fff6e4] px-6 py-8 text-center">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-4xl shadow-lift">
            🏆
          </div>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.2em] text-teal-700">
            <PartyPopper className="h-4 w-4" /> Chốt deal thành công
          </div>
          <h3 className="mt-2 font-display text-2xl font-extrabold text-navy-900">{companyName}</h3>
          <p className="mt-1 text-sm font-semibold text-navy-900/60">
            {ownerName} vừa mang về <span className="font-extrabold text-teal-700">{valueLabel}</span>
          </p>

          <div className="mx-auto mt-4 max-w-[280px] rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700">
            🎉 Tuyệt vời! Cứ thế phát huy nhé!
          </div>

          {needsRecord && (
            <Link
              href={recordHref}
              onClick={onClose}
              className="mt-4 block rounded-xl bg-teal-500 py-3 text-sm font-extrabold text-navy-950 shadow-lift hover:bg-teal-400"
            >
              📁 Tạo hồ sơ {pipelineKey} cho khách này →
            </Link>
          )}
          {needsRecord && (
            <p className="mt-2 text-[11px] font-semibold text-navy-900/50">
              Nhớ tạo hồ sơ để bắt đầu triển khai nhé! (Đã điền sẵn tên công ty & giá trị deal)
            </p>
          )}

          <div className="mt-5 flex gap-2">
            <Link
              href={detailHref}
              onClick={onClose}
              className="flex-1 rounded-xl border border-navy-900/15 bg-white py-2.5 text-sm font-bold text-navy-900 hover:bg-slate-50"
            >
              Xem cơ hội
            </Link>
            <button
              onClick={onClose}
              className="flex-1 rounded-xl bg-navy-900 py-2.5 text-sm font-bold text-white hover:bg-navy-800"
            >
              Tuyệt vời! 💪
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
