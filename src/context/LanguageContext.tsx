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
    if (stored && ["en", "ru", "ko", "tr"].includes(stored)) {
      setLangState(stored);
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("sphot_lang", l);
  };

  const t = (key: TranslationKey): string => translations[lang][key];
  const tCategory = (key: string): string => categoryNames[lang][key] ?? key;
  const tStyle = (key: string): string => styleNames[lang][key] ?? key;
  const tFilterOption = (key: string): string => filterOptionLabels[lang][key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tCategory, tStyle, tFilterOption }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
