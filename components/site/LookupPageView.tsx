import Link from "next/link";
import { COMPANY, SITE_URL } from "@/lib/site/company";
import { HOME_VI } from "@/lib/site/content";
import { faqById } from "@/lib/site/faq";
import type { LookupPageContent } from "@/lib/site/pages";
import { buildPageSchema } from "@/lib/site/schema";
import { JsonLd } from "./JsonLd";
import { PageShell } from "./PageShell";
import { PageHero } from "./PageHero";
import { LookupPanel } from "./LookupPanel";
import { FaqAccordion } from "./FaqAccordion";
import { ContactBanner } from "./ContactBanner";
import { ContentSections, DetailLayout, FactPanel } from "./DetailLayout";

export function LookupPageView({ page }: { page: LookupPageContent }) {
  const copy = HOME_VI;
  const standardLabel = page.standard === "FDA" ? "Mã FDA (FFR)" : "Mã GACC";

  const schema = buildPageSchema({
    lang: "vi",
    path: page.path,
    title: page.meta.title,
    description: page.meta.description,
    crumbs: [
      { name: "Vexim Global", url: `${COMPANY.website}/` },
      { name: "Tra cứu mã FDA, GACC", url: `${SITE_URL}/` },
      { name: page.eyebrow, url: `${SITE_URL}${page.path}` },
    ],
    faqIds: page.faqIds,
  });

  return (
    <PageShell lang="vi" schema={<JsonLd data={schema} />}>
      <PageHero
        eyebrow={page.eyebrow}
        title={page.h1}
        lead={page.lead}
        crumbs={[
          { label: "Vexim Global", href: "/" },
          { label: "Tra cứu mã đăng ký", href: "/#tra-cuu" },
          { label: page.eyebrow },
        ]}
      />

      <section className="border-b border-line bg-paper">
        <div className="mx-auto max-w-site px-5 py-10 md:px-8 md:py-12">
          <LookupPanel
            lang="vi"
            defaultStandard={page.standard}
            showHeading
            heading={
              page.standard === "FDA"
                ? "Tra cứu mã đăng ký FDA (FFR)"
                : "Tra cứu mã đăng ký GACC"
            }
          />
          <p className="mt-4 max-w-3xl border-l-2 border-brass-300 pl-4 text-[11.5px] leading-6 text-ink-500">
            {copy.fixedNote}
          </p>
        </div>
      </section>

      <DetailLayout
        aside={
          <>
            <FactPanel
              title="Hồ sơ tra cứu"
              items={[
                { label: "Loại mã", value: standardLabel },
                { label: "Đơn vị quản lý hồ sơ", value: "Vexim Global" },
                { label: "Phạm vi", value: "Hồ sơ do Vexim Global đăng ký hoặc quản lý" },
                { label: "Đường dây nóng", value: COMPANY.phone },
                { label: "Email", value: COMPANY.email },
              ]}
            />

            <div className="border border-line bg-white p-5">
              <p className="text-[10px] font-semibold uppercase tracking-label text-brass-600">Trang liên quan</p>
              <ul className="mt-3 space-y-2 text-[12.5px]">
                {page.relatedLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="focus-ring text-brand-800 underline-offset-4 hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-brand-950 p-5 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-label text-brass-300">Hỗ trợ kiểm tra</p>
              <p className="mt-2 text-[12.5px] leading-6 text-brand-200/85">
                Vexim Global kiểm tra hồ sơ và phản hồi trong giờ làm việc.
              </p>
              <a
                href={COMPANY.phoneHref}
                className="focus-ring mt-4 inline-block border border-white/25 px-4 py-2.5 text-[12px] font-medium text-white hover:border-white"
              >
                Gọi {COMPANY.phone}
              </a>
            </div>
          </>
        }
      >
        <ContentSections sections={page.sections} />

        {page.faqIds.length ? (
          <section className="border-t border-line pt-8">
            <h2 className="font-serif text-[21px] leading-snug text-brand-950 md:text-[24px]">Câu hỏi liên quan</h2>
            <div className="mt-4">
              <FaqAccordion lang="vi" items={faqById(page.faqIds, "vi")} />
            </div>
          </section>
        ) : null}
      </DetailLayout>

      <ContactBanner lang="vi" copy={copy} />
    </PageShell>
  );
}
