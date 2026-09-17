"use client";

import { useEffect, useState } from "react";
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

export type AutoContractInfo = {
  id: number;
  contract_no: string;
  started_at: string;
  cycle_months: number;
};

export function WinCelebration({
  companyName,
  valueLabel,
  ownerName,
  detailHref,
  pipelineKey,
  contactEmail,
  estimatedValue,
  autoContract,
  onClose,
}: {
  companyName: string;
  valueLabel: string;
  ownerName: string;
  detailHref: string;
  pipelineKey: string;
  contactEmail?: string;
  estimatedValue?: number;
  autoContract?: AutoContractInfo | null;
  onClose: () => void;
}) {
  const [confirmStart, setConfirmStart] = useState(autoContract?.started_at || "");
  const [confirmCycle, setConfirmCycle] = useState(String(autoContract?.cycle_months || 6));
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmErr, setConfirmErr] = useState("");

  const confirmContract = async () => {
    if (!autoContract || confirming) return;
    setConfirming(true);
    setConfirmErr("");
    try {
      const r = await fetch(`/api/service-contracts/${autoContract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ started_at: confirmStart, cycle_months: Number(confirmCycle) }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Xác nhận thất bại");
      setConfirmed(true);
    } catch (e: any) {
      setConfirmErr(e.message);
    } finally {
      setConfirming(false);
    }
  };
  const isCert = pipelineKey === "FDA" || pipelineKey === "GACC";
  const isService = pipelineKey === "SALE_EXPORT" || pipelineKey === "AMAZON_OPS";
  const needsRecord = isCert || isService;
  const recordLabel =
    pipelineKey === "SALE_EXPORT" ? "Sale XK" : pipelineKey === "AMAZON_OPS" ? "Amazon" : pipelineKey;
  const sharedQs = new URLSearchParams({
    company: companyName,
    ...(contactEmail ? { email: contactEmail } : {}),
    ...(estimatedValue ? { price: String(estimatedValue) } : {}),
  }).toString();
  const recordHref = isCert
    ? `/dashboard/ho-so/moi?standard=${pipelineKey}&${sharedQs}`
    : isService
      ? `/dashboard/dich-vu/moi?service=${pipelineKey}&${sharedQs}`
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

          {isCert && (
            <Link
              href={recordHref}
              onClick={onClose}
              className="mt-4 block rounded-xl bg-teal-500 py-3 text-sm font-extrabold text-navy-950 shadow-lift hover:bg-teal-400"
            >
              📁 Tạo hồ sơ {recordLabel} cho khách này →
            </Link>
          )}
          {isCert && (
            <p className="mt-2 text-[11px] font-semibold text-navy-900/50">
              Nhớ tạo hồ sơ để bắt đầu triển khai nhé! (Đã điền sẵn tên công ty & giá trị deal)
            </p>
          )}

          {/* Sale/Amazon: HĐ đã tự sinh từ deal — chỉ xác nhận ngày bắt đầu + chu kỳ */}
          {isService && autoContract && !confirmed && (
            <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50/70 p-4 text-left">
              <div className="text-sm font-extrabold text-navy-900">
                ✅ Đã tự tạo HĐ <span className="font-mono">{autoContract.contract_no}</span>
              </div>
              <p className="mt-0.5 text-[11px] font-semibold text-navy-900/55">
                Thông tin lấy từ deal. Chốt giúp 2 dòng này là xong:
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="block text-[11px] font-bold text-navy-900">
                  Ngày bắt đầu
                  <input
                    type="date"
                    value={confirmStart}
                    onChange={(e) => setConfirmStart(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-navy-900/10 bg-white px-2 py-2 text-sm font-normal"
                  />
                </label>
                <label className="block text-[11px] font-bold text-navy-900">
                  Chu kỳ (tháng)
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={confirmCycle}
                    onChange={(e) => setConfirmCycle(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-navy-900/10 bg-white px-2 py-2 text-sm font-normal"
                  />
                </label>
              </div>
              <div className="mt-1.5 flex gap-1.5">
                {[3, 6, 12].map((m) => (
                  <button
                    key={m}
                    onClick={() => setConfirmCycle(String(m))}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold ${
                      Number(confirmCycle) === m ? "bg-navy-900 text-white" : "bg-white text-slate-500"
                    }`}
                  >
                    {m}T
                  </button>
                ))}
                <span className="ml-auto self-center text-[10px] font-semibold text-navy-900/45">
                  nhập tay số khác đều được
                </span>
              </div>
              {confirmErr && <div className="mt-2 text-xs font-bold text-red-600">{confirmErr}</div>}
              <div className="mt-2.5 flex gap-2">
                <button
                  onClick={confirmContract}
                  disabled={confirming || !confirmStart}
                  className="flex-1 rounded-xl bg-teal-500 py-2.5 text-sm font-extrabold text-navy-950 disabled:opacity-50"
                >
                  {confirming ? "Đang lưu…" : "Xác nhận hợp đồng"}
                </button>
                <button
                  onClick={onClose}
                  className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-navy-900"
                >
                  Để sau
                </button>
              </div>
            </div>
          )}
          {isService && autoContract && confirmed && (
            <Link
              href={`/dashboard/dich-vu/${autoContract.id}`}
              onClick={onClose}
              className="mt-4 block rounded-xl bg-teal-500 py-3 text-sm font-extrabold text-navy-950 shadow-lift hover:bg-teal-400"
            >
              🎉 Đã xác nhận — xem hợp đồng {autoContract.contract_no} →
            </Link>
          )}
          {isService && !autoContract && (
            <Link
              href={recordHref}
              onClick={onClose}
              className="mt-4 block rounded-xl bg-teal-500 py-3 text-sm font-extrabold text-navy-950 shadow-lift hover:bg-teal-400"
            >
              📁 Tạo hợp đồng {recordLabel} cho khách này →
            </Link>
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
