"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { siteCopy, type SiteLang } from "@/lib/public-content";

/** Mã QR trên hồ sơ chứa đường dẫn /verify/<mã công khai>. */
function verifyCodeFrom(raw: string): string {
  const value = raw.trim();
  const match = value.match(/\/verify\/([A-Za-z0-9_-]+)/i);
  return match ? match[1] : value;
}

export function QrScanner({ lang, onClose }: { lang: SiteLang; onClose: () => void }) {
  const c = siteCopy(lang);
  const copy = c.lookup;
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let cancelled = false;

    const stop = () => {
      if (timer) window.clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };

    (async () => {
      const Detector = (window as unknown as { BarcodeDetector?: any }).BarcodeDetector;
      if (!Detector || !navigator.mediaDevices?.getUserMedia) {
        setError(copy.scanUnsupported);
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stop();
          return;
        }
        const video = videoRef.current;
        if (!video) {
          stop();
          return;
        }

        video.srcObject = stream;
        await video.play().catch(() => undefined);
        if (cancelled) return;
        setReady(true);

        const detector = new Detector({ formats: ["qr_code"] });
        timer = window.setInterval(async () => {
          const element = videoRef.current;
          if (!element || element.readyState < 2) return;
          try {
            const found = await detector.detect(element);
            if (!found || found.length === 0) return;
            const code = verifyCodeFrom(String(found[0].rawValue || ""));
            if (!code) return;
            if (timer) window.clearInterval(timer);
            stream?.getTracks().forEach((track) => track.stop());
            router.push(`/verify/${encodeURIComponent(code)}`);
          } catch {
            /* khung hình chưa rõ, thử lại ở nhịp sau */
          }
        }, 450);
      } catch {
        setError(copy.scanError);
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [router, copy.scanError, copy.scanUnsupported]);

  return (
    <div
      className="qr-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      onClick={onClose}
    >
      <div className="qr-modal__panel" onClick={(event) => event.stopPropagation()}>
        <div className="qr-modal__head">
          <h2 className="qr-modal__title" id="qr-modal-title">
            {copy.scanTitle}
          </h2>
          <button
            type="button"
            className="qr-modal__close"
            onClick={onClose}
            ref={closeRef}
          >
            {copy.close}
          </button>
        </div>

        {error ? (
          <p className="qr-modal__fallback">{error}</p>
        ) : (
          <>
            <div className="qr-modal__frame">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video ref={videoRef} muted playsInline aria-label={copy.scanTitle} />
              {!ready && <span className="qr-modal__loading">{copy.scanStarting}</span>}
            </div>
            <p className="qr-modal__hint">{copy.scanHint}</p>
          </>
        )}
      </div>
    </div>
  );
}
