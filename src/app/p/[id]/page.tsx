import photographersData from "@/data/photographers.json";
import { Photographer } from "@/lib/types";
import { notFound } from "next/navigation";
import ImageGrid from "./ImageGrid";
import { MessageCircle } from "lucide-react";
import ProfileLabels from "./ProfileLabels";

export function generateStaticParams() {
  return photographersData.map((p) => ({
    id: p.ID,
  }));
}

export default function ProfilePage({ params }: { params: { id: string } }) {
  const photographer = (photographersData as Photographer[]).find(
    (p) => p.ID === params.id
  );

  if (!photographer) {
    notFound();
  }

  const whatsappMessage = encodeURIComponent(
    `Hello SPHOT,\nI want to book photographer ${photographer.Name}.\nCity: Seoul`
  );
  const whatsappUrl = `https://wa.me/+821079059788?text=${whatsappMessage}`;
  const profilePic = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/p/${photographer.ID}/${photographer.ID}.webp`;

  return (
    <div className="pb-28 md:pb-12 pt-6">
      {/* Desktop wrapper */}
      <div className="max-w-5xl mx-auto px-4 w-full">

        {/* Main Grid Layout for Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-12 md:gap-12">

          {/* Sidebar Info (Sticks on desktop) */}
          <div className="md:col-span-4 md:sticky md:top-24 md:h-fit mb-8 md:mb-0">

            {/* ProfileLabels is a client component that renders:
                back link, price/studio badge, info card, and desktop CTA */}
            <ProfileLabels
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

          {/* Main Portfolio Content */}
          <div className="md:col-span-8">
            <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-gray-100">Portfolio</h2>
            {/* Portfolio Grid component (Client) */}
            <ImageGrid photographerId={photographer.ID} />
          </div>
        </div>
      </div>

      {/* Fixed Bottom CTA (Mobile Only) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-100 z-40 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-foreground text-accent text-lg font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-transform"
        >
          <MessageCircle size={22} className="fill-accent" />
          Book via WhatsApp
        </a>
      </div>
    </div>
  );
}
