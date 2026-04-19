"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import PhotographerCard from "@/components/PhotographerCard";
import FilterDrawer from "@/components/FilterDrawer";
import CategoryScroll from "@/components/CategoryScroll";
import HomeBanner from "@/components/HomeBanner";
import photographersData from "@/data/photographers.json";
import { Photographer, CATEGORIES } from "@/lib/types";
import { SlidersHorizontal } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function Home() {
  const { t, tCategory } = useLanguage();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  // null = "All" (no category filter)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

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
    const visible = (photographersData as Photographer[]).filter(p => !p.hidden);
    const shuffled = [...visible].sort(() => 0.5 - Math.random());
    setPhotographers(shuffled);
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
      className="relative p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
      aria-label="Open filters"
    >
      <SlidersHorizontal size={20} className="text-foreground" />
      {activeFilterCount > 0 && (
        <span className="absolute top-0.5 right-0.5 bg-accent w-2.5 h-2.5 rounded-full border-2 border-white" />
      )}
    </button>
  );

  const filterSlot = mounted ? document.getElementById("nav-filter-slot") : null;

  return (
    <div className="pb-20 bg-gray-50/50">
      {filterSlot && createPortal(filterButton, filterSlot)}

      <HomeBanner />

      <div className="px-4 md:px-8 mt-6 md:mt-10 mb-2">
        <h2 className="text-3xl font-extrabold tracking-tight">{t("exploreHeading")}</h2>
      </div>

      {/* Category Scroll */}
      <div className="bg-white border-b border-gray-100">
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
                  <h3 className="text-2xl font-bold">{tCategory(category)}</h3>
                  <button
                    onClick={() => setSelectedCategory(category)}
                    className="text-sm font-bold text-gray-400 hover:text-foreground transition-colors"
                  >
                    {t("viewAll")} ({group.length})
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {group.slice(0, 4).map((p) => (
                    <PhotographerCard key={p.ID} photographer={p} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          /* Filtered flat view: used when a category is selected OR any filter is active */
          <>
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-xl font-bold">
                {selectedCategory ? tCategory(selectedCategory) : t("allPhotographers")}
                {activeFilterCount > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-400">· {activeFilterCount} {activeFilterCount > 1 ? t("filtersActive") : t("filterActive")}</span>
                )}
              </h2>
              <p className="text-sm font-semibold text-gray-500">{filteredPhotographers.length} {t("results")}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPhotographers.map((p) => (
                <PhotographerCard key={p.ID} photographer={p} />
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
                  className="mt-4 text-sm font-bold border-b-2 border-foreground pb-0.5"
                >
                  {t("clearFilters")}
                </button>
              </div>
            )}
          </>
        )}
      </main>

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
