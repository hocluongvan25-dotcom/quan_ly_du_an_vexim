import type { HomeCopy, Lang } from "@/lib/site/content";
import { COMPANY } from "@/lib/site/company";

export function ContactBanner({ lang, copy }: { lang: Lang; copy: HomeCopy }) {
  return (
    <section id="lien-he" className="scroll-mt-24 border-t border-brass-500/30 bg-brand-900">
      <div className="mx-auto max-w-site px-5 py-14 md:px-8 md:py-16">
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-7">
            <p className="text-[10.5px] font-semibold uppercase tracking-label text-brass-300">
              {copy.ctaBanner.eyebrow}
            </p>
            <h2 className="mt-4 max-w-xl font-serif text-[26px] leading-[1.2] text-white md:text-[34px]">
              {copy.ctaBanner.title}
            </h2>
            <p className="mt-5 max-w-xl text-[13.5px] leading-7 text-brand-200/85">{copy.ctaBanner.body}</p>
            <p className="mt-6 text-[12px] text-brand-200/70">
              {lang === "en" ? COMPANY.hoursEn : COMPANY.hoursVi}
            </p>
          </div>

          <div className="md:col-span-5 md:justify-self-end md:self-center md:w-full md:max-w-[320px]">
            <a
              href={COMPANY.phoneHref}
              className="focus-ring group block border border-white/20 px-5 py-5 transition-colors hover:border-white/60"
            >
              <span className="text-[10px] font-semibold uppercase tracking-label text-brass-300">
                {lang === "en" ? "Hotline" : "Đường dây nóng"}
              </span>
              <span className="mt-1.5 block font-serif text-[24px] text-white group-hover:text-white">
                {COMPANY.phone}
              </span>
            </a>
            <a
              href={`mailto:${COMPANY.email}`}
              className="focus-ring group mt-2 block border border-white/20 px-5 py-5 transition-colors hover:border-white/60"
            >
              <span className="text-[10px] font-semibold uppercase tracking-label text-brass-300">Email</span>
              <span className="mt-1.5 block text-[15px] text-white">{COMPANY.email}</span>
            </a>
            <p className="mt-4 text-[11.5px] leading-5 text-brand-200/60">{COMPANY.address}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
