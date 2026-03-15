"use client";

import Link from "next/link";
import { Photographer } from "@/lib/types";
import { MessageCircle, Zap } from "lucide-react";

interface Props {
  photographer: Photographer;
}

export default function PhotographerCard({ photographer }: Props) {
  const images = [1, 2, 3].map((n) => `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/p/${photographer.ID}/${n}.webp`);
  const profilePic = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/p/${photographer.ID}/${photographer.ID}.webp`;

  const topCategories = photographer["Global Categories"]
    ?.split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 3) || [];

  const whatsappMessage = encodeURIComponent(
    `Hello SPHOT,\nI want to book photographer ${photographer.Name}.\nCity: Seoul`
  );
  const whatsappUrl = `https://wa.me/+821079059788?text=${whatsappMessage}`;

  return (
    // Entire card is a link to the profile
    <Link
      href={`/p/${photographer.ID}`}
      className="block bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden flex flex-col mb-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-accent hover:ring-2 hover:ring-accent/20 group"
    >
      {/* 3-image grid — all images absolutely positioned to fill containers */}
      <div className="grid grid-cols-2 gap-1 h-60 w-full overflow-hidden">
        {/* Left: large single image */}
        <div className="relative overflow-hidden bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[0]}
            alt="Portfolio 1"
            className="absolute inset-0 w-full h-full object-cover object-center"
            loading="lazy"
          />
        </div>
        {/* Right: two stacked images */}
        <div className="grid grid-rows-2 gap-1 overflow-hidden">
          <div className="relative overflow-hidden bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[1]}
              alt="Portfolio 2"
              className="absolute inset-0 w-full h-full object-cover object-center"
              loading="lazy"
            />
          </div>
          <div className="relative overflow-hidden bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[2]}
              alt="Portfolio 3"
              className="absolute inset-0 w-full h-full object-cover object-center"
              loading="lazy"
            />
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col gap-3 relative">
        {/* Circular profile pic overlapping images */}
        <div className="absolute -top-10 right-4 rounded-full border-4 border-white overflow-hidden w-16 h-16 bg-gray-100 shadow-sm z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profilePic}
            alt={photographer.Name}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        </div>

        {/* Name & Price */}
        <div className="mt-1 pr-16">
          <h2 className="text-xl font-bold text-foreground">
            {photographer.Name}
          </h2>
          <p className="text-sm text-gray-500 font-medium mt-0.5">
            From <span className="text-foreground font-bold">{photographer["Min Price KRW(per hour & starting from)"]}</span>
          </p>
        </div>

        {/* Top 3 Categories */}
        {topCategories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {topCategories.map((cat) => (
              <span
                key={cat}
                className="px-2 py-0.5 bg-gray-50 text-gray-600 border border-gray-100 rounded-md text-[10px] font-bold uppercase tracking-wider"
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Response speed + Book CTA */}
        <div className="flex items-center justify-between gap-3 mt-1">
          <div className="bg-accent/20 px-2 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold text-foreground overflow-hidden whitespace-nowrap">
            <Zap size={14} className="text-amber-500 fill-amber-500 shrink-0" />
            <span className="truncate">{photographer["Response Speed"]}</span>
          </div>

          {/* Book button — stopPropagation prevents card link from firing */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="px-4 py-2.5 rounded-xl bg-accent text-foreground text-sm font-black shadow-sm transition-transform active:scale-95 flex items-center gap-1.5"
          >
            <MessageCircle size={16} />
            Book
          </a>
        </div>
      </div>
    </Link>
  );
}
