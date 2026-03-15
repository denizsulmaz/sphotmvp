"use client";

import { useState, useCallback, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

export default function ImageLightbox({ images, initialIndex, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, handleNext, handlePrev]);

  // Touch handlers for swipe
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const touchEnd = e.changedTouches[0].clientX;
    const isLeftSwipe = touchStart - touchEnd > 50;
    const isRightSwipe = touchEnd - touchStart > 50;

    if (isLeftSwipe) handleNext();
    if (isRightSwipe) handlePrev();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm">
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors z-50"
      >
        <X size={24} />
      </button>

      <div
        className="relative w-full h-full max-w-4xl max-h-[80vh] flex items-center justify-center"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <button
          onClick={handlePrev}
          className="absolute left-2 md:-left-12 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors z-50"
        >
          <ChevronLeft size={32} />
        </button>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[currentIndex]}
          alt={`Portfolio Image ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain select-none"
        />

        <button
          onClick={handleNext}
          className="absolute right-2 md:-right-12 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors z-50"
        >
          <ChevronRight size={32} />
        </button>
      </div>

      <div className="absolute bottom-6 text-white bg-black/50 px-4 py-1.5 rounded-full text-sm font-medium tracking-widest backdrop-blur-md">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
}
