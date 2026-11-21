"use client";

import { useEffect } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { ArrowRight, PartyPopper, X } from "lucide-react";

function fireCelebration() {
  confetti({
    zIndex: 9999,
    disableForReducedMotion: true,
    particleCount: 100,
    spread: 72,
    origin: { y: 0.62 },
    colors: ["#0071e3", "#34c759", "#1d1d1f", "#ffffff"],
  });
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
  useEffect(() => {
    fireCelebration();
  }, []);

  const standard = pipelineKey === "GACC" ? "GACC" : pipelineKey === "FDA" ? "FDA" : "";
  const query = new URLSearchParams({
    standard,
    company: companyName,
    ...(contactEmail ? { email: contactEmail } : {}),
    ...(estimatedValue ? { price: String(estimatedValue) } : {}),
  });
  const recordHref = standard ? `/dashboard/ho-so/moi?${query.toString()}` : "";

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-[28px] bg-white p-7 text-center shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-[#f2f2f7] p-2 text-[#6e6e73] transition hover:bg-[#e8e8ed]"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e8f3ff] text-[#0071e3]">
          <PartyPopper className="h-7 w-7" />
        </div>
        <p className="mt-4 text-sm font-semibold text-[#1d1d1f]">Cơ hội đã được chốt</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#1d1d1f]">{companyName}</h2>
        <p className="mt-2 text-sm text-[#6e6e73]">
          {ownerName ? `${ownerName} đã chốt ` : "Đã chốt "}
          <span className="font-semibold text-[#1d1d1f]">{valueLabel}</span>
        </p>

        {recordHref && (
          <Link
            href={recordHref}
            onClick={onClose}
            className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1d1d1f] px-5 text-sm font-semibold text-white transition hover:bg-[#333336]"
          >
            Tạo hồ sơ {standard}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
        <div className="mt-3 flex gap-2">
          <Link
            href={detailHref}
            onClick={onClose}
            className="flex-1 rounded-full bg-[#f2f2f7] px-4 py-2.5 text-sm font-medium text-[#1d1d1f] transition hover:bg-[#e8e8ed]"
          >
            Xem cơ hội
          </Link>
          <button
            onClick={onClose}
            className="flex-1 rounded-full px-4 py-2.5 text-sm font-medium text-[#0071e3] transition hover:bg-[#f5f5f7]"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
