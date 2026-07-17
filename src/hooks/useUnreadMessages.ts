"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

/**
 * Returns the number of conversations with unread messages for the
 * signed-in user. Refreshes on new incoming messages (realtime) and on
 * the "sphot:unread-refresh" window event (fired when a chat is marked read).
 */
export function useUnreadMessages(): number {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user || !supabase) {
      setCount(0);
      return;
    }
    const client = supabase;
    let cancelled = false;

    const fetchCount = async () => {
      try {
        const { data, error } = await client.rpc("unread_conversations_count");
        if (cancelled) return;
        if (error || typeof data !== "number") {
          setCount(0);
        } else {
          setCount(data);
        }
      } catch {
        if (!cancelled) setCount(0);
      }
    };

    const debouncedFetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(fetchCount, 1000);
    };

    fetchCount();

    // Realtime: RLS scopes INSERT events to conversations the user belongs to.
    const channel = client
      .channel(`unread-messages:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: { new?: { sender_id?: string | null } }) => {
          if (payload.new?.sender_id !== user.id) debouncedFetch();
        }
      )
      .subscribe();

    const onRefresh = () => fetchCount();
    window.addEventListener("sphot:unread-refresh", onRefresh);

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      window.removeEventListener("sphot:unread-refresh", onRefresh);
      client.removeChannel(channel);
    };
  }, [user]);

  return count;
}
