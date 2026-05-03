"use client";

import { useRef, useState, useEffect } from "react";
import { Globe } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { Lang } from "@/lib/i18n";

const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
];

export default function LanguageSelector() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = LANGUAGES.find((l) => l.code === lang)!;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Select language"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-sm font-bold text-foreground dark:text-white border border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700"
      >
        <Globe size={15} className="text-gray-500 dark:text-zinc-400" />
        <span>{current.code.toUpperCase()}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden z-[100]">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800 ${
                lang === l.code
                  ? "bg-accent/10 text-foreground dark:text-white font-bold"
                  : "text-gray-700 dark:text-zinc-400"
              }`}
            >
              <span className="text-base">{l.flag}</span>
              {l.label}
              {lang === l.code && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
