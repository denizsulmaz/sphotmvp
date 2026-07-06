"use client";

import Link from "next/link";
import { ArrowLeft, Linkedin } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const IRINA_LINKEDIN = "https://www.linkedin.com/in/irinachus/";
const DENIZ_LINKEDIN = "https://www.linkedin.com/in/denizsulmaz/";

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
            Meet the Team
          </h1>
          <p className="text-gray-400 text-lg md:text-xl mb-16">The story behind your favourite photographer discovery platform.</p>

          {/* Team Members List */}
          <div className="space-y-16 md:space-y-24">
            
            {/* Member 1: Irina Chus */}
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
              <div className="w-full md:w-5/12 flex-shrink-0">
                <div className="relative aspect-square md:aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl bg-gray-900 border border-white/10 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/irina.png`}
                    alt="Irina Chus - Founder of SPHOT"
                    className="absolute inset-0 w-full h-full object-cover object-center"
                  />
                  <a
                    href={IRINA_LINKEDIN}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-4 right-4 bg-black/60 hover:bg-black/90 backdrop-blur-sm p-2 rounded-full border border-white/15 text-white/80 hover:text-white transition-all z-10 shadow-lg"
                    title="Connect on LinkedIn"
                  >
                    <Linkedin size={18} />
                  </a>
                </div>
              </div>
              <div className="w-full md:w-7/12 flex flex-col justify-center">
                <h2 className="text-3xl mb-5 text-white">
                  <span className="font-bold">Irina Chus</span>, <span className="font-normal text-gray-400">Founder</span>
                </h2>
                <p className="text-gray-300 leading-relaxed text-lg mb-4">
                  {"Hi, I'm Irina! When I moved to Seoul, I realized how incredibly hard it was to find the right photographer, whether for a personal portrait, a love story, or a professional branding shoot. Endlessly scrolling through social media, translating messages, and comparing prices felt overwhelming."}
                </p>
                <p className="text-gray-300 leading-relaxed text-lg">
                  {"We created SPHOT to solve this exact problem: an easy, transparent way to connect people who want beautiful photos with the talented, vetted photographers who capture them brilliantly."}
                </p>
              </div>
            </div>

            {/* Member 2: Deniz Sulmaz */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-8 md:gap-16">
              <div className="w-full md:w-5/12 flex-shrink-0">
                <div className="relative aspect-square md:aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl bg-gray-900 border border-white/10 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/DenizSphot.png`}
                    alt="Deniz Sulmaz - SPHOT"
                    className="absolute inset-0 w-full h-full object-cover object-center"
                  />
                  <a
                    href={DENIZ_LINKEDIN}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-4 right-4 bg-black/60 hover:bg-black/90 backdrop-blur-sm p-2 rounded-full border border-white/15 text-white/80 hover:text-white transition-all z-10 shadow-lg"
                    title="Connect on LinkedIn"
                  >
                    <Linkedin size={18} />
                  </a>
                </div>
              </div>
              <div className="w-full md:w-7/12 flex flex-col justify-center">
                <h2 className="text-3xl mb-5 text-white">
                  <span className="font-bold">Deniz Sulmaz</span>, <span className="font-normal text-gray-400">Co-Founder</span>
                </h2>
                <p className="text-gray-300 leading-relaxed text-lg mb-4">
                  {"Hi, it's Deniz! I've always had a deep love for creativity and technology. I believe that photography is the perfect intersection where artistic expression meets technical precision."}
                </p>
                <p className="text-gray-300 leading-relaxed text-lg">
                  {"Building SPHOT allowed us to connect passionate visual creators with people who want to preserve their most meaningful moments. Together, we combine our design and technical expertise to build a reliable, beautiful platform, driven by our shared passion for photography and connecting people."}
                </p>
              </div>
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
