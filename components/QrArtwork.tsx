"use client";

import { QRCodeSVG } from "qrcode.react";
import { useRef, useState } from "react";
import { Download } from "lucide-react";
import { buildQrExport, QR_EXPORT_SIZE, QR_LABEL_FONT, QR_MARGIN_MODULES } from "@/lib/qr-export";

export function QrArtwork({ url, label }: { url: string; label?: string }) {
  const qrWrap = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function exportArtwork() {
    const source = qrWrap.current?.querySelector("svg");
    if (!source) throw new Error("Mã QR chưa sẵn sàng. Vui lòng thử lại.");
    const qr = source.cloneNode(true) as SVGSVGElement;
    qr.setAttribute("width", String(QR_EXPORT_SIZE));
    qr.setAttribute("height", String(QR_EXPORT_SIZE));
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) throw new Error("Trình duyệt không hỗ trợ tải mã QR.");
    ctx.font = QR_LABEL_FONT;
    const caption = label?.trim() || "";
    return buildQrExport(
      new XMLSerializer().serializeToString(qr),
      caption,
      source.viewBox.baseVal.width,
      ctx.measureText(caption).width,
    );
  }

  async function download(format: "png" | "svg") {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      // Both downloads use exactly the same self-contained QR + caption artwork.
      const artwork = exportArtwork();
      const svgBlob = new Blob([artwork.svg], { type: "image/svg+xml;charset=utf-8" });
      const blob = format === "svg" ? svgBlob : await svgToPng(svgBlob, artwork.width, artwork.height);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      const filename = (label?.trim() || "certificate").replace(/[\s\\/:*?"<>|]+/g, "-");
      a.download = `Vexim-QR-${filename}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Keep the URL alive briefly so the browser can begin its download.
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải mã QR. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[28px] border border-navy-900/10 bg-white p-5 shadow-card">
      <div className="mb-4 text-center">
        <div className="font-display text-sm font-bold tracking-[0.18em] text-navy-900">
          CERTIFICATE QR CODE
        </div>
        <p className="mt-1 text-xs text-navy-900/55">
          Tải mã QR kèm số chứng nhận, không có khung hoặc thông tin phụ.
        </p>
      </div>
      <div className="mx-auto w-fit rounded-3xl border border-navy-900/10 bg-white p-3">
        <div ref={qrWrap}>
          <QRCodeSVG
            value={url}
            size={220}
            level="H"
            marginSize={QR_MARGIN_MODULES}
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>
        {label?.trim() && (
          <p className="mt-1 w-[220px] break-all text-center font-mono text-[10px] font-semibold text-black">
            {label.trim()}
          </p>
        )}
      </div>
      <p className="mt-3 break-all text-center text-[10px] text-navy-900/45">{url}</p>
      {error && <p role="alert" className="mt-3 text-center text-xs text-rose-700">{error}</p>}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => download("png")}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-navy-900 px-3 py-2.5 text-xs font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" /> PNG Print
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => download("svg")}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-navy-900/15 bg-white px-3 py-2.5 text-xs font-semibold text-navy-900 hover:bg-teal-50 disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" /> SVG
        </button>
      </div>
    </div>
  );
}

async function svgToPng(blob: Blob, width: number, height: number): Promise<Blob> {
  const sourceUrl = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Không thể tạo ảnh QR. Vui lòng thử tải SVG."));
      img.src = sourceUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Trình duyệt không hỗ trợ tải PNG. Vui lòng tải SVG.");
    ctx.drawImage(img, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((png) => png ? resolve(png) : reject(new Error("Không thể tạo ảnh PNG.")), "image/png");
    });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
