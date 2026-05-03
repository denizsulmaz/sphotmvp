"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { CATEGORIES } from "@/lib/types";
import { useLanguage } from "@/context/LanguageContext";

// Map each category to a local static image downloaded from Unsplash
const CATEGORY_IMAGES: Record<string, string> = {
  "Individual":  `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/categories/individual.png`,
  "Couple":      `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/categories/couple.png`,
  "Family":      `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/categories/family.png`,
  "Wedding":     `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/categories/wedding.png`,
  "Editorial":   `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/categories/editorial.png`,
  "Lifestyle":   `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/categories/lifestyle.png`,
  "Event":       `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/categories/event.png`,
  "Hanbok":      `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/p/S01001/1.webp`,
  "Business":    `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/categories/business.png`,
  "Branding":    `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/categories/branding.png`,
  "Sports":      `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/categories/sports.png`,
};

interface Props {
  selectedCategory: string | null;
  onSelect: (cat: string | null) => void;
}

export default function CategoryScroll({ selectedCategory, onSelect }: Props) {
  const { t, tCategory } = useLanguage();
  const allCategories = [{ key: null, label: t("all") }, ...CATEGORIES.map(c => ({ key: c, label: tCategory(c) }))];

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    handleScroll();
    window.addEventListener("resize", handleScroll);
    return () => window.removeEventListener("resize", handleScroll);
  }, [allCategories.length]);

  return (
    <div className="relative w-full">
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="w-full overflow-x-auto hide-scrollbar py-3 px-4"
      >
        <div className="flex space-x-3">
        {allCategories.map(({ key, label }) => {
          const isSelected = selectedCategory === key;
          const bgImage = key ? (CATEGORY_IMAGES[key] || "") : "";

          return (
            <button
              key={label}
              onClick={() => onSelect(key)}
              className={`relative flex-shrink-0 w-28 rounded-2xl overflow-hidden shadow-sm flex flex-col items-center justify-end transition-all active:scale-95 ${
                isSelected
                  ? "ring-2 ring-offset-2 ring-accent dark:ring-offset-zinc-950 scale-[1.03]"
                  : "hover:scale-[1.02]"
              } ${!key ? "bg-accent" : "bg-zinc-100 dark:bg-zinc-900"}`}
              style={{ height: "108px" }}
            >
              {/* Fallback gradient behind the image (only for categories, not 'All') */}
              {key && <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black rounded-lg" />}
              
              {bgImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bgImage}
                  alt={label}
                  className="absolute inset-0 w-full h-full object-cover object-center z-0"
                  loading="lazy"
                />
              )}
              
              {/* Dark overlay only for category images, so text is readable. 'All' button text can be black/dark on yellow */}
              {key && <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />}

              <div className="relative z-20 w-full px-2 pb-2.5 text-center">
                <p className={`text-[11px] font-bold leading-tight drop-shadow-md ${key ? "text-white" : "text-black drop-shadow-none"}`}>
                  {label}
                </p>
              </div>

              {isSelected && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent z-30" />
              )}
            </button>
          );
        })}
      </div>
      </div>

      {showRightArrow && (
        <button 
          onClick={() => {
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollBy({ left: 300, behavior: "smooth" });
            }
          }}
          className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-end bg-gradient-to-l from-white dark:from-zinc-950 via-white/80 dark:via-zinc-950/80 to-transparent pr-2 z-40 focus:outline-none group opacity-90 transition-opacity hover:opacity-100"
          aria-label="Scroll right"
        >
          <div className="bg-white/90 dark:bg-zinc-900/90 rounded-full p-1 shadow-sm border border-gray-100 dark:border-zinc-800 animate-pulse group-hover:animate-none group-hover:scale-110 transition-transform text-gray-600 dark:text-zinc-400">
            <ChevronRight className="w-6 h-6" />
          </div>
        </button>
      )}
    </div>
  );
}
