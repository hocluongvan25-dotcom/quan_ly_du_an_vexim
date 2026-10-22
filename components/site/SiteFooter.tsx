import Link from "next/link";
import { COMPANY } from "@/lib/site/company";
import type { HomeCopy, Lang } from "@/lib/site/content";
import { SiteLogo } from "./SiteLogo";

export function SiteFooter({ lang, copy }: { lang: Lang; copy: HomeCopy }) {
  const hours = lang === "en" ? COMPANY.hoursEn : COMPANY.hoursVi;
  const labels = copy.footer.labels;

  return (
    <footer className="bg-brand-950 text-brand-100">
      <div className="mx-auto max-w-site px-5 py-14 md:px-8 md:py-16">
        <div className="grid gap-12 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-5">
            <SiteLogo tone="light" />
            <p className="mt-5 max-w-[38ch] text-[13px] leading-6 text-brand-200/80">{copy.footer.tagline}</p>

            <dl className="mt-7 space-y-3.5 text-[12.5px] leading-5">
              <div>
                <dt className="text-[10px] uppercase tracking-label text-brass-300">{labels.company}</dt>
                <dd className="mt-1 text-white">
                  {COMPANY.name} ({COMPANY.legalName})
                </dd>
              </div>
              {COMPANY.taxCode ? (
                <div>
                  <dt className="text-[10px] uppercase tracking-label text-brass-300">{labels.taxCode}</dt>
                  <dd className="mt-1 text-white">{COMPANY.taxCode}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-[10px] uppercase tracking-label text-brass-300">{labels.address}</dt>
                <dd className="mt-1 text-white">{COMPANY.address}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-label text-brass-300">{labels.hotline}</dt>
                <dd className="mt-1">
                  <a href={COMPANY.phoneHref} className="focus-ring text-white hover:underline underline-offset-4">
                    {COMPANY.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-label text-brass-300">{labels.email}</dt>
                <dd className="mt-1">
                  <a
                    href={`mailto:${COMPANY.email}`}
                    className="focus-ring text-white hover:underline underline-offset-4"
                  >
                    {COMPANY.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-label text-brass-300">{labels.website}</dt>
                <dd className="mt-1">
                  <a
                    href={COMPANY.website}
                    className="focus-ring text-white hover:underline underline-offset-4"
                    rel="noopener"
                  >
                    {COMPANY.websiteLabel}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-label text-brass-300">{labels.hours}</dt>
                <dd className="mt-1 text-white">{hours}</dd>
              </div>
            </dl>
          </div>

          <nav aria-label={copy.footer.serviceColumn.title} className="md:col-span-3 md:col-start-7">
            <h2 className="border-b border-white/10 pb-3 text-[10px] uppercase tracking-label text-brass-300">
              {copy.footer.serviceColumn.title}
            </h2>
            <ul className="mt-4 space-y-2.5 text-[13px]">
              {copy.footer.serviceColumn.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="focus-ring text-brand-100/85 hover:text-white hover:underline underline-offset-4">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={copy.footer.infoColumn.title} className="md:col-span-3">
            <h2 className="border-b border-white/10 pb-3 text-[10px] uppercase tracking-label text-brass-300">
              {copy.footer.infoColumn.title}
            </h2>
            <ul className="mt-4 space-y-2.5 text-[13px]">
              {copy.footer.infoColumn.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="focus-ring text-brand-100/85 hover:text-white hover:underline underline-offset-4">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-8 border-t border-white/10 pt-5">
              <p className="text-[10px] uppercase tracking-label text-brass-300">{brandLabel(lang)}</p>
              <p className="mt-2 font-serif text-[19px] text-white">{lang === "en" ? "Vexim Trade" : "Vexim Trade"}</p>
              <p className="mt-1 text-[12px] leading-5 text-brand-200/70">
                {lang === "en"
                  ? "Free product listing for food and agricultural exporters."
                  : "Niêm yết sản phẩm thực phẩm, nông sản miễn phí cho doanh nghiệp xuất khẩu."}
              </p>
            </div>
          </nav>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6">
          <p className="text-[11.5px] leading-6 text-brand-200/70">
            {copy.footer.copyright} {copy.footer.disclaimer}
          </p>
        </div>
      </div>
    </footer>
  );
}

function brandLabel(lang: Lang) {
  return lang === "en" ? "Marketplace" : "Sàn giao dịch";
}
