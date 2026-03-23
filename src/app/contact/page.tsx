"use client";

import Link from "next/link";
import { ArrowLeft, Mail, Instagram, MessageCircle } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function ContactPage() {
  const { t } = useLanguage();

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-foreground font-semibold mb-10 transition-colors text-sm">
        <ArrowLeft size={16} />
        {t("backToHome")}
      </Link>

      <h1 className="text-4xl font-black tracking-tight mb-2">{t("contactTitle")}</h1>
      <p className="text-gray-500 text-lg mb-12">{t("contactSubtitle")}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Email */}
        <a
          href="mailto:hi@booksphot.com"
          className="group flex items-start gap-4 p-6 rounded-2xl border border-gray-200 hover:border-accent hover:shadow-md transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0 group-hover:bg-accent transition-colors">
            <Mail size={22} className="text-foreground" />
          </div>
          <div>
            <p className="font-bold text-foreground text-lg">{t("emailLabel")}</p>
            <p className="text-gray-500 text-sm mt-1">hi@booksphot.com</p>
            <p className="text-xs text-gray-400 mt-2">{t("emailDesc")}</p>
          </div>
        </a>

        {/* Instagram */}
        <a
          href="https://instagram.com/booksphot"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-4 p-6 rounded-2xl border border-gray-200 hover:border-accent hover:shadow-md transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0 group-hover:bg-accent transition-colors">
            <Instagram size={22} className="text-foreground" />
          </div>
          <div>
            <p className="font-bold text-foreground text-lg">Instagram</p>
            <p className="text-gray-500 text-sm mt-1">@booksphot</p>
            <p className="text-xs text-gray-400 mt-2">{t("instagramDesc")}</p>
          </div>
        </a>

        {/* TikTok */}
        <a
          href="https://tiktok.com/@booksphot"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-4 p-6 rounded-2xl border border-gray-200 hover:border-accent hover:shadow-md transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0 group-hover:bg-accent transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="text-foreground">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.25 8.25 0 004.84 1.56V6.81a4.85 4.85 0 01-1.07-.12z"/>
            </svg>
          </div>
          <div>
            <p className="font-bold text-foreground text-lg">TikTok</p>
            <p className="text-gray-500 text-sm mt-1">@booksphot</p>
            <p className="text-xs text-gray-400 mt-2">{t("tiktokDesc")}</p>
          </div>
        </a>

        {/* WhatsApp */}
        <a
          href="https://wa.me/+821079059788"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-4 p-6 rounded-2xl border border-gray-200 hover:border-accent hover:shadow-md transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0 group-hover:bg-accent transition-colors">
            <MessageCircle size={22} className="text-foreground" />
          </div>
          <div>
            <p className="font-bold text-foreground text-lg">WhatsApp</p>
            <p className="text-gray-500 text-sm mt-1">+82 10-7905-9788</p>
            <p className="text-xs text-gray-400 mt-2">{t("whatsappDesc")}</p>
          </div>
        </a>
      </div>

      <div className="mt-12 p-6 rounded-2xl bg-gray-50 border border-gray-100">
        <h2 className="font-bold text-lg mb-2">{t("photographerCTA")}</h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          {t("photographerCTAText")}{" "}
          <a href="mailto:hi@booksphot.com" className="font-bold text-foreground underline underline-offset-2 hover:text-accent transition-colors">
            hi@booksphot.com
          </a>{" "}
          with the subject line <em>{t("photographerCTASubject")}</em>.
        </p>
      </div>
    </div>
  );
}
