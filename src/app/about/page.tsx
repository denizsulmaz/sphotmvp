"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <div className="w-full">
      {/* Dark Header & Founder Section */}
      <div className="bg-black text-white w-full pt-6 md:pt-12 pb-16 md:pb-24">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white font-semibold mb-12 transition-colors text-sm">
            <ArrowLeft size={16} />
            {t("backToHome")}
          </Link>

          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            {t("aboutTitle").split("SPHOT")[0]}
            <span className="text-foreground dark:text-accent">SPHOT</span>
            {t("aboutTitle").split("SPHOT")[1]}
          </h1>
          <p className="text-gray-400 text-lg md:text-xl mb-16">{t("aboutSubtitle")}</p>

          {/* Founder Story */}
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
            <div className="w-full md:w-5/12 flex-shrink-0">
              <div className="relative aspect-square md:aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl bg-gray-900 border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/irina.png`}
                  alt="Irina - Founder of SPHOT"
                  className="absolute inset-0 w-full h-full object-cover object-center"
                />
              </div>
            </div>
            <div className="w-full md:w-7/12 flex flex-col justify-center">
              <h2 className="text-3xl font-bold mb-5 text-white">{t("meetFounder")}</h2>
              <p className="text-gray-300 leading-relaxed text-lg mb-4">{t("founderStory1")}</p>
              <p className="text-gray-300 leading-relaxed text-lg">{t("founderStory2")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Light Content Section */}
      <div className="bg-white dark:bg-black text-foreground dark:text-zinc-100 w-full py-16 md:py-24 transition-colors">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          <div className="prose prose-gray dark:prose-invert max-w-none space-y-12">
            <section>
              <h2 className="text-3xl font-bold mb-4 dark:text-white">{t("whatIsSphot")}</h2>
              <p className="text-gray-600 dark:text-zinc-400 leading-relaxed text-lg">{t("whatIsSphotText")}</p>
            </section>

            <section>
              <h2 className="text-3xl font-bold mb-4 dark:text-white">{t("ourMission")}</h2>
              <p className="text-gray-600 dark:text-zinc-400 leading-relaxed text-lg">{t("ourMissionText")}</p>
            </section>

            <section>
              <h2 className="text-3xl font-bold mb-6 dark:text-white">{t("howItWorks")}</h2>
              <ol className="space-y-6 text-gray-600 dark:text-zinc-400 text-lg">
                <li className="flex gap-5 items-start">
                  <span className="flex-shrink-0 w-10 h-10 mt-1 rounded-full bg-accent flex items-center justify-center font-black text-black">1</span>
                  <div className="pt-2"><strong className="text-foreground dark:text-white">{t("step1Label")} </strong>{t("step1Text")}</div>
                </li>
                <li className="flex gap-5 items-start">
                  <span className="flex-shrink-0 w-10 h-10 mt-1 rounded-full bg-accent flex items-center justify-center font-black text-black">2</span>
                  <div className="pt-2"><strong className="text-foreground dark:text-white">{t("step2Label")} </strong>{t("step2Text")}</div>
                </li>
                <li className="flex gap-5 items-start">
                  <span className="flex-shrink-0 w-10 h-10 mt-1 rounded-full bg-accent flex items-center justify-center font-black text-black">3</span>
                  <div className="pt-2"><strong className="text-foreground dark:text-white">{t("step3Label")} </strong>{t("step3Text")}</div>
                </li>
              </ol>
            </section>

            <section>
              <h2 className="text-3xl font-bold mb-4 dark:text-white">{t("getInTouch")}</h2>
              <p className="text-gray-600 dark:text-zinc-400 leading-relaxed text-lg">
                {t("getInTouchText")}{" "}
                <a href="mailto:hi@booksphot.com" className="text-foreground dark:text-white font-bold underline underline-offset-4 hover:text-accent transition-colors">
                  hi@booksphot.com
                </a>.
                <br /><br />
                {t("followUs")}{" "}
                <a href="https://instagram.com/booksphot" target="_blank" rel="noopener noreferrer" className="text-foreground dark:text-white font-bold underline underline-offset-4 hover:text-accent transition-colors">Instagram</a>{" "}
                {t("and")}{" "}
                <a href="https://tiktok.com/@booksphot" target="_blank" rel="noopener noreferrer" className="text-foreground dark:text-white font-bold underline underline-offset-4 hover:text-accent transition-colors">TikTok</a>{" "}
                {t("at")} <strong className="dark:text-white">@booksphot</strong>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
