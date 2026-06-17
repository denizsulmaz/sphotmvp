"use client";

import { useEffect, useState } from "react";
import { notFound, useRouter } from "next/navigation";
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

export default function ProfilePage({ params }: { params: { id: string } }) {
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
            .eq("id", params.id)
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
            (p) => p.ID === params.id
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
            .eq("photographer_id", params.id)
            .eq("status", "available")
            .gt("start_time", new Date().toISOString())
            .order("start_time", { ascending: true });

          if (dbSlots && dbSlots.length > 0) {
            setSlots(dbSlots as DBAvailabilitySlot[]);
            setHasDBSlots(true);
          } else {
            setSlots([]);
            setHasDBSlots(false);
          }
        }
      } catch (err) {
        console.error("Error loading photographer profile:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [params.id]);

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

  const whatsappMessage = encodeURIComponent(
    `Hello SPHOT,\nI want to book photographer ${photographer.Name}.\nCity: Seoul`
  );
  const whatsappUrl = `https://wa.me/+821079059788?text=${whatsappMessage}`;
  
  // Try to use Supabase avatar_url if available, or fall back to webp media path
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(photographer.ID);
  const profilePic = isUuid 
    ? "/media/default-profile.webp" // We can define a generic profile fallback
    : `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/p/${photographer.ID}/${photographer.ID}.webp`;

  // Helper to format slot times
  const formatSlotDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const formatSlotTime = (isoStringStart: string, isoStringEnd: string) => {
    const start = new Date(isoStringStart);
    const end = new Date(isoStringEnd);
    return `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  // Group slots by date
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
              whatsappUrl={whatsappUrl}
            />
          </div>

          {/* Main Content & Portfolio */}
          <div className="md:col-span-8">
            
            {/* Booking Slots Section (Only displayed if photographer has active DB slots) */}
            {hasDBSlots && (
              <section className="mb-10 bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <CalendarIcon className="text-accent" size={22} />
                  <h3 className="text-xl font-black text-foreground dark:text-white">Select Availability Slot</h3>
                </div>
                
                <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4">
                  Choose an available hourly booking slot. The flat platform reservation fee is 25,000 KRW.
                </p>

                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 hide-scrollbar">
                  {Object.entries(groupedSlots).map(([dateStr, daySlots]) => (
                    <div key={dateStr} className="space-y-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                        {formatSlotDate(daySlots[0].start_time)}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {daySlots.map((slot) => (
                          <button
                            key={slot.id}
                            onClick={() => setSelectedSlot(slot)}
                            className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                              selectedSlot?.id === slot.id
                                ? "border-accent bg-accent/10 text-black dark:text-white font-black shadow-sm"
                                : "border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <Clock size={14} className="text-gray-400" />
                              {formatSlotTime(slot.start_time, slot.end_time)}
                            </span>
                            {selectedSlot?.id === slot.id && <ChevronRight size={16} className="text-black dark:text-white" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Inline CTA for selected slot */}
                {selectedSlot && (
                  <button
                    onClick={handleBookSlot}
                    className="w-full mt-6 py-4 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-black text-lg shadow-lg hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                  >
                    <span>Proceed to Book Slot</span>
                  </button>
                )}
              </section>
            )}

            <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-gray-100 dark:border-zinc-800 dark:text-white">Portfolio</h2>
            <ImageGrid photographerId={photographer.ID} portfolioUrls={portfolioUrls} />
          </div>
        </div>
      </div>

      {/* Fixed Bottom CTA (Mobile Only - Fallback to WhatsApp if photographer has no active DB slots) */}
      {!hasDBSlots && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-black/90 backdrop-blur-md border-t border-gray-100 dark:border-zinc-800 z-40 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-accent text-black text-lg font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-transform"
          >
            <MessageCircle size={22} className="fill-black" />
            Book via WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
