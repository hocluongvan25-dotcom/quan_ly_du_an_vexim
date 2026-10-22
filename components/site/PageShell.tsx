import type { Lang } from "@/lib/site/content";
import { homeCopy } from "@/lib/site/content";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

export function PageShell({
  lang,
  children,
  schema,
}: {
  lang: Lang;
  children: React.ReactNode;
  /** Khối JSON-LD của trang, đặt trước header và ngoài thẻ main. */
  schema?: React.ReactNode;
}) {
  const copy = homeCopy(lang);
  return (
    <div className="min-h-screen bg-paper font-sans text-ink">
      {schema}
      <a
        href="#noi-dung"
        className="focus-ring sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:bg-brand-900 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        {lang === "en" ? "Skip to content" : "Bỏ qua điều hướng"}
      </a>
      <SiteHeader lang={lang} copy={copy} />
      <main id="noi-dung">{children}</main>
      <SiteFooter lang={lang} copy={copy} />
    </div>
  );
}
