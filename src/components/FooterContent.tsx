"use client";

import Link from "next/link";
import FooterCity from "@/components/FooterCity";
import { useLanguage } from "@/context/LanguageContext";

export default function FooterContent() {
  const { t } = useLanguage();

  return (
    <footer className="w-full bg-black text-white py-16 mt-24 border-t-2 border-transparent dark:border-accent">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Top Row */}
        <div className="flex flex-col md:flex-row justify-between gap-12 mb-12">
          {/* Brand */}
          <div className="max-w-xs">
            <h2 className="text-2xl font-black tracking-tighter mb-2">
              SPHOT<span className="text-accent">.</span>
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              {t("footerTagline")}
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-4 mt-5">
              <a
                href="https://instagram.com/booksphot"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="SPHOT Instagram"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-accent hover:text-black flex items-center justify-center transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a
                href="https://tiktok.com/@booksphot"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="SPHOT TikTok"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-accent hover:text-black flex items-center justify-center transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.25 8.25 0 004.84 1.56V6.81a4.85 4.85 0 01-1.07-.12z"/>
                </svg>
              </a>
              <a
                href="mailto:hi@booksphot.com"
                aria-label="Email SPHOT"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-accent hover:text-black flex items-center justify-center transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-sm">
            <div>
              <h3 className="font-bold text-white mb-4 uppercase tracking-wider text-xs">{t("footerCompany")}</h3>
              <ul className="space-y-3 text-gray-400">
                <li><Link href="/about" className="hover:text-white transition-colors">{t("footerAbout")}</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><a href="mailto:hi@booksphot.com" className="hover:text-white transition-colors">{t("footerContact")}</a></li>
                <li className="pt-1">
                  <Link href="/auth/photographer" className="text-accent hover:underline font-extrabold transition-colors">
                    I&apos;m a photographer
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-white mb-4 uppercase tracking-wider text-xs">{t("footerLegal")}</h3>
              <ul className="space-y-3 text-gray-400">
                <li><Link href="/terms" className="hover:text-white transition-colors">{t("footerTerms")}</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">{t("footerPrivacy")}</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-white mb-4 uppercase tracking-wider text-xs">{t("footerConnect")}</h3>
              <ul className="space-y-3 text-gray-400">
                <li><a href="https://instagram.com/booksphot" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Instagram</a></li>
                <li><a href="https://tiktok.com/@booksphot" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">TikTok</a></li>
                <li><a href="mailto:hi@booksphot.com" className="hover:text-white transition-colors">hi@booksphot.com</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-gray-500">
          <span>© {new Date().getFullYear()} SPHOT. {t("footerRights")}</span>
          <FooterCity />
        </div>
      </div>
    </footer>
  );
}
