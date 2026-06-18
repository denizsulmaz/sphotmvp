"use client";

import { useEffect, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import photographersData from "@/data/photographers.json";
import { Photographer } from "@/lib/types";
import ImageGrid from "./ImageGrid";
import ProfileLabels from "./ProfileLabels";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";
import { Calendar as CalendarIcon, Clock, ChevronRight, MessageCircle } from "lucide-react";

interface DBAvailabilitySlot {
  id: string;
  photographer_id: string;
  start_time: string;
  end_time: string;
  status: "available" | "booked";
}

interface ProfilePageClientProps {
  id: string;
}

export default function ProfilePageClient({ id }: ProfilePageClientProps) {
  const router = useRouter();
  const { t } = useLanguage();
  
  const [photographer, setPhotographer] = useState<Photographer | null>(null);
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>([]);
  const [slots, setSlots] = useState<DBAvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<DBAvailabilitySlot | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [hasDBSlots, setHasDBSlots] = useState(false);

  useEffect(() => {
    const loadProfileData = async () => {
      setLoading(true);
      try {
        let matchedPhoto: Photographer | null = null;
        let pUrls: string[] = [];

        // 1. Fetch photographer from Supabase if possible
        if (supabase) {
          const { data: dbPhoto, error: dbError } = await supabase
            .from("photographer_profiles")
            .select(`
              *,
              profiles:id (
                full_name,
                avatar_url
              )
            `)
            .eq("id", id)
            .maybeSingle();

          if (dbPhoto) {
            matchedPhoto = {
              ID: dbPhoto.id,
              Name: dbPhoto.profiles?.full_name || "Unknown Photographer",
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
              hidden: !dbPhoto.is_approved
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

        if (!matchedPhoto) {
          setPhotographer(null);
          setLoading(false);
          return;
        }

        setPhotographer(matchedPhoto);
        setPortfolioUrls(pUrls);

        // 3. Fetch hourly availability slots from Supabase
        if (supabase) {
          const { data: dbSlots } = await supabase
            .from("availability_slots")
            .select("*")
            .eq("photographer_id", id)
            .eq("status", "available")
            .gt("start_time", new Date().toISOString())
            .order("start_time", { ascending: true });

          if (dbSlots && dbSlots.length > 0) {
            setSlots(dbSlots as DBAvailabilitySlot[]);
            setHasDBSlots(true);
          } else {
            // Test Mode: Auto-populate mock slots for testing/QA purposes if no active slots exist in DB
            const mockSlots: DBAvailabilitySlot[] = [];
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Slot 1: Tomorrow 10:00 AM - 11:00 AM
            const t1Start = new Date(tomorrow);
            t1Start.setHours(10, 0, 0, 0);
            const t1End = new Date(tomorrow);
            t1End.setHours(11, 0, 0, 0);

            // Slot 2: Tomorrow 2:00 PM - 3:00 PM
            const t2Start = new Date(tomorrow);
            t2Start.setHours(14, 0, 0, 0);
            const t2End = new Date(tomorrow);
            t2End.setHours(15, 0, 0, 0);

            const dayAfter = new Date();
            dayAfter.setDate(dayAfter.getDate() + 2);

            // Slot 3: Day after 11:00 AM - 12:00 PM
            const d1Start = new Date(dayAfter);
            d1Start.setHours(11, 0, 0, 0);
            const d1End = new Date(dayAfter);
            d1End.setHours(12, 0, 0, 0);

            // Slot 4: Day after 4:00 PM - 5:00 PM
            const d2Start = new Date(dayAfter);
            d2Start.setHours(16, 0, 0, 0);
            const d2End = new Date(dayAfter);
            d2End.setHours(17, 0, 0, 0);

            mockSlots.push(
              { id: "mock-slot-1", photographer_id: id, start_time: t1Start.toISOString(), end_time: t1End.toISOString(), status: "available" },
              { id: "mock-slot-2", photographer_id: id, start_time: t2Start.toISOString(), end_time: t2End.toISOString(), status: "available" },
              { id: "mock-slot-3", photographer_id: id, start_time: d1Start.toISOString(), end_time: d1End.toISOString(), status: "available" },
              { id: "mock-slot-4", photographer_id: id, start_time: d2Start.toISOString(), end_time: d2End.toISOString(), status: "available" }
            );

            setSlots(mockSlots);
            setHasDBSlots(true);
          }
        }
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
    notFound();
  }


  
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(photographer.ID);
  const profilePic = isUuid 
    ? "/media/default-profile.webp"
    : `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/p/${photographer.ID}/${photographer.ID}.webp`;

  const formatSlotDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const formatSlotTime = (isoStringStart: string, isoStringEnd: string) => {
    const start = new Date(isoStringStart);
    const end = new Date(isoStringEnd);
    return `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  const groupedSlots = slots.reduce<Record<string, DBAvailabilitySlot[]>>((acc, slot) => {
    const key = new Date(slot.start_time).toDateString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(slot);
    return acc;
  }, {});

  const handleBookSlot = () => {
    if (!selectedSlot) return;
    router.push(`/p/${photographer.ID}/checkout?slot=${selectedSlot.id}`);
  };

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
          Book Photographer
        </Link>
      </div>
    </div>
  );
}
