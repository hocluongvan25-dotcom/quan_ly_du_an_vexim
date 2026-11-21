"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Brand } from "./Brand";
import { SITE_PATHS, siteCopy, type SiteLang } from "@/lib/public-content";

function LanguageSwitch({ lang, label }: { lang: SiteLang; label: string }) {
  return (
    <nav className="site-lang" aria-label={label}>
      <a
        href={SITE_PATHS.vi}
        hrefLang="vi"
        lang="vi"
        aria-current={lang === "vi" ? "page" : undefined}
      >
        VI
      </a>
      <span aria-hidden="true">/</span>
      <a
        href={SITE_PATHS.en}
        hrefLang="en"
        lang="en"
        aria-current={lang === "en" ? "page" : undefined}
      >
        EN
      </a>
    </nav>
  );
}

export function SiteHeader({ lang }: { lang: SiteLang }) {
  const c = siteCopy(lang);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth > 980) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <header className="site-header">
      <div className="public-shell site-header__in">
        <Brand href={SITE_PATHS[lang]} />

        <nav className="site-nav" aria-label={c.nav.aria}>
          {c.nav.links.map((link) => (
            <a key={`${link.href}-${link.label}`} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="site-header__actions">
          <a
            className="site-header__phone"
            href={c.org.phoneHref}
            aria-label={`${c.nav.call}: ${c.org.phone}`}
          >
            {c.org.phone}
          </a>
          <LanguageSwitch lang={lang} label={c.nav.language} />
          <Link href="/login" rel="nofollow" className="site-login">
            {c.nav.login}
          </Link>
          <button
            type="button"
            className="site-menu-btn"
            aria-expanded={open}
            aria-controls="site-mobile-nav"
            aria-label={open ? c.nav.close : c.nav.menu}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="site-menu-btn__bars" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>

      {open && (
        <div className="site-mobile" id="site-mobile-nav">
          <div className="public-shell site-mobile__in">
            <nav className="site-mobile__links" aria-label={c.nav.aria}>
              {c.nav.links.map((link) => (
                <a
                  key={`${link.href}-${link.label}-mobile`}
                  href={link.href}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="site-mobile__bottom">
              <div className="site-mobile__contact">
                <a href={c.org.phoneHref}>
                  <span>{c.nav.call}</span>
                  <strong>{c.org.phone}</strong>
                </a>
                <a href={`mailto:${c.org.email}`}>{c.org.email}</a>
              </div>
              <div className="site-mobile__actions">
                <LanguageSwitch lang={lang} label={c.nav.language} />
                <Link
                  href="/login"
                  rel="nofollow"
                  className="site-mobile__login"
                  onClick={() => setOpen(false)}
                >
                  {c.nav.login}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
