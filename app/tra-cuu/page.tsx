import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY } from "@/lib/site/company";
import { HOME_VI } from "@/lib/site/content";
import type { Standard } from "@/lib/types";
import { PageShell } from "@/components/site/PageShell";
import { PageHero } from "@/components/site/PageHero";
import { LookupPanel } from "@/components/site/LookupPanel";
import { ContactBanner } from "@/components/site/ContactBanner";

export const metadata: Metadata = {
  title: "Tra cứu mã đăng ký FDA và GACC | Vexim Global",
  description:
    "Tra cứu số đăng ký FDA hoặc mã GACC do Vexim Global đăng ký hoặc quản lý bằng số đăng ký, tên doanh nghiệp hoặc mã số thuế.",
  alternates: { canonical: "/tra-cuu" },
  robots: { index: false, follow: true },
};

type Props = { searchParams?: { q?: string | string[]; type?: string | string[] } };

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

export default function TraCuuPage({ searchParams }: Props) {
  const query = firstValue(searchParams?.q).slice(0, 120);
  const typeParam = firstValue(searchParams?.type).toUpperCase();
  const standard: Standard = typeParam === "GACC" ? "GACC" : "FDA";

  return (
    <PageShell lang="vi">
      <PageHero
        eyebrow="Tra cứu"
        title="Tra cứu mã đăng ký FDA và GACC"
        lead="Nhập số đăng ký, tên doanh nghiệp hoặc mã số thuế để kiểm tra hiệu lực mã. Kết quả chỉ áp dụng cho hồ sơ do Vexim Global đăng ký hoặc quản lý."
        crumbs={[{ label: "Vexim Global", href: "/" }, { label: "Tra cứu mã đăng ký" }]}
      />

      <div className="mx-auto max-w-site px-5 py-10 md:px-8 md:py-12">
        <div className="max-w-3xl">
          <LookupPanel
            lang="vi"
            defaultStandard={standard}
            initialQuery={query}
            syncUrl
            showHeading
          />
        </div>

        <p className="mt-5 max-w-3xl border-l-2 border-brass-300 pl-4 text-[11.5px] leading-6 text-ink-500">
          {HOME_VI.fixedNote}
        </p>

        <noscript>
          <p className="mt-4 max-w-3xl text-[12.5px] leading-6 text-ink-600">
            Trình duyệt đang tắt JavaScript. Quý khách vui lòng gọi {COMPANY.phone} để được kiểm tra hồ sơ.
          </p>
        </noscript>

        <div className="mt-10 grid gap-6 border-t border-line pt-8 md:grid-cols-3">
          <Link
            href="/tra-cuu-ma-fda"
            className="focus-ring border border-line bg-white p-5 transition-colors hover:border-brand-900"
          >
            <p className="text-[10px] font-semibold uppercase tracking-label text-brass-600">Tra cứu</p>
            <p className="mt-2 font-serif text-[17px] text-brand-950">Mã FDA (FFR)</p>
            <p className="mt-2 text-[12px] leading-6 text-ink-500">
              Số đăng ký cơ sở thực phẩm, kỳ gia hạn hai năm và U.S. Agent.
            </p>
          </Link>
          <Link
            href="/tra-cuu-ma-gacc"
            className="focus-ring border border-line bg-white p-5 transition-colors hover:border-brand-900"
          >
            <p className="text-[10px] font-semibold uppercase tracking-label text-brass-600">Tra cứu</p>
            <p className="mt-2 font-serif text-[17px] text-brand-950">Mã GACC</p>
            <p className="mt-2 text-[12px] leading-6 text-ink-500">
              Mã doanh nghiệp trên hệ thống CIFER và thời hạn hiệu lực 5 năm.
            </p>
          </Link>
          <Link
            href="/cau-hoi-thuong-gap"
            className="focus-ring border border-line bg-white p-5 transition-colors hover:border-brand-900"
          >
            <p className="text-[10px] font-semibold uppercase tracking-label text-brass-600">Hỏi đáp</p>
            <p className="mt-2 font-serif text-[17px] text-brand-950">Câu hỏi thường gặp</p>
            <p className="mt-2 text-[12px] leading-6 text-ink-500">
              Mười hai câu hỏi về tra cứu, đăng ký và thời hạn gia hạn.
            </p>
          </Link>
        </div>
      </div>

      <ContactBanner lang="vi" copy={HOME_VI} />
    </PageShell>
  );
}
