import { faqGroupsFor, faqFor, type FaqItem } from "@/lib/site/faq";
import type { Lang } from "@/lib/site/content";

export function FaqAccordion({
  lang,
  items,
  groupLabels = false,
}: {
  lang: Lang;
  items?: FaqItem[];
  groupLabels?: boolean;
}) {
  const all = faqFor(lang);
  const list = items?.length ? items : all;
  const groups = faqGroupsFor(lang).filter((group) => list.some((item) => item.group === group.id));

  return (
    <div>
      {groups.map((group) => {
        const groupItems = list.filter((item) => item.group === group.id);
        return (
          <section key={group.id} className="mb-8 last:mb-0">
            {groupLabels ? (
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-label text-brass-600">{group.label}</p>
            ) : null}
            <div className="divide-y divide-line border-t border-line">
              {groupItems.map((item) => (
                <details key={item.id} className="faq-item group py-4 md:py-5">
                  <summary className="focus-ring flex cursor-pointer list-none items-start justify-between gap-5 rounded-none">
                    <h3 className="font-serif text-[16.5px] leading-6 text-brand-950 md:text-[18px] md:leading-7">
                      {item.question}
                    </h3>
                    <span className="faq-toggle mt-1.5 shrink-0 text-brand-900" aria-hidden="true" />
                  </summary>
                  <p className="mt-3 max-w-3xl pr-8 text-[13.5px] leading-7 text-ink-600">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
