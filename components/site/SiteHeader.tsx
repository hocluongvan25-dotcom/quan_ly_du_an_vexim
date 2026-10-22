import Link from "next/link";
import type { HomeCopy, Lang } from "@/lib/site/content";
import { SiteLogoLink } from "./SiteLogo";

export function SiteHeader({ lang, copy }: { lang: Lang; copy: HomeCopy }) {
  const homeHref = lang === "en" ? "/en" : "/";

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-site items-center justify-between gap-6 px-5 md:h-[74px] md:px-8">
        <SiteLogoLink href={homeHref} />

        <nav aria-label={lang === "en" ? "Main" : "Danh mục chính"} className="hidden items-center gap-8 lg:flex">
          {copy.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="focus-ring text-[13px] font-medium text-ink-700 decoration-brass-500 decoration-1 underline-offset-[6px] transition-colors hover:text-brand-900 hover:underline"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 md:gap-4">
          <Link
            href={copy.altLang.href}
            hrefLang={lang === "en" ? "vi" : "en"}
            title={copy.altLang.title}
            className="focus-ring border border-line px-2 py-1 text-[11px] font-semibold tracking-[0.08em] text-ink-500 transition-colors hover:border-brand-900 hover:text-brand-900"
          >
            {copy.altLang.label}
          </Link>
          <Link
            href="/login"
            rel="nofollow"
            className="focus-ring border border-brand-900/25 px-3 py-2 text-[12px] font-medium text-brand-900 transition-colors hover:border-brand-900 hover:bg-brand-900 hover:text-white md:px-4"
          >
            {copy.login}
          </Link>
        </div>
      </div>

      <div className="border-t border-line/70 lg:hidden">
        <nav
          aria-label={lang === "en" ? "Main" : "Danh mục chính"}
          className="mx-auto flex max-w-site gap-6 overflow-x-auto px-5 py-2.5 text-[12px] text-ink-500 md:px-8"
        >
          {copy.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="focus-ring whitespace-nowrap py-0.5 hover:text-brand-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
