"use client";

import { useLanguage } from "@/context/LanguageContext";
import { MapPin, Globe, Clock, Zap, MessageCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Props {
  name: string;
  profilePic: string;
  minPrice: string;
  isStudio: boolean;
  categories: string;
  styles: string;
  locationTypes: string;
  languages: string;
  englishLevel: string;
  deliveryTime: string;
  responseSpeed: string;
  whatsappUrl: string;
}

export default function ProfileLabels({
  name,
  profilePic,
  minPrice,
  isStudio,
  categories,
  styles,
  locationTypes,
  languages,
  englishLevel,
  deliveryTime,
  responseSpeed,
  whatsappUrl,
}: Props) {
  const { t, tCategory, tStyle } = useLanguage();

  return (
    <>
      {/* Back link */}
      <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-foreground font-semibold mb-6 transition-colors">
        <ArrowLeft size={20} />
        {t("backToPhotographers")}
      </Link>

      {/* Name + profile pic */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 shadow-sm border border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={profilePic} alt={name} className="object-cover w-full h-full object-center" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-foreground">{name}</h1>
          <p className="text-gray-500 font-medium mt-1">
            {t("from")} <span className="text-foreground font-bold">{minPrice}</span>
          </p>
          {isStudio && (
            <span className="inline-block mt-2 px-2 py-0.5 bg-black text-white rounded text-[10px] font-bold uppercase tracking-widest">
              {t("studio")}
            </span>
          )}
        </div>
      </div>

      {/* Categories & Styles */}
      <div className="mb-8 flex flex-wrap gap-2">
        {categories.split(",").filter(Boolean).map((cat) => (
          <span key={cat.trim()} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold">
            {tCategory(cat.trim())}
          </span>
        ))}
        {styles.split(",").filter(Boolean).map((style) => (
          <span key={style.trim()} className="px-3 py-1 bg-accent/20 border border-accent/50 text-foreground rounded-lg text-xs font-bold">
            {tStyle(style.trim())}
          </span>
        ))}
      </div>

      {/* Information Details */}
      <div className="space-y-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
        <h2 className="text-lg font-bold mb-4">{t("information")}</h2>

        <div className="flex items-start gap-3">
          <MapPin className="text-gray-400 mt-0.5" size={20} />
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t("locationTypes")}</p>
            <p className="text-sm font-medium mt-0.5">{locationTypes}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Globe className="text-gray-400 mt-0.5" size={20} />
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t("languages")}</p>
            <p className="text-sm font-medium mt-0.5">
              {languages} <span className="text-gray-400">({englishLevel} English)</span>
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Clock className="text-gray-400 mt-0.5" size={20} />
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t("deliveryTime")}</p>
            <p className="text-sm font-medium mt-0.5">{deliveryTime}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Zap className="text-amber-500 mt-0.5" size={20} />
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t("responseSpeed")}</p>
            <p className="text-sm font-bold text-foreground mt-0.5">{responseSpeed}</p>
          </div>
        </div>
      </div>

      {/* Desktop CTA */}
      <div className="hidden md:block mt-6">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-foreground text-accent text-lg font-black shadow-xl hover:-translate-y-1 active:scale-95 transition-transform"
        >
          <MessageCircle size={22} className="fill-accent" />
          {t("bookPhotographer")}
        </a>
      </div>
    </>
  );
}
