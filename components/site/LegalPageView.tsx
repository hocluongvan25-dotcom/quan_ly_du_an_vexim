import { HOME_VI } from "@/lib/site/content";
import { PageShell } from "./PageShell";
import { PageHero } from "./PageHero";
import { ContactBanner } from "./ContactBanner";

export type LegalSection = { heading: string; paragraphs: string[]; bullets?: string[] };

export function LegalPageView({
  title,
  lead,
  updated,
  sections,
  crumb,
}: {
  title: string;
  lead: string;
  updated: string;
  sections: LegalSection[];
  crumb: string;
}) {
  return (
    <PageShell lang="vi">
      <PageHero
        eyebrow="Pháp lý"
        title={title}
        lead={lead}
        crumbs={[{ label: "Vexim Global", href: "/" }, { label: crumb }]}
      />

      <div className="mx-auto max-w-site px-5 py-12 md:px-8 md:py-16">
        <div className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-label text-ink-400">Cập nhật ngày {updated}</p>

          <div className="mt-8">
            {sections.map((section, index) => (
              <section key={section.heading} className={index === 0 ? "pb-7" : "border-t border-line py-7"}>
                <h2 className="font-serif text-[20px] leading-snug text-brand-950 md:text-[22px]">
                  {section.heading}
                </h2>
                <div className="mt-3 space-y-3 text-[13.5px] leading-7 text-ink-700">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {section.bullets?.length ? (
                  <ul className="mt-4 space-y-2">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3 text-[13.5px] leading-7 text-ink-700">
                        <span aria-hidden="true" className="mt-[12px] h-[3px] w-[3px] shrink-0 bg-brass-500" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </div>
      </div>

      <ContactBanner lang="vi" copy={HOME_VI} />
    </PageShell>
  );
}
