"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Calendar, Clock, User, CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/components/Toast";

interface DBBooking {
  id: string;
  status: "pending" | "paid" | "completed" | "cancelled";
  fee_krw: number;
  created_at: string;
  client_id: string;
  profiles: {
    full_name: string;
    avatar_url: string;
  } | null;
  availability_slots: {
    start_time: string;
    end_time: string;
  } | null;
}

export default function PhotographerDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<DBBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  // Redirect to onboarding if profile not set up yet
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user || !supabase) return;
      const { data } = await supabase
        .from("photographer_profiles")
        .select("categories")
        .eq("id", user.id)
        .single();
      if (!data?.categories?.length) {
        router.replace("/photographer/onboarding");
      }
    };
    checkOnboarding();
  }, [user, router]);

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
          client_id,
          profiles:client_id (
            full_name,
            avatar_url
          ),
          availability_slots:slot_id (
            start_time,
            end_time
          )
        `)
        .eq("photographer_id", user.id)
        .order("created_at", { ascending: false });

      if (dbError) throw dbError;
      setBookings((data || []) as any[]);
    } catch (err: any) {
      console.error("Error fetching bookings:", err);
      setError("Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const markCompleted = async (bookingId: string) => {
    if (!supabase) return;
    setActionLoading(bookingId);
    try {
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ status: "completed" })
        .eq("id", bookingId);
      if (updateError) throw updateError;
      setBookings(prev =>
        prev.map(b => (b.id === bookingId ? { ...b, status: "completed" } : b))
      );
    } catch (err: any) {
      console.error("Error updating booking status:", err);
      showToast("Failed to update booking status.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // Cancellation is a REQUEST — it never moves money. Any refund is reviewed and
  // issued by an admin (see admin Refunds queue). We send it through the
  // server route so the slot is released and the request is logged consistently.
  const requestCancellation = async (bookingId: string) => {
    if (!supabase) return;
    const reason = window.prompt(
      "Why are you cancelling this booking? Our team will review any refund.\n(This note is shared with our team.)"
    );
    if (reason === null) return; // user dismissed
    setActionLoading(bookingId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/cancel-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: session?.access_token,
          booking_id: bookingId,
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not request cancellation.");
      setBookings(prev =>
        prev.map(b => (b.id === bookingId ? { ...b, status: data.status } : b))
      );
      showToast("Cancellation requested. Our team will review any refund.", "success");
    } catch (err: any) {
      console.error("Error requesting cancellation:", err);
      showToast(err.message || "Failed to request cancellation.", "error");
    } finally {
      setActionLoading(null);
    }
  };

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
      
      {/* Header */}
      <div className="flex justify-between items-center bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 p-6 rounded-3xl shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-foreground dark:text-white">Studio Bookings</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Review reserve payments and booking status.</p>
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

      {/* Bookings List */}
      <div className="space-y-4">
        {bookings.length === 0 ? (
          <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-12 text-center shadow-sm">
            <Calendar size={48} className="mx-auto text-gray-300 dark:text-zinc-700 mb-4" />
            <h3 className="text-lg font-black text-foreground dark:text-white">No Bookings Yet</h3>
            <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">When users book slots, they will appear here.</p>
          </div>
        ) : (
          bookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-300 hover:border-gray-200 dark:hover:border-zinc-700"
            >
              
              {/* Left Column: Client & Date */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0">
                  <img
                    src={booking.profiles?.avatar_url || "/media/default-profile.webp"}
                    alt={booking.profiles?.full_name || "User"}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500 flex items-center gap-1">
                    <User size={12} />
                    {booking.profiles?.full_name || "Unknown User"}
                  </span>
                  
                  {booking.availability_slots ? (
                    <div className="text-sm font-bold text-foreground dark:text-white space-y-0.5">
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
                    <p className="text-sm text-red-500 font-bold">Slot deleted or not found</p>
                  )}
                </div>
              </div>

              {/* Right Column: Price, Status, & Actions */}
              <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 shrink-0">
                <div className="text-left md:text-right">
                  <p className="text-xs text-gray-400 dark:text-zinc-500 font-bold">Reservation Fee Paid</p>
                  <p className="text-lg font-black text-foreground dark:text-white">{(booking.fee_krw / 1000).toFixed(0)}k KRW</p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status Badge */}
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

                  {/* Actions for Paid Bookings */}
                  {booking.status === "paid" && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => markCompleted(booking.id)}
                        disabled={actionLoading === booking.id}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-xl transition-all"
                        title="Mark Session Completed"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                      <button
                        onClick={() => requestCancellation(booking.id)}
                        disabled={actionLoading === booking.id}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
                        title="Request Cancellation"
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
}
