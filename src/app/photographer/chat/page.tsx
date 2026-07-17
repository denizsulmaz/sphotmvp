"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import ChatWindow from "@/components/ChatWindow";
import { MessageSquare, Calendar, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import { WORKFLOW_STEPS, STATUS_PAST_LABEL } from "@/lib/workflow";

interface ChatBooking {
  id: string;
  status: string;
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

export default function PhotographerChatPortal() {
  const { user } = useAuth();
  const [chatBookings, setChatBookings] = useState<ChatBooking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<ChatBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchChatBookings = async () => {
      if (!user || !supabase) return;
      setLoading(true);
      try {
        const { data, error: dbError } = await supabase
          .from("bookings")
          .select(`
            id,
            status,
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
          .in("status", ["booking", "shooted", "edited", "sent", "completed", "paid", "confirmed"]) // Open for any active booking status
          .order("created_at", { ascending: false });

        if (dbError) throw dbError;
        setChatBookings((data || []) as any[]);
        if (data && data.length > 0) {
          setSelectedBooking(data[0] as any);
        }
      } catch (err: any) {
        console.error("Error loading chat conversations:", err);
        setError("Failed to load active chats.");
      } finally {
        setLoading(false);
      }
    };

    fetchChatBookings();
  }, [user]);

  const advanceSelectedBooking = async () => {
    if (!supabase || !selectedBooking) return;
    const step = WORKFLOW_STEPS[selectedBooking.status];
    if (!step) return;
    setAdvancing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/booking/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: session?.access_token,
          bookingId: selectedBooking.id,
          nextStatus: step.next,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update booking status.");
      setChatBookings(prev =>
        prev.map(b => (b.id === selectedBooking.id ? { ...b, status: step.next } : b))
      );
      setSelectedBooking(prev => (prev ? { ...prev, status: step.next } : prev));
      showToast(`Booking marked as ${STATUS_PAST_LABEL[step.next] || step.next}.`, "success");
    } catch (err: any) {
      console.error("Error updating booking status:", err);
      showToast(err.message || "Failed to update booking status.", "error");
    } finally {
      setAdvancing(false);
    }
  };

  const formatSlotDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start h-auto">
      
      {/* Sidebar: Conversations List */}
      <div className="md:col-span-4 bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-4 shadow-sm flex flex-col h-auto md:h-[680px] overflow-hidden">
        <div className="mb-4 px-2">
          <h3 className="text-lg font-black text-foreground dark:text-white flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-black dark:bg-zinc-800 flex items-center justify-center text-accent shrink-0">
              <MessageSquare size={16} />
            </span>
            User Chats
          </h3>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">Messaging for your active bookings.</p>
        </div>

        {chatBookings.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-gray-400 dark:text-zinc-500 space-y-2">
            <MessageSquare size={28} className="mx-auto text-gray-300 dark:text-zinc-700" />
            <h4 className="text-sm font-bold text-foreground dark:text-white">No active chats</h4>
            <p className="text-xs">Chat opens as soon as a client books one of your slots.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 hide-scrollbar">
            {chatBookings.map((booking) => {
              const isActive = selectedBooking?.id === booking.id;
              const dateStr = booking.availability_slots 
                ? formatSlotDate(booking.availability_slots.start_time)
                : "Deleted Slot";

              return (
                <button
                  key={booking.id}
                  onClick={() => setSelectedBooking(booking)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left border transition-all ${
                    isActive
                      ? "bg-accent/10 border-accent/20 font-black"
                      : "border-transparent hover:bg-gray-50 dark:hover:bg-zinc-900"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0">
                    <img
                      src={booking.profiles?.avatar_url || "/media/default-profile.webp"}
                      alt={booking.profiles?.full_name || "User"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="overflow-hidden flex-1 space-y-0.5">
                    <p className="text-sm font-bold text-foreground dark:text-white truncate">
                      {booking.profiles?.full_name || "Unknown User"}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500 flex items-center gap-1">
                      <Calendar size={12} />
                      Shoot date: {dateStr}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main chat viewport */}
      <div className="md:col-span-8 h-[600px] md:h-[680px] flex flex-col gap-3">
        {selectedBooking && user ? (
          <>
            {/* Workflow bar: current status + next-step action */}
            <div className="flex items-center justify-between gap-3 bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-2xl px-4 py-2.5 shadow-sm shrink-0">
              <span className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                Status:{" "}
                <span className="text-foreground dark:text-white">{selectedBooking.status}</span>
              </span>
              {WORKFLOW_STEPS[selectedBooking.status] && (
                <button
                  onClick={advanceSelectedBooking}
                  disabled={advancing}
                  className="flex items-center gap-1.5 text-xs font-black bg-accent text-black px-3 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <CheckCircle2 size={13} />
                  <span>{advancing ? "Updating…" : WORKFLOW_STEPS[selectedBooking.status].actionLabel}</span>
                </button>
              )}
            </div>
            <div className="flex-1 min-h-0">
              <ChatWindow
                bookingId={selectedBooking.id}
                currentUserId={user.id}
                otherPartyName={selectedBooking.profiles?.full_name || "User"}
                otherPartyAvatar={selectedBooking.profiles?.avatar_url || "/media/default-profile.webp"}
              />
            </div>
          </>
        ) : (
          <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-12 text-center shadow-sm h-full flex flex-col items-center justify-center">
            <MessageSquare size={48} className="text-gray-300 dark:text-zinc-700 mb-4" />
            <h3 className="text-lg font-black text-foreground dark:text-white">Select a Conversation</h3>
            <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">Choose a user from the left pane to send messages.</p>
          </div>
        )}
      </div>

    </div>
  );
}
