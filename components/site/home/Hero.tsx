import type { HomeCopy, Lang } from "@/lib/site/content";
import { ButtonLink } from "../Buttons";
import { LookupPanel } from "../LookupPanel";

export function Hero({
  lang,
  copy,
  seasonYear,
}: {
  lang: Lang;
  copy: HomeCopy;
  seasonYear: number | null;
}) {
  return (
    <section className="bg-brand-950">
      <div className="mx-auto grid max-w-site gap-10 px-5 pb-12 pt-10 md:px-8 md:pb-16 md:pt-14 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-6">
          <p className="flex items-center gap-3 text-[10.5px] font-semibold uppercase leading-5 tracking-label text-brass-300">
            <span className="h-px w-7 bg-brass-400/70" aria-hidden="true" />
            {copy.hero.eyebrow}
          </p>

          <h1 className="mt-5 max-w-[19ch] font-serif text-[33px] leading-[1.1] tracking-[-0.015em] text-white text-balance md:text-[44px] xl:text-[47px]">
            {copy.hero.title}
          </h1>

          <p className="mt-6 max-w-[54ch] text-[14px] leading-7 text-brand-100/80 md:text-[14.5px]">
            {copy.hero.lead}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={copy.hero.primaryHref} variant="light" size="lg">
              {copy.hero.primary}
            </ButtonLink>
            <ButtonLink href={copy.hero.secondaryHref} variant="outlineLight" size="lg">
              {copy.hero.secondary}
            </ButtonLink>
          </div>

          <p className="mt-8 max-w-[46ch] border-t border-white/12 pt-4 text-[11.5px] leading-6 text-brand-200/65">
            {copy.hero.hotline}
          </p>
        </div>

        <div id="tra-cuu" className="scroll-mt-24 lg:col-span-6">
          {seasonYear ? (
            <div className="mb-3 border-l-2 border-brass-400 bg-brass-500/10 px-4 py-3">
              <p className="text-[11.5px] leading-6 text-brass-100">{copy.seasonalNotice(seasonYear)}</p>
            </div>
          ) : null}
          <LookupPanel lang={lang} defaultStandard="FDA" showHeading />
        </div>
      </div>
    </section>
  );
}
