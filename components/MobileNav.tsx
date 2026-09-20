"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import type { SessionUser } from "@/lib/types";
import { useI18n } from "@/lib/i18n/context";

export function MobileNav({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const desktop = window.matchMedia("(min-width: 768px)");
    const onResize = () => { if (desktop.matches) setOpen(false); };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); return; }
      if (event.key !== "Tab") return;
      const controls = panel.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]');
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    desktop.addEventListener("change", onResize);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      desktop.removeEventListener("change", onResize);
      document.removeEventListener("keydown", onKey);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button type="button" onClick={() => setOpen(true)}
        className="rounded-xl border border-navy-900/10 p-2"
        aria-label={t("nav.openMenu")} aria-expanded={open} aria-controls={id}
      ><Menu aria-hidden="true" className="h-5 w-5" /></button>
      {open && createPortal(
        <div ref={panel} id={id} role="dialog" aria-modal="true" aria-label={t("nav.mainNavigation")}
          className="fixed inset-0 z-50 flex h-dvh md:hidden">
          <Sidebar user={user} mobile onNavigate={() => setOpen(false)} />
          <div className="flex-1 bg-black/40" aria-hidden="true" onClick={() => setOpen(false)} />
          <button ref={closeButton} type="button" onClick={() => setOpen(false)}
            aria-label={t("nav.closeMenu")}
            className="absolute right-2 top-3 rounded-full bg-white p-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy-900"
          ><X aria-hidden="true" className="h-4 w-4" /></button>
        </div>, document.body
      )}
    </div>
  );
}
