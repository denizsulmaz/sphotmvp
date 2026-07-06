"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import photographersData from "@/data/photographers.json";
import { Photographer } from "@/lib/types";
import ImageGrid from "./ImageGrid";
import ProfileLabels from "./ProfileLabels";
import { supabase } from "@/lib/supabase";

interface ProfilePageClientProps {
  id: string;
}

export default function ProfilePageClient({ id }: ProfilePageClientProps) {
  
  const [photographer, setPhotographer] = useState<Photographer | null>(null);
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfileData = async () => {
      setLoading(true);
      try {
        let matchedPhoto: Photographer | null = null;
        let pUrls: string[] = [];

        // 1. Fetch photographer from Supabase if possible.
        // The slug may be a public_code (e.g. S01023) or a raw UUID.
        if (supabase) {
          const isUuidParam = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
          const baseSelect = `
              *,
              profiles:id (
                full_name,
                avatar_url
              )
            `;
          let dbPhoto: any = null;
          // Try public_code first.
          const byCode = await supabase
            .from("photographer_profiles")
            .select(baseSelect)
            .eq("public_code", id)
            .maybeSingle();
          dbPhoto = byCode.data;
          // Fall back to UUID lookup if the slug is a UUID and no code matched.
          if (!dbPhoto && isUuidParam) {
            const byId = await supabase
              .from("photographer_profiles")
              .select(baseSelect)
              .eq("id", id)
              .maybeSingle();
            dbPhoto = byId.data;
          }

          if (dbPhoto) {
            matchedPhoto = {
              ID: dbPhoto.public_code || dbPhoto.id,
              Name: dbPhoto.profiles?.full_name || "Unknown Sphoter",
              "Delivery Time": dbPhoto.delivery_time || "1 week",
              "Global Categories": dbPhoto.categories ? dbPhoto.categories.join(", ") : "",
              Instagram: dbPhoto.instagram || "",
              "URL Instagram": dbPhoto.instagram_url || "",
              Languages: dbPhoto.languages ? dbPhoto.languages.join(", ") : "English",
              "English Level": dbPhoto.english_level || "Basic",
              "Other (Languages)": "",
              "Location Types": dbPhoto.locations ? dbPhoto.locations.join(", ") : "Outdoor / City etc",
              "Min Price KRW(per hour & starting from)": `₩${dbPhoto.base_price?.toLocaleString() || "0"}`,
              "Response Speed": dbPhoto.response_speed || "1–3 hours",
              Style: dbPhoto.styles ? dbPhoto.styles.join(", ") : "",
              "Style (Other)": "",
              hidden: !dbPhoto.is_approved,
              avatarUrl: dbPhoto.profiles?.avatar_url || "",
              publicCode: dbPhoto.public_code || "",
            };
            pUrls = dbPhoto.portfolio_urls || [];
          }
        }

        // 2. Fallback to static JSON if not in DB
        if (!matchedPhoto) {
          const staticPhoto = (photographersData as Photographer[]).find(
            (p) => p.ID === id
          );
          if (staticPhoto) {
            matchedPhoto = staticPhoto;
          }
        }

        if (!matchedPhoto || matchedPhoto.hidden) {
          setPhotographer(null);
          setLoading(false);
          return;
        }

        setPhotographer(matchedPhoto);
        setPortfolioUrls(pUrls);
      } catch (err) {
        console.error("Error loading photographer profile:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!photographer) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <p className="text-5xl mb-4">📷</p>
        <h2 className="text-2xl font-black text-foreground dark:text-white mb-2">Sphoter Not Found</h2>
        <p className="text-gray-500 dark:text-zinc-400 mb-6">This profile doesn&apos;t exist or may have been removed.</p>
        <Link href="/" className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-black text-sm hover:opacity-90 transition-all">
          Back to Browse
        </Link>
      </div>
    );
  }


  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(photographer.ID);
  const profilePic = isUuid
    ? photographer.avatarUrl || "/media/default-profile.webp"
    : `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/p/${photographer.ID}/${photographer.ID}.webp`;

  return (
    <div className="pb-28 md:pb-12 pt-6">
      <div className="max-w-5xl mx-auto px-4 w-full">
        
        {/* Main Grid Layout for Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-12 md:gap-12">

          {/* Sidebar Info (Sticks on desktop) */}
          <div className="md:col-span-4 md:sticky md:top-24 md:h-fit mb-8 md:mb-0">
            <ProfileLabels
              id={photographer.ID}
              name={photographer.Name}
              publicCode={photographer.publicCode}
              profilePic={profilePic}
              minPrice={photographer["Min Price KRW(per hour & starting from)"]}
              isStudio={!!photographer.IsStudio}
              categories={photographer["Global Categories"] ?? ""}
              styles={photographer.Style ?? ""}
              locationTypes={photographer["Location Types"] ?? ""}
              languages={photographer.Languages ?? ""}
              englishLevel={photographer["English Level"] ?? ""}
              otherLanguages={photographer["Other (Languages)"] ?? ""}
              deliveryTime={photographer["Delivery Time"] ?? ""}
              responseSpeed={photographer["Response Speed"] ?? ""}
            />
          </div>

          {/* Main Content & Portfolio */}
          <div className="md:col-span-8">
            <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-gray-100 dark:border-zinc-800 dark:text-white">Portfolio</h2>
            <ImageGrid photographerId={photographer.ID} portfolioUrls={portfolioUrls} />
          </div>
        </div>
      </div>

      {/* Fixed Bottom CTA (Mobile Only) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-black/90 backdrop-blur-md border-t border-gray-100 dark:border-zinc-800 z-40 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <Link
          href={`/p/${photographer.ID}/checkout`}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-accent text-black text-lg font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-center block"
        >
          Book Sphoter
        </Link>
      </div>
    </div>
  );
}
