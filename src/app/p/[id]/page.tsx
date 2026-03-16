import photographersData from "@/data/photographers.json";
import { Photographer } from "@/lib/types";
import { notFound } from "next/navigation";
import ImageGrid from "./ImageGrid"; 
import { MessageCircle, Instagram, Globe, Clock, Zap, MapPin, ArrowLeft, User } from "lucide-react";
import Link from "next/link";

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
        {/* Navigation back */}
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-foreground font-semibold mb-6 transition-colors">
          <ArrowLeft size={20} />
          Back to Photographers
        </Link>
        
        {/* Main Grid Layout for Desktop */}
         <div className="grid grid-cols-1 md:grid-cols-12 md:gap-12">
           
           {/* Sidebar Info (Sticks on desktop) */}
           <div className="md:col-span-4 md:sticky md:top-24 md:h-fit mb-8 md:mb-0">
             <div className="flex items-center gap-4 mb-4">
               <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 shadow-sm border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={profilePic} alt={photographer.Name} className="object-cover w-full h-full object-center" />
               </div>
               <div>
                 <h1 className="text-3xl font-black text-foreground">{photographer.Name}</h1>
                 <p className="text-gray-500 font-medium mt-1">
                   From <span className="text-foreground font-bold">{photographer["Min Price KRW(per hour & starting from)"]}</span>
                 </p>
                 {photographer.IsStudio && (
                   <span className="inline-block mt-2 px-2 py-0.5 bg-black text-white rounded text-[10px] font-bold uppercase tracking-widest">
                     Studio
                   </span>
                 )}
               </div>
             </div>


             {/* Categories & Styles */}
             <div className="mb-8 flex flex-wrap gap-2">
               {photographer["Global Categories"]?.split(",").map((cat) => (
                 <span key={cat.trim()} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold">
                   {cat.trim()}
                 </span>
               ))}
               {photographer.Style?.split(",").map((style) => (
                 <span key={style.trim()} className="px-3 py-1 bg-accent/20 border border-accent/50 text-foreground rounded-lg text-xs font-bold">
                   {style.trim()}
                 </span>
               ))}
             </div>

             {/* Information Details */}
             <div className="space-y-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
               <h2 className="text-lg font-bold mb-4">Information</h2>

               <div className="flex items-start gap-3">
                 <MapPin className="text-gray-400 mt-0.5" size={20} />
                 <div>
                   <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Location Types</p>
                   <p className="text-sm font-medium mt-0.5">{photographer["Location Types"]}</p>
                 </div>
               </div>

               <div className="flex items-start gap-3">
                 <Globe className="text-gray-400 mt-0.5" size={20} />
                 <div>
                   <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Languages</p>
                   <p className="text-sm font-medium mt-0.5">
                     {photographer.Languages} <span className="text-gray-400">({photographer["English Level"]} English)</span>
                   </p>
                 </div>
               </div>

               <div className="flex items-start gap-3">
                 <Clock className="text-gray-400 mt-0.5" size={20} />
                 <div>
                   <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Delivery Time</p>
                   <p className="text-sm font-medium mt-0.5">{photographer["Delivery Time"]}</p>
                 </div>
               </div>

               <div className="flex items-start gap-3">
                 <Zap className="text-amber-500 mt-0.5" size={20} />
                 <div>
                   <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Response Speed</p>
                   <p className="text-sm font-bold text-foreground mt-0.5">{photographer["Response Speed"]}</p>
                 </div>
               </div>
             </div>
             
             {/* Desktop CTA (Hidden on Mobile) */}
             <div className="hidden md:block mt-6">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-foreground text-accent text-lg font-black shadow-xl hover:-translate-y-1 active:scale-95 transition-transform"
                >
                  <MessageCircle size={22} className="fill-accent" />
                  Book Photographer
                </a>
             </div>
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
