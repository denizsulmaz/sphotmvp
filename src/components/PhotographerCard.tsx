"use client";

import Link from "next/link";
import { Photographer } from "@/lib/types";
import { MessageCircle } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import ViewCounter from "./ViewCounter";

interface Props {
  photographer: Photographer;
}

export default function PhotographerCard({ photographer }: Props) {
  const { t, tCategory } = useLanguage();
  const images = [1, 2, 3].map((n) => `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/p/${photographer.ID}/${n}.webp`);
  const profilePic = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/p/${photographer.ID}/${photographer.ID}.webp`;

  const topCategories = photographer["Global Categories"]
    ?.split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 3) || [];

  const whatsappMessage = encodeURIComponent(
    `Hello SPHOT,\nI want to book photographer ${photographer.Name}.\nCity: Seoul`
  );
  const whatsappUrl = `https://wa.me/+821079059788?text=${whatsappMessage}`;

  return (
    // Entire card is a link to the profile
    <Link
      href={`/p/${photographer.ID}`}
      className="block relative bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-sm dark:shadow-none rounded-2xl overflow-hidden flex flex-col mb-6 transition-all duration-300 hover:shadow-xl dark:hover:shadow-none hover:-translate-y-1 hover:border-accent hover:ring-2 hover:ring-accent/20 group"
    >
      {/* View Counter */}
      <div className="absolute top-3 left-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-2 py-1 rounded-md shadow-sm z-10 border border-gray-100 dark:border-zinc-800">
        <ViewCounter photographerId={photographer.ID} />
      </div>

      {/* 3-image grid — all images absolutely positioned to fill containers */}
      <div className="grid grid-cols-2 gap-1 h-60 w-full overflow-hidden">
        {/* Left: large single image */}
        <div className="relative overflow-hidden bg-gray-100 dark:bg-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[0]}
            alt="Portfolio 1"
            className="absolute inset-0 w-full h-full object-cover object-center"
            loading="lazy"
          />
        </div>
        {/* Right: two stacked images */}
        <div className="grid grid-rows-2 gap-1 overflow-hidden">
          <div className="relative overflow-hidden bg-gray-100 dark:bg-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[1]}
              alt="Portfolio 2"
              className="absolute inset-0 w-full h-full object-cover object-center"
              loading="lazy"
            />
          </div>
          <div className="relative overflow-hidden bg-gray-100 dark:bg-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[2]}
              alt="Portfolio 3"
              className="absolute inset-0 w-full h-full object-cover object-center"
              loading="lazy"
            />
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col gap-3 relative">
        {/* Circular profile pic overlapping images */}
        <div className="absolute -top-10 right-4 rounded-full border-4 border-white dark:border-zinc-900 overflow-hidden w-16 h-16 bg-gray-100 dark:bg-zinc-800 shadow-sm z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profilePic}
            alt={photographer.Name}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        </div>

        {/* Name & Price */}
        <div className="mt-1 pr-16">
          <h2 className="text-xl font-bold text-foreground dark:text-white">
            {photographer.Name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium mt-0.5">
            From <span className="text-foreground dark:text-zinc-200 font-bold">{photographer["Min Price KRW(per hour & starting from)"]}</span>
          </p>
        </div>

        {/* Top 3 Categories */}
        {topCategories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {topCategories.map((cat) => (
              <span
                key={cat}
                className="px-1.5 py-0.5 bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 border border-gray-100 dark:border-zinc-700 rounded-md text-[9px] font-bold uppercase tracking-wider whitespace-nowrap"
              >
                {tCategory(cat)}
              </span>
            ))}
          </div>
        )}

        {/* Book CTA */}
        <div className="mt-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-full px-4 py-2.5 rounded-xl bg-accent text-foreground text-sm font-black shadow-sm transition-transform active:scale-95 flex items-center justify-center gap-2"
          >
            <MessageCircle size={18} />
            {t("book")}
          </a>
        </div>
      </div>
    </Link>
  );
}
