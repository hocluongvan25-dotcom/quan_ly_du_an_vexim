"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { translations, defaultLocale, type Locale, locales, getTranslation, interpolate } from "./translations";

type I18nContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isVi: boolean;
  isEn: boolean;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("vexm-locale") as Locale | null;
    if (stored && locales.includes(stored)) {
      setLocaleState(stored);
      document.documentElement.lang = stored;
    } else {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith("vi")) {
        setLocaleState("vi");
        document.documentElement.lang = "vi";
      }
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("vexm-locale", newLocale);
    document.documentElement.lang = newLocale;
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const raw = getTranslation(locale, key, key);
    return interpolate(raw, params);
  };

  // Prevent hydration mismatch by rendering with default locale first, then updating
  // But we still want to provide context immediately
  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t,
        isVi: locale === "vi",
        isEn: locale === "en",
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}

// Safe hook that returns default translations if context not available (for server components fallback)
export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      locale: defaultLocale as Locale,
      setLocale: () => {},
      t: (key: string, params?: Record<string, string | number>) => {
        const raw = getTranslation(defaultLocale, key, key);
        return interpolate(raw, params);
      },
      isVi: false,
      isEn: true,
    };
  }
  return ctx;
}
