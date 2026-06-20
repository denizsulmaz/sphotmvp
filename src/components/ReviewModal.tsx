"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Star, X, AlertCircle } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface ReviewModalProps {
  bookingId: string;
  photographerId: string;
  photographerName: string;
  reviewerId: string;
  reviewerName: string;
  category?: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function ReviewModal({
  bookingId,
  photographerId,
  photographerName,
  reviewerId,
  reviewerName,
  category,
  onClose,
  onSubmitted,
}: ReviewModalProps) {
  const { t } = useLanguage();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [quote, setQuote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!quote.trim()) {
      setError(t("reviewCommentRequired"));
      return;
    }
    if (!supabase) {
      setError("Database is not configured.");
      return;
    }
    setSubmitting(true);
    const { error: insErr } = await supabase.from("reviews").insert({
      booking_id: bookingId,
      reviewer_id: reviewerId,
      photographer_id: photographerId,
      photographer_name: photographerName,
      reviewer_name: reviewerName || "Anonymous",
      category: category || null,
      quote: quote.trim(),
      rating,
      is_visible: true,
    });
    setSubmitting(false);
    if (insErr) {
      setError(insErr.message || "Failed to submit review.");
      return;
    }
    onSubmitted();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Leave a review"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-black text-foreground dark:text-white">{t("reviewRateShoot")}</h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
              {t("reviewWith")} <span className="font-bold text-foreground dark:text-white">{photographerName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close review dialog"
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-gray-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Star rating */}
        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                size={32}
                className={
                  (hover || rating) >= n
                    ? "fill-accent text-accent"
                    : "text-gray-300 dark:text-zinc-700"
                }
              />
            </button>
          ))}
        </div>

        <textarea
          rows={4}
          placeholder={t("reviewPlaceholder")}
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 text-sm outline-none text-foreground dark:text-white resize-none focus:border-black dark:focus:border-white transition-all"
        />

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 font-bold">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3.5 bg-accent text-black font-black rounded-xl text-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {submitting ? (
            <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            t("reviewSubmit")
          )}
        </button>
      </div>
    </div>
  );
}
