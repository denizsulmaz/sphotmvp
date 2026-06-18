"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import ChatWindow from "@/components/ChatWindow";
import { MessageSquare, Calendar, User, Search, AlertCircle } from "lucide-react";

interface ChatBooking {
  id: string;
  status: "paid" | "completed";
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
          .in("status", ["paid", "completed"]) // Chat is only unlocked after payment is confirmed
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
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch h-[560px]">
      
      {/* Sidebar: Conversations List */}
      <div className="md:col-span-4 bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-4 shadow-sm flex flex-col h-full overflow-hidden">
        <div className="mb-4 px-2">
          <h3 className="text-lg font-black text-foreground dark:text-white flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-black dark:bg-zinc-800 flex items-center justify-center text-accent shrink-0">
              <MessageSquare size={16} />
            </span>
            Client Chats
          </h3>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">Paid reservations messaging.</p>
        </div>

        {chatBookings.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-gray-400 dark:text-zinc-500 space-y-2">
            <MessageSquare size={28} className="mx-auto text-gray-300 dark:text-zinc-700" />
            <h4 className="text-sm font-bold text-foreground dark:text-white">No active chats</h4>
            <p className="text-xs">Chat will unlock as soon as a booking reservation fee is paid.</p>
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
                      alt={booking.profiles?.full_name || "Client"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="overflow-hidden flex-1 space-y-0.5">
                    <p className="text-sm font-bold text-foreground dark:text-white truncate">
                      {booking.profiles?.full_name || "Unknown Client"}
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
      <div className="md:col-span-8 h-full">
        {selectedBooking && user ? (
          <ChatWindow
            bookingId={selectedBooking.id}
            currentUserId={user.id}
            otherPartyName={selectedBooking.profiles?.full_name || "Client"}
            otherPartyAvatar={selectedBooking.profiles?.avatar_url || "/media/default-profile.webp"}
          />
        ) : (
          <div className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-3xl p-12 text-center shadow-sm h-full flex flex-col items-center justify-center">
            <MessageSquare size={48} className="text-gray-300 dark:text-zinc-700 mb-4" />
            <h3 className="text-lg font-black text-foreground dark:text-white">Select a Conversation</h3>
            <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">Choose a client from the left pane to send messages.</p>
          </div>
        )}
      </div>

    </div>
  );
}
