import { siteJsonLd, type SiteLang } from "@/lib/public-content";

/**
 * Schema JSON-LD của trang chủ. Nội dung lấy từ cùng nguồn với phần hiển thị
 * nên câu hỏi và câu trả lời luôn trùng với mục Câu hỏi thường gặp.
 */
export function JsonLd({ lang }: { lang: SiteLang }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify an toàn cho dữ liệu tĩnh của chính website.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd(lang)) }}
    />
  );
}
