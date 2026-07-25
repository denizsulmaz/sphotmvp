"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export interface UnreadState {
  /** Number of conversations with unread messages. */
  count: number;
  /** Booking ids of those conversations (for per-conversation dots). */
  bookingIds: string[];
}

/**
 * Unread-message state for the signed-in user. Refreshes on new incoming
 * messages (realtime) and on the "sphot:unread-refresh" window event
 * (fired when a chat is marked read).
 */
export function useUnreadMessages(): UnreadState {
  const { user } = useAuth();
  const [state, setState] = useState<UnreadState>({ count: 0, bookingIds: [] });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user || !supabase) {
      setState({ count: 0, bookingIds: [] });
      return;
    }
    const client = supabase;
    let cancelled = false;

    const fetchUnread = async () => {
      try {
        const { data, error } = await client.rpc("unread_booking_ids");
        if (cancelled) return;
        if (!error && Array.isArray(data)) {
          setState({ count: data.length, bookingIds: data });
          return;
        }
        // Fallback for a DB that only has the older count RPC.
        const { data: count, error: cErr } = await client.rpc("unread_conversations_count");
        if (cancelled) return;
        setState({
          count: !cErr && typeof count === "number" ? count : 0,
          bookingIds: [],
        });
      } catch {
        if (!cancelled) setState({ count: 0, bookingIds: [] });
      }
    };

    const debouncedFetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(fetchUnread, 1000);
    };

    fetchUnread();

    // Realtime: RLS scopes INSERT events to conversations the user belongs to.
    // IMPORTANT: the channel name must be unique per hook instance — several
    // components (header, sidebar, chat list) mount this hook at once, and
    // supabase-js returns the SAME channel object for an existing name, so a
    // second `.on()` after `.subscribe()` throws and crashes the page.
    let channel: ReturnType<typeof client.channel> | null = null;
    try {
      channel = client
        .channel(`unread-messages:${user.id}:${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload: { new?: { sender_id?: string | null } }) => {
            if (payload.new?.sender_id !== user.id) debouncedFetch();
          }
        )
        .subscribe();
    } catch (e) {
      // Realtime is an enhancement — never let it take the page down.
      console.error("[useUnreadMessages] realtime subscribe failed:", e);
      channel = null;
    }

    const onRefresh = () => fetchUnread();
    window.addEventListener("sphot:unread-refresh", onRefresh);

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      window.removeEventListener("sphot:unread-refresh", onRefresh);
      if (channel) client.removeChannel(channel);
    };
  }, [user]);

  return state;
}
