"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-bold text-white"
    >
      🖨️ In / Lưu PDF
    </button>
  );
}
