"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import PhotographerCard from "@/components/PhotographerCard";
import FilterDrawer from "@/components/FilterDrawer";
import CategoryScroll from "@/components/CategoryScroll";
import HomeBanner from "@/components/HomeBanner";
import ReviewsSlider from "@/components/ReviewsSlider";
import photographersData from "@/data/photographers.json";
import { Photographer, CATEGORIES } from "@/lib/types";
import { SlidersHorizontal } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { supabase, isSupabaseReady } from "@/lib/supabase";

/** Deterministic shuffle using Fisher-Yates — only runs once per mount */
function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function Home() {
  const { t, tCategory } = useLanguage();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  // null = "All" (no category filter)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const hasShuffled = useRef(false);

  const [filters, setFilters] = useState<{
    style: string | null;
    location: string | null;
    language: string | null;
    deliveryTime: string | null;
    responseSpeed: string | null;
  }>({
    style: null,
    location: null,
    language: null,
    deliveryTime: null,
    responseSpeed: null,
  });

  const [photographers, setPhotographers] = useState<Photographer[]>([]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchPhotographers = async () => {
      try {
        if (!isSupabaseReady(supabase)) {
          staticFallback();
          return;
        }

        const { data, error } = await supabase
          .from("photographer_profiles")
          .select(`
            *,
            profiles:id (
              full_name,
              avatar_url
            )
          `)
          .eq("is_approved", true);

        if (error || !data || data.length === 0) {
          staticFallback();
        } else {
          const mapped: Photographer[] = data.map((row: any) => ({
            ID: row.id,
            Name: row.profiles?.full_name || "Unknown Photographer",
            "Delivery Time": row.delivery_time || "1 week",
            "Global Categories": row.categories ? row.categories.join(", ") : "",
            Instagram: row.instagram || "",
            "URL Instagram": row.instagram_url || "",
            Languages: row.languages ? row.languages.join(", ") : "English",
            "English Level": row.english_level || "Basic",
            "Other (Languages)": "",
            "Location Types": row.locations ? row.locations.join(", ") : "Outdoor / City etc",
            "Min Price KRW(per hour & starting from)": `₩${row.base_price?.toLocaleString() || "0"}`,
            "Response Speed": row.response_speed || "1–3 hours",
            Style: row.styles ? row.styles.join(", ") : "",
            "Style (Other)": "",
            IsStudio: false,
            hidden: false
          }));
          
          if (isMounted && !hasShuffled.current) {
            hasShuffled.current = true;
            setPhotographers(shuffleArray(mapped));
          } else if (isMounted) {
            setPhotographers(mapped);
          }
        }
      } catch (err) {
        console.error("Error fetching photographers, using static fallback:", err);
        staticFallback();
      }
    };

    const staticFallback = () => {
      if (!isMounted) return;
      const visible = (photographersData as Photographer[]).filter(p => !p.hidden);
      if (!hasShuffled.current) {
        hasShuffled.current = true;
        setPhotographers(shuffleArray(visible));
      } else {
        setPhotographers(visible);
      }
    };

    fetchPhotographers();

    return () => {
      isMounted = false;
    };
  }, []);

  // filteredPhotographers: always respects BOTH active category AND all drawer filters
  const filteredPhotographers = useMemo(() => {
    return photographers.filter((p) => {
      if (selectedCategory && !p["Global Categories"]?.includes(selectedCategory)) return false;
      if (filters.style && !p.Style?.includes(filters.style)) return false;
      if (filters.location && !p["Location Types"]?.includes(filters.location)) return false;
      if (filters.language && !p.Languages?.includes(filters.language)) return false;
      if (filters.deliveryTime && p["Delivery Time"] !== filters.deliveryTime) return false;
      if (filters.responseSpeed && p["Response Speed"] !== filters.responseSpeed) return false;
      return true;
    });
  }, [photographers, selectedCategory, filters]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // Grouped view only when NO category selected AND NO filters active
  const showGroupedView = !selectedCategory && activeFilterCount === 0;

  const groupedPhotographers = useMemo(() => {
    const groups: Record<string, Photographer[]> = {};
    CATEGORIES.forEach(cat => {
      groups[cat] = photographers.filter(p => p["Global Categories"]?.includes(cat));
    });
    return Object.entries(groups).filter(([_, group]) => group.length > 0);
  }, [photographers]);

  // Filter button via Portal into global nav
  const filterButton = (
    <button
      onClick={() => setIsFilterOpen(true)}
      className="relative p-2 bg-gray-50 dark:bg-zinc-900 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
      aria-label="Open filters"
    >
      <SlidersHorizontal size={20} className="text-foreground dark:text-white" />
      {activeFilterCount > 0 && (
        <span className="absolute top-0.5 right-0.5 bg-accent w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-900" />
      )}
    </button>
  );

  const filterSlot = mounted ? document.getElementById("nav-filter-slot") : null;

  return (
    <div className="pb-20 bg-gray-50/50 dark:bg-transparent">
      {filterSlot && createPortal(filterButton, filterSlot)}

      <HomeBanner />

      <div className="px-4 md:px-8 mt-6 md:mt-10 mb-2">
        <h2 className="text-3xl font-extrabold tracking-tight dark:text-white">{t("exploreHeading")}</h2>
      </div>

      {/* Category Scroll */}
      <div className="bg-white dark:bg-transparent border-b border-gray-100 dark:border-zinc-800">
        <CategoryScroll
          selectedCategory={selectedCategory}
          onSelect={(cat) => {
            setSelectedCategory(cat);
            // Reset drawer filters when changing category
            setFilters({ style: null, location: null, language: null, deliveryTime: null, responseSpeed: null });
          }}
        />
      </div>

      <main className="px-4 md:px-8 mt-10 md:mt-12">
        {showGroupedView ? (
          /* Default: Grouped by category */
          <div className="space-y-14 mt-2">
            {groupedPhotographers.map(([category, group]) => (
              <section key={category}>
                <div className="flex justify-between items-end mb-4">
                  <h3 className="text-2xl font-bold dark:text-white">{tCategory(category)}</h3>
                  <button
                    onClick={() => setSelectedCategory(category)}
                    className="text-sm font-bold text-gray-400 dark:text-zinc-500 hover:text-foreground dark:hover:text-white transition-colors"
                  >
                    {t("viewAll")} ({group.length})
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {group.slice(0, 4).map((p, pIdx) => (
                    <PhotographerCard key={p.ID} photographer={p} priority={pIdx < 2} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          /* Filtered flat view: used when a category is selected OR any filter is active */
          <>
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-xl font-bold dark:text-white">
                {selectedCategory ? tCategory(selectedCategory) : t("allPhotographers")}
                {activeFilterCount > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-400 dark:text-zinc-500">· {activeFilterCount} {activeFilterCount > 1 ? t("filtersActive") : t("filterActive")}</span>
                )}
              </h2>
              <p className="text-sm font-semibold text-gray-500 dark:text-zinc-500">{filteredPhotographers.length} {t("results")}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPhotographers.map((p, pIdx) => (
                <PhotographerCard key={p.ID} photographer={p} priority={pIdx < 4} />
              ))}
            </div>

            {filteredPhotographers.length === 0 && (
              <div className="py-20 text-center">
                <p className="text-gray-500 font-medium">{t("noResults")}</p>
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setFilters({ style: null, location: null, language: null, deliveryTime: null, responseSpeed: null });
                  }}
                  className="mt-4 text-sm font-bold border-b-2 border-foreground dark:border-white pb-0.5 dark:text-white"
                >
                  {t("clearFilters")}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* <ReviewsSlider /> */}

      <FilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        setFilters={(newFilters) => {
          setFilters(newFilters);
        }}
      />
    </div>
  );
}
