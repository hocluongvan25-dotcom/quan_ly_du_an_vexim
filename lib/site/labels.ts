import type { Lang } from "./content";

export function sectionLabels(lang: Lang) {
  return lang === "en"
    ? { services: "Services", service: "Service", system: "Records", faq: "Questions", lookup: "Lookup", contact: "Contact" }
    : { services: "Dịch vụ", service: "Dịch vụ", system: "Hồ sơ", faq: "Hỏi đáp", lookup: "Tra cứu", contact: "Liên hệ" };
}
