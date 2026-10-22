import type { DetailSection } from "@/lib/site/pages";

export function DetailLayout({ children, aside }: { children: React.ReactNode; aside: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-site px-5 py-12 md:px-8 md:py-16">
      <div className="grid gap-12 md:grid-cols-12 md:gap-10">
        <div className="md:col-span-8">{children}</div>
        <aside className="md:col-span-4">
          <div className="space-y-6 md:sticky md:top-28">{aside}</div>
        </aside>
      </div>
    </div>
  );
}

export function ContentSections({ sections }: { sections: DetailSection[] }) {
  return (
    <div>
      {sections.map((section, index) => (
        <section
          key={section.heading}
          className={index === 0 ? "pb-8" : "border-t border-line py-8"}
        >
          <h2 className="font-serif text-[21px] leading-snug text-brand-950 md:text-[24px]">{section.heading}</h2>

          {section.paragraphs?.length ? (
            <div className="mt-3 space-y-3 text-[13.5px] leading-7 text-ink-700">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          ) : null}

          {section.bullets?.length ? (
            <ul className="mt-4 space-y-2.5">
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
  );
}

export function FactPanel({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; value: string | number }>;
}) {
  return (
    <div className="border border-line bg-white">
      <h2 className="border-b border-line px-4 py-3 text-[10px] font-semibold uppercase tracking-label text-brass-600">
        {title}
      </h2>
      <dl>
        {items.map((item) => (
          <div key={item.label} className="border-b border-line px-4 py-3 last:border-b-0">
            <dt className="text-[10px] uppercase tracking-[0.12em] text-ink-400">{item.label}</dt>
            <dd className="mt-1 text-[12.5px] leading-6 text-ink-800">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
