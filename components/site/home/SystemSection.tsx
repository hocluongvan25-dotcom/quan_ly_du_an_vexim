import type { HomeCopy, Lang } from "@/lib/site/content";
import { ButtonLink } from "../Buttons";
import { SectionHeading } from "../SectionHeading";
import { sectionLabels } from "@/lib/site/labels";

export function SystemSection({ lang, copy }: { lang: Lang; copy: HomeCopy }) {
  const labels = sectionLabels(lang);

  return (
    <section id="he-thong" className="scroll-mt-24 border-t border-line bg-brand-50/70">
      <div className="mx-auto max-w-site px-5 py-16 md:px-8 md:py-20">
        <SectionHeading
          index="03"
          eyebrow={labels.system}
          title={copy.system.heading}
          description={copy.system.lead}
        />

        <div className="mt-11 grid gap-x-10 md:grid-cols-2 lg:grid-cols-3">
          {copy.system.features.map((feature) => (
            <div key={feature.no} className="border-t border-brand-900/15 py-6">
              <p className="font-serif text-[12px] font-medium tracking-[0.08em] text-brass-600">{feature.no}</p>
              <h3 className="mt-2 text-[13.5px] font-semibold leading-6 text-brand-950">{feature.title}</h3>
              <p className="mt-2 text-[12.5px] leading-6 text-ink-500">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-brand-900/15 pt-6">
          <ButtonLink href="/login" rel="nofollow" variant="primary" size="sm">
            {copy.system.cta}
          </ButtonLink>
          <span className="text-[11.5px] leading-5 text-ink-400">{copy.system.ctaNote}</span>
        </div>
      </div>
    </section>
  );
}
