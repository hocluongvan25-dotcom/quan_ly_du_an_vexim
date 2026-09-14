"use client";

import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { useRef } from "react";
import { Download } from "lucide-react";

export function QrArtwork({
  url,
  label,
}: {
  url: string;
  label?: string;
}) {
  const canvasWrap = useRef<HTMLDivElement>(null);

  function downloadPng() {
    const canvas = canvasWrap.current?.querySelector("canvas");
    if (!canvas) return;
    const src = canvas.toDataURL("image/png");
    const out = document.createElement("canvas");
    out.width = 1400;
    out.height = 1600;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out.width, out.height);

    const pad = 90;
    roundRect(ctx, 50, 50, 1300, 1500, 48);
    ctx.fillStyle = "#24180C";
    ctx.fill();
    roundRect(ctx, 70, 70, 1260, 1460, 40);
    ctx.fillStyle = "#FFFCF5";
    ctx.fill();

    ctx.fillStyle = "#24180C";
    ctx.font = "800 42px Be Vietnam Pro, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("VEXIM GLOBAL", 700, 160);
    ctx.fillStyle = "#C48912";
    ctx.font = "600 20px Be Vietnam Pro, sans-serif";
    ctx.fillText("FDA / GACC CERTIFICATE VERIFICATION", 700, 198);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 250, 250, 900, 900);
      ctx.fillStyle = "#24180C";
      ctx.font = "600 22px Be Vietnam Pro, sans-serif";
      ctx.fillText(label || "Scan to verify validity", 700, 1240);
      ctx.fillStyle = "#8a7040";
      ctx.font = "500 16px Be Vietnam Pro, sans-serif";
      ctx.fillText("www.veximglobal.com  ·  0373 685 634", 700, 1288);
      ctx.fillText("No. 25/6/51 Ngoa Long, Bac Tu Liem, Hanoi", 700, 1320);

      const a = document.createElement("a");
      a.href = out.toDataURL("image/png");
      a.download = `Vexim-QR-${(label || "certificate").replace(/\s+/g, "-")}.png`;
      a.click();
    };
    img.src = src;
  }

  function downloadSvg() {
    const svg = document.getElementById("vexim-qr-svg");
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Vexim-QR-${(label || "certificate").replace(/\s+/g, "-")}.svg`;
    a.click();
  }

  return (
    <div className="rounded-[28px] border border-navy-900/10 bg-white p-5 shadow-card">
      <div className="mb-4 text-center">
        <div className="font-display text-sm font-bold tracking-[0.18em] text-navy-900">
          CERTIFICATE QR CODE
        </div>
        <p className="mt-1 text-xs text-navy-900/55">
          Download to print on certificates issued by Vexim
        </p>
      </div>
      <div className="mx-auto w-fit rounded-3xl bg-gradient-to-b from-navy-900 to-navy-800 p-4 shadow-lift">
        <div className="rounded-2xl bg-white p-3">
          <QRCodeSVG
            id="vexim-qr-svg"
            value={url}
            size={220}
            level="H"
            bgColor="#ffffff"
            fgColor="#24180C"
            imageSettings={{
              src: "/logo-mark.png",
              height: 44,
              width: 44,
              excavate: true,
            }}
          />
        </div>
      </div>
      <div ref={canvasWrap} className="hidden">
        <QRCodeCanvas
          value={url}
          size={900}
          level="H"
          bgColor="#ffffff"
          fgColor="#24180C"
          includeMargin
          imageSettings={{
            src: "/logo-mark.png",
            height: 160,
            width: 160,
            excavate: true,
          }}
        />
      </div>
      <p className="mt-3 break-all text-center text-[10px] text-navy-900/45">{url}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={downloadPng}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-navy-900 px-3 py-2.5 text-xs font-semibold text-white hover:bg-navy-800"
        >
          <Download className="h-3.5 w-3.5" /> PNG Print
        </button>
        <button
          type="button"
          onClick={downloadSvg}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-navy-900/15 bg-white px-3 py-2.5 text-xs font-semibold text-navy-900 hover:bg-teal-50"
        >
          <Download className="h-3.5 w-3.5" /> SVG
        </button>
      </div>
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
