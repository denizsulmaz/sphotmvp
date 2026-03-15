"use client";

import { X, SlidersHorizontal } from "lucide-react";
import { useState, useEffect } from "react";

interface FilterState {
  style: string | null;
  location: string | null;
  language: string | null;
  deliveryTime: string | null;
  responseSpeed: string | null;
}

interface Props {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  isOpen: boolean;
  onClose: () => void;
}

const FILTER_OPTIONS = {
  style: [
    "Hanbok",
    "Professional / High-end",
    "Aesthetic Body-focused",
    "Business / Branding / Personal Branding",
    "Dating Apps photo",
    "Elopements",
    "Sensual / Boudoir",
    "Women's Portraits",
    "Baby born",
  ],
  location: ["Indoor", "Outdoor", "Historical"],
  language: ["English", "Korean", "Other"],
  deliveryTime: ["Within 24 hours", "2-3 days", "1 week", "2 weeks", "Over 2 weeks"],
  responseSpeed: ["Under 1 hour", "1–3 hours", "3–6 hours"],
};

export default function FilterDrawer({ filters, setFilters, isOpen, onClose }: Props) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  // Sync localFilters every time the drawer opens
  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApply = () => {
    setFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    setLocalFilters({
      style: null,
      location: null,
      language: null,
      deliveryTime: null,
      responseSpeed: null,
    });
  };

  const toggleFilter = (key: keyof FilterState, val: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: prev[key] === val ? null : val,
    }));
  };

  const Section = ({ title, filterKey, options }: { title: string; filterKey: keyof FilterState; options: string[] }) => (
    <div className="mb-6">
      <h3 className="font-bold mb-3 text-sm uppercase tracking-wider text-gray-500">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => toggleFilter(filterKey, opt)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
              localFilters[filterKey] === opt
                ? "bg-foreground text-background border-foreground"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white z-50 rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden transform transition-transform md:max-w-xl md:mx-auto">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={20} className="text-foreground" />
            <h2 className="text-lg font-extrabold text-foreground">Filters</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 hide-scrollbar">
          <Section title="Style" filterKey="style" options={FILTER_OPTIONS.style} />
          <Section title="Location" filterKey="location" options={FILTER_OPTIONS.location} />
          <Section title="Languages" filterKey="language" options={FILTER_OPTIONS.language} />
          <Section title="Delivery Time" filterKey="deliveryTime" options={FILTER_OPTIONS.deliveryTime} />
          <Section title="Response Speed" filterKey="responseSpeed" options={FILTER_OPTIONS.responseSpeed} />
        </div>

        <div className="p-4 border-t border-gray-100 bg-white grid grid-cols-2 gap-3 sticky bottom-0 z-10 pb-8">
          <button onClick={handleReset} className="py-3.5 rounded-xl font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors">
            Reset
          </button>
          <button onClick={handleApply} className="py-3.5 rounded-xl font-bold bg-accent text-foreground shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2">
            Apply Filters
            {Object.values(localFilters).filter(Boolean).length > 0 && (
              <span className="bg-foreground text-accent text-[10px] w-5 h-5 flex items-center justify-center rounded-full leading-none shrink-0">
                {Object.values(localFilters).filter(Boolean).length}
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
