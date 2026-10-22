import Link from "next/link";
import type { HomeCopy, Lang } from "@/lib/site/content";
import { ButtonLink } from "../Buttons";
import { SectionHeading } from "../SectionHeading";
import { sectionLabels } from "@/lib/site/labels";

export function ServicesSection({ lang, copy }: { lang: Lang; copy: HomeCopy }) {
  const labels = sectionLabels(lang);

  return (
    <section id="dich-vu" className="scroll-mt-24 border-t border-line bg-paper">
      <div className="mx-auto max-w-site px-5 py-16 md:px-8 md:py-20">
        <SectionHeading
          index="02"
          eyebrow={labels.services}
          title={copy.services.heading}
          description={copy.services.lead}
        />

        <div className="mt-11 grid gap-px border border-line bg-line md:grid-cols-2">
          {copy.services.items.map((service) => {
            const titleHref = lang === "en" ? "#lien-he" : service.href;
            const ctaHref = lang === "en" ? "#lien-he" : service.ctaHref;
            return (
            <article key={service.slug} className="flex flex-col bg-white p-6 transition-colors hover:bg-white md:p-8">
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-serif text-[26px] leading-none text-brass-500">{service.no}</span>
                <span className="text-[10px] font-semibold uppercase tracking-label text-ink-300">
                  {labels.service}
                </span>
              </div>

              <h3 className="mt-5 max-w-[26ch] font-serif text-[20px] leading-[1.3] text-brand-950 md:text-[21px]">
                <Link
                  href={titleHref}
                  className="focus-ring decoration-brass-400 underline-offset-4 hover:underline"
                >
                  {service.title}
                </Link>
              </h3>

              <p className="mt-3 text-[12.5px] leading-6 text-ink-500">{service.lead}</p>

              <ul className="mt-5 flex-1 space-y-2.5 border-t border-line pt-4">
                {service.points.map((point) => (
                  <li key={point} className="flex gap-3 text-[12.5px] leading-6 text-ink-700">
                    <span aria-hidden="true" className="mt-[10px] h-[3px] w-[3px] shrink-0 bg-brass-500" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                <ButtonLink href={ctaHref} variant="secondary" size="sm">
                  {service.cta}
                </ButtonLink>
              </div>
            </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
