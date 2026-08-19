"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  translations,
  Lang,
  TranslationKey,
  categoryNames,
  styleNames,
  filterOptionLabels,
} from "@/lib/i18n";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
  /** Translate a category name (e.g. "Couple" → "Пара") */
  tCategory: (key: string) => string;
  /** Translate a style name (e.g. "Hanbok" → "Ханбок") */
  tStyle: (key: string) => string;
  /** Translate a filter option value (e.g. "Indoor" → "В помещении") */
  tFilterOption: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  t: (key) => translations.en[key],
  tCategory: (key) => key,
  tStyle: (key) => key,
  tFilterOption: (key) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = localStorage.getItem("sphot_lang") as Lang | null;
    if (stored && ["en", "ru", "ko", "tr", "zh"].includes(stored)) {
      setLangState(stored);
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("sphot_lang", l);
  };

  // Fall back to English when a key isn't yet translated in the active language.
  // This lets us add only `en` + `tr` for new keys while ru/ko show English until reviewed.
  // The active-language blocks are typed as Partial (ru/ko may omit newer keys), so we
  // look them up loosely and always have the complete `en` block as the source of truth.
  const pick = (
    table: Record<Lang, Record<string, string>>,
    key: string
  ): string | undefined =>
    (table[lang] as Record<string, string>)[key] ?? table.en[key];

  const t = (key: TranslationKey): string =>
    pick(translations as unknown as Record<Lang, Record<string, string>>, key) ?? key;
  const tCategory = (key: string): string =>
    pick(categoryNames as unknown as Record<Lang, Record<string, string>>, key) ?? key;
  const tStyle = (key: string): string =>
    pick(styleNames as unknown as Record<Lang, Record<string, string>>, key) ?? key;
  const tFilterOption = (key: string): string =>
    pick(filterOptionLabels as unknown as Record<Lang, Record<string, string>>, key) ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tCategory, tStyle, tFilterOption }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
