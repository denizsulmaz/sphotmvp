"use client";

import { useState } from "react";
import ImageLightbox from "@/components/ImageLightbox";

interface Props {
  photographerId: string;
}

export default function ImageGrid({ photographerId }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  
  // Create an array of potential image paths (e.g. 1 to 12)
  const potentialImages = Array.from({ length: 20 }, (_, i) => `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/p/${photographerId}/${i + 1}.webp`);
  
  // We'll track which images successfully loaded
  const [loadedImages, setLoadedImages] = useState<string[]>([]);

  return (
    <div className="mt-8">
      {/* Hidden preloader to detect valid images */}
      <div className="hidden">
        {potentialImages.map((src, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            onLoad={() => {
              setLoadedImages((prev) => {
                if (!prev.includes(src)) {
                  // Keep them sorted by the order they appear in potentialImages
                  const newArray = [...prev, src];
                  newArray.sort((a, b) => {
                    const numA = parseInt(a.split("/").pop() || "0", 10);
                    const numB = parseInt(b.split("/").pop() || "0", 10);
                    return numA - numB;
                  });
                  return newArray;
                }
                return prev;
              });
            }}
            onError={(e) => {
              // Image doesn't exist, ignore
            }}
            alt={`Preload ${index}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-1 px-1">
        {loadedImages.map((src, index) => (
          <div
            key={src}
            onClick={() => setLightboxIndex(index)}
            className="aspect-square relative bg-gray-100 cursor-pointer overflow-hidden group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`Portfolio ${index + 1}`}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      {loadedImages.length === 0 && (
        <div className="text-center py-10 px-4">
          <p className="text-gray-400 font-medium">Portfolio images are loading or not available yet.</p>
        </div>
      )}

      {lightboxIndex !== null && (
        <ImageLightbox
          images={loadedImages}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
