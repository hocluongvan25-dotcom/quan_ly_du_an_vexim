"use client";
import { useState } from "react";

export default function PaymentRequestDownload({ id }: { id: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <span className="inline-flex max-w-full flex-col items-start gap-1">
    <button type="button" disabled={busy} onClick={async () => {
      setBusy(true); setError("");
      try {
        const response = await fetch(`/api/invoices/${id}/payment-request`, { cache: "no-store" });
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.error || "Không tải được PDF. Vui lòng thử lại.");
        }
        const url = URL.createObjectURL(await response.blob());
        const a = document.createElement("a"); a.href = url; a.download = `De-nghi-thanh-toan-${id}.pdf`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } catch (e) { setError(e instanceof Error ? e.message : "Không tải được PDF."); }
      finally { setBusy(false); }
    }} className="rounded-xl bg-navy-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
      {busy ? "Đang tạo PDF…" : "Tải đề nghị thanh toán PDF A4"}
    </button>
    {error && <span role="alert" className="text-xs text-red-600">{error}</span>}
  </span>;
}
