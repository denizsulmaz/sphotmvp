"use client";

import { useLanguage } from "@/context/LanguageContext";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import Link from "next/link";

const DUMMY_REVIEWS = [
  {
    id: 1,
    photographerId: "S01002",
    photographerName: "Stephanie",
    reviewerName: "Emily & Mark",
    reviewerCountry: "United States 🇺🇸",
    category: "Couple",
    quote: "Stephanie made us feel so comfortable! The Hanbok photos at Gyeongbokgung Palace came out looking like a movie poster. Best memory from our Seoul trip.",
    rating: 5,
    resultPic: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/reviews/hanbok_placeholder.jpg`
  },
  {
    id: 2,
    photographerId: "S01004",
    photographerName: "Lee Dae Ho Peter",
    reviewerName: "Sarah M.",
    reviewerCountry: "UK 🇬🇧",
    category: "Individual",
    quote: "I needed high-end professional photos and Peter delivered beyond expectations. His studio lighting is incredible.",
    rating: 5,
    resultPic: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/reviews/hanbok_placeholder.jpg`
  },
  {
    id: 3,
    photographerId: "S01009",
    photographerName: "Lucy Nam",
    reviewerName: "The Chen Family",
    reviewerCountry: "Singapore 🇸🇬",
    category: "Family",
    quote: "Lucy is so great with kids! She managed to get my 3-year-old smiling and the autumn leaves in Namsan Park were the perfect backdrop.",
    rating: 5,
    resultPic: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/reviews/hanbok_placeholder.jpg`
  },
  {
    id: 4,
    photographerId: "S01021",
    photographerName: "Hyunsuk Jung",
    reviewerName: "Jessica T.",
    reviewerCountry: "Canada 🇨🇦",
    category: "Branding",
    quote: "Absolutely stunning personal branding shots. He knows exactly how to direct poses to make you look powerful yet approachable.",
    rating: 5,
    resultPic: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/reviews/hanbok_placeholder.jpg`
  },
  {
    id: 5,
    photographerId: "S01007",
    photographerName: "Tina Nguyen",
    reviewerName: "Anna & David",
    reviewerCountry: "Australia 🇦🇺",
    category: "Engagement",
    quote: "We eloped in Seoul and Tina captured the raw emotion of our vows perfectly. These photos are our most treasured possession.",
    rating: 5,
    resultPic: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/reviews/hanbok_placeholder.jpg`
  }
];

export default function ReviewsSlider() {
  const { tCategory } = useLanguage();
  const sliderRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  return (
    <section className="py-16 md:py-24 overflow-hidden border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 md:px-8 mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight dark:text-white">Client Love</h2>
          <p className="text-gray-500 dark:text-zinc-500 mt-2 font-medium">Real stories from shoots in Seoul</p>
        </div>
        <div className="hidden md:flex gap-2">
          <button onClick={scrollLeft} aria-label="Previous reviews" className="p-2 rounded-full border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors">
            <ChevronLeft size={20} className="dark:text-white" />
          </button>
          <button onClick={scrollRight} aria-label="Next reviews" className="p-2 rounded-full border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors">
            <ChevronRight size={20} className="dark:text-white" />
          </button>
        </div>
      </div>

      <div 
        ref={sliderRef}
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory px-4 md:px-8 pb-8 no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {DUMMY_REVIEWS.map((review) => (
          <div 
            key={review.id} 
            className="w-[300px] md:w-[380px] snap-center bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-sm rounded-2xl flex flex-col overflow-hidden hover:shadow-md transition-shadow shrink-0"
          >
            {/* Using img to avoid Next.js Image config issues for external placeholders for now */}
            <div className="h-48 bg-gray-100 dark:bg-zinc-800 overflow-hidden relative">
               <img 
                 src={review.resultPic} 
                 alt="Photoshoot result" 
                 className="w-full h-full object-cover"
                 loading="lazy"
               />
               <div className="absolute top-3 left-3 px-2 py-1 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded text-[10px] font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300 border border-transparent dark:border-zinc-800">
                 {tCategory(review.category)}
               </div>
               <Link 
                 href={`/p/${review.photographerId}`}
                 className="absolute top-3 right-3 px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-[10px] font-bold text-white flex items-center gap-1 hover:bg-black transition-colors"
               >
                 📸 {review.photographerName}
               </Link>
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex text-accent mb-3">
                {[...Array(review.rating)].map((_, i) => (
                  <Star key={i} size={14} fill="currentColor" stroke="black" strokeWidth={1.5} />
                ))}
              </div>
              <div className="flex gap-2 text-gray-600 dark:text-zinc-300 mb-4 flex-1">
                <Quote size={16} className="shrink-0 text-gray-300 dark:text-zinc-700 mt-1" />
                <p className="text-sm italic font-medium leading-relaxed">{review.quote}</p>
              </div>
              <div className="border-t border-gray-100 dark:border-zinc-800 pt-4 mt-auto">
                <p className="font-bold text-sm text-foreground dark:text-white">{review.reviewerName}</p>
                <p className="text-xs text-gray-500 dark:text-zinc-500 font-medium">{review.reviewerCountry}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
