import type { QuoteView } from "./quotes";

type QuoteFileDetails = Pick<QuoteView, "company_name" | "contact_name" | "service_name" | "title" | "template_key" | "quote_no">;

/** Create a portable, human-readable PDF name identifying both the customer and service. */
export function quotePdfFilename(quote: QuoteFileDetails): string {
  const part = (value: string, fallback: string) => {
    const safe = value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[Đđ]/g, "D")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64)
      .replace(/-+$/g, "");
    return safe || fallback;
  };

  const customer = quote.company_name?.trim() || quote.contact_name?.trim() || "Khach-hang";
  const service = quote.service_name?.trim() || quote.title?.trim() || quote.template_key?.trim() || "Dich-vu";
  const quoteNo = quote.quote_no?.trim();
  const parts = ["Bao-gia", part(customer, "Khach-hang"), part(service, "Dich-vu")];
  if (quoteNo) parts.push(part(quoteNo, "Ma-bao-gia"));
  return `${parts.join("-")}.pdf`;
}
