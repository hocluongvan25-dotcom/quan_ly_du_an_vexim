import Link from "next/link";
import type { HomeCopy, Lang } from "@/lib/site/content";
import { FaqAccordion } from "../FaqAccordion";
import { sectionLabels } from "@/lib/site/labels";

export function FaqSection({ lang, copy }: { lang: Lang; copy: HomeCopy }) {
  const labels = sectionLabels(lang);
  const allFaqHref = lang === "en" ? "/cau-hoi-thuong-gap" : "/cau-hoi-thuong-gap";

  return (
    <section id="cau-hoi" className="scroll-mt-24 border-t border-line bg-paper">
      <div className="mx-auto max-w-site px-5 py-16 md:px-8 md:py-20">
        <div className="grid gap-10 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-4">
            <div className="md:sticky md:top-28">
              <p className="flex items-baseline gap-3 text-[10.5px] font-semibold uppercase tracking-label text-brass-600">
                <span className="font-serif text-[13px] font-medium text-brand-900">04</span>
                <span className="h-px w-5 self-center bg-current opacity-40" aria-hidden="true" />
                <span>{labels.faq}</span>
              </p>
              <h2 className="mt-4 font-serif text-[27px] leading-[1.18] text-brand-950 md:text-[34px]">
                {copy.faq.heading}
              </h2>
              <p className="mt-4 max-w-[38ch] text-[13px] leading-7 text-ink-500">{copy.faq.lead}</p>
              <Link
                href={allFaqHref}
                className="focus-ring mt-5 inline-block text-[12px] font-medium text-brand-800 decoration-brass-400 underline-offset-4 hover:underline"
              >
                {copy.faq.allFaqLabel}
              </Link>
            </div>
          </div>

          <div className="md:col-span-8">
            <FaqAccordion lang={lang} groupLabels />
          </div>
        </div>
      </div>
    </section>
  );
}
