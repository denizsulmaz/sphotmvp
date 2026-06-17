"use client";

import { useState, useEffect } from "react";
import ImageLightbox from "@/components/ImageLightbox";

interface Props {
  photographerId: string;
  portfolioUrls?: string[];
}

export default function ImageGrid({ photographerId, portfolioUrls }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [loadedImages, setLoadedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (portfolioUrls && portfolioUrls.length > 0) {
      setLoadedImages(portfolioUrls);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    
    async function discoverImages() {
      // Potential paths for images 1-20
      const paths = Array.from({ length: 20 }, (_, i) => 
        `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/media/p/${photographerId}/${i + 1}.webp`
      );
      
      // Probe all paths in parallel
      const results = await Promise.all(
        paths.map((src) => {
          return new Promise<string | null>((resolve) => {
            const img = new Image();
            img.onload = () => resolve(src);
            img.onerror = () => resolve(null);
            img.src = src;
          });
        })
      );
      
      const valid = results.filter((r): r is string => r !== null);
      
      if (isMounted) {
        setLoadedImages(valid);
        setIsLoading(false);
      }
    }

    setIsLoading(true);
    discoverImages();

    return () => {
      isMounted = false;
    };
  }, [photographerId]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-1 px-1 mt-8">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="aspect-square bg-gray-50 dark:bg-zinc-900 animate-pulse rounded-sm" />
        ))}
      </div>
    );
  }

  if (loadedImages.length === 0) {
    return (
      <div className="mt-8 text-center py-20 px-4 border-2 border-dashed border-gray-100 dark:border-zinc-800 rounded-3xl">
        <p className="text-gray-400 dark:text-zinc-500 font-medium">Portfolio images are currently being prepared or are not available yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="grid grid-cols-3 gap-1 px-1">
        {loadedImages.map((src, index) => (
          <div
            key={src}
            onClick={() => setLightboxIndex(index)}
            className="aspect-square relative bg-gray-100 dark:bg-zinc-800 cursor-pointer overflow-hidden group rounded-sm"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`Portfolio ${index + 1}`}
              className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700 ease-out"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
          </div>
        ))}
      </div>

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
