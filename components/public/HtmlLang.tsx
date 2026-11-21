"use client";

import { useEffect } from "react";

/** Đặt lang của thẻ <html> theo ngôn ngữ trang (/ vi, /en en). */
export function HtmlLang({ lang }: { lang: "vi" | "en" }) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return null;
}
