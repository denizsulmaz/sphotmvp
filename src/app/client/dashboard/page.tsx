"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Calendar, Clock, MessageSquare, AlertCircle, RefreshCw, Star } from "lucide-react";
import ReviewModal from "@/components/ReviewModal";

interface DBBooking {
  id: string;
  status: "pending" | "paid" | "completed" | "cancelled";
  fee_krw: number;
  created_at: string;
  photographer_id: string;
  photographer_profile: {
    instagram: string;
    profiles: {
      full_name: string;
      avatar_url: string;
    } | null;
  } | null;
  availability_slots: {
    start_time: string;
    end_time: string;
  } | null;
}

export default function ClientDashboard() {
  const { user, profile } = useAuth();
  const [bookings, setBookings] = useState<DBBooking[]>([]);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());
  const [reviewTarget, setReviewTarget] = useState<DBBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!user || !supabase) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from("bookings")
        .select(`
          id,
          status,
          fee_krw,
          created_at,
          photographer_id,
          photographer_profile:photographer_id (
            instagram,
            profiles:id (
              full_name,
              avatar_url
            )
          ),
          availability_slots:slot_id (
            start_time,
            end_time
          )
        `)
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });

      if (dbError) throw dbError;
      setBookings((data || []) as any[]);

      // Track which bookings the client has already reviewed.
      const { data: myReviews } = await supabase
        .from("reviews")
        .select("booking_id")
        .eq("reviewer_id", user.id);
      setReviewedBookingIds(new Set((myReviews || []).map((r: any) => r.booking_id).filter(Boolean)));
    } catch (err: any) {
      console.error("Error loading client bookings:", err);
      setError("Failed to fetch reservations.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const formatDateTime = (isoStart: string, isoEnd: string) => {
    const start = new Date(isoStart);
    const end = new Date(isoEnd);
    const dateStr = start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const timeStr = `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    return { dateStr, timeStr };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header bar */}
      <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground dark:text-white">My Reservations</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Track payments and manage photographer bookings.</p>
        </div>
        <button
          onClick={fetchBookings}
          className="p-3 bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          title="Refresh Bookings"
        >
          <RefreshCw size={18} className="text-gray-500 dark:text-zinc-400" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm border border-red-100 dark:border-red-950/50">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Bookings items */}
      <div className="space-y-4">
        {bookings.length === 0 ? (
          <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-12 text-center shadow-sm">
            <Calendar size={48} className="mx-auto text-gray-300 dark:text-zinc-700 mb-4" />
            <h3 className="text-lg font-black text-foreground dark:text-white">No Reservations</h3>
            <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">Go to photographer profiles to book availability slots.</p>
            <Link
              href="/"
              className="inline-block mt-5 px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-black text-sm rounded-full hover:opacity-90 transition-opacity"
            >
              Browse Photographers
            </Link>
          </div>
        ) : (
          bookings.map((booking) => {
            const photoName = booking.photographer_profile?.profiles?.full_name || "Unknown Photographer";
            const photoAvatar = booking.photographer_profile?.profiles?.avatar_url || "/media/default-profile.webp";

            return (
              <div
                key={booking.id}
                className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-300 hover:border-gray-200 dark:hover:border-zinc-700"
              >
                
                {/* Photographer Details & Slot */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0">
                    <img src={photoAvatar} alt={photoName} className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                      Studio
                    </span>
                    <h3 className="text-base font-black text-foreground dark:text-white leading-tight">
                      {photoName}
                    </h3>
                    
                    {booking.availability_slots ? (
                      <div className="text-sm font-bold text-foreground dark:text-white space-y-0.5 pt-1">
                        <p className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-gray-400" />
                          {formatDateTime(booking.availability_slots.start_time, booking.availability_slots.end_time).dateStr}
                        </p>
                        <p className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400 text-xs font-medium">
                          <Clock size={14} className="text-gray-400" />
                          {formatDateTime(booking.availability_slots.start_time, booking.availability_slots.end_time).timeStr}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-red-500 font-bold">Slot info not found</p>
                    )}
                  </div>
                </div>

                {/* Right side Status & Payment Details */}
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 shrink-0">
                  <div className="text-left md:text-right">
                    <p className="text-xs text-gray-400 dark:text-zinc-500 font-bold">Reservation Paid</p>
                    <p className="text-lg font-black text-foreground dark:text-white">{(booking.fee_krw / 1000).toFixed(0)}k KRW</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        booking.status === "paid"
                          ? "bg-accent/15 text-black dark:text-accent border border-accent/20"
                          : booking.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : booking.status === "cancelled"
                          ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                          : "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400 border border-gray-200 dark:border-zinc-800"
                      }`}
                    >
                      {booking.status}
                    </span>

                    {/* Chat CTA - Enabled only for paid bookings */}
                    {(booking.status === "paid" || booking.status === "completed") && (
                      <Link
                        href="/client/chat"
                        className="flex items-center gap-1.5 text-xs font-black bg-black dark:bg-white text-white dark:text-black px-3 py-2 rounded-xl hover:opacity-90 transition-opacity border border-transparent"
                      >
                        <MessageSquare size={13} />
                        <span>Chat</span>
                      </Link>
                    )}

                    {/* Review CTA - completed bookings not yet reviewed */}
                    {booking.status === "completed" && !reviewedBookingIds.has(booking.id) && (
                      <button
                        onClick={() => setReviewTarget(booking)}
                        className="flex items-center gap-1.5 text-xs font-black bg-accent text-black px-3 py-2 rounded-xl hover:opacity-90 transition-opacity"
                      >
                        <Star size={13} />
                        <span>Review</span>
                      </button>
                    )}
                    {booking.status === "completed" && reviewedBookingIds.has(booking.id) && (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <Star size={13} className="fill-current" />
                        Reviewed
                      </span>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {reviewTarget && user && (
        <ReviewModal
          bookingId={reviewTarget.id}
          photographerId={reviewTarget.photographer_id}
          photographerName={reviewTarget.photographer_profile?.profiles?.full_name || "Photographer"}
          reviewerId={user.id}
          reviewerName={profile?.full_name || "Anonymous"}
          onClose={() => setReviewTarget(null)}
          onSubmitted={() => {
            setReviewedBookingIds((prev) => new Set(prev).add(reviewTarget.id));
            setReviewTarget(null);
          }}
        />
      )}

    </div>
  );
}
