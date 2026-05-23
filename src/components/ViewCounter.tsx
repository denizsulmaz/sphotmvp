"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Eye } from "lucide-react";

interface Props {
  photographerId: string;
  increment?: boolean;
  showText?: boolean;
}

// Deterministic seeded baseline so counts feel organic from day 1
function getSeededBaseline(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return 503 + Math.abs(hash % 150);
}

const COOLDOWN_MS = 0; // Temporarily 0 for testing

/** Returns true if we should count this visit, and records the timestamp. */
function shouldCountView(photographerId: string): boolean {
  try {
    const key = `sphot_view_${photographerId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const lastSeen = parseInt(stored, 10);
      if (Date.now() - lastSeen < COOLDOWN_MS) {
        return false; // Already counted within the last 24 hours
      }
    }
    // Mark as counted now
    localStorage.setItem(key, String(Date.now()));
    return true;
  } catch {
    // localStorage unavailable — allow increment but don't block the UI
    return true;
  }
}

export default function ViewCounter({
  photographerId,
  increment = false,
  showText = false,
}: Props) {
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    const baseline = getSeededBaseline(photographerId);

    async function processViews() {
      console.log("Is Supabase configured?", !!supabase);
      // Early exit if Supabase is not initialized
      if (!supabase) {
        console.error("Supabase is NULL - Environment variables are missing!");
        if (isMounted) setViews(baseline);
        return;
      }

      if (increment) {
        // Only hit Supabase if the 24-hour cooldown has expired
        if (shouldCountView(photographerId)) {
          const { data, error } = await supabase.rpc(
            "increment_photographer_view",
            { p_id: photographerId }
          );
          if (error) console.error("Supabase RPC Error:", error);
          if (!error && data !== null && isMounted) {
            setViews(baseline + data);
            return;
          }
        } else {
          // Cooldown active — read without incrementing
          const { data, error } = await supabase
            .from("photographer_views")
            .select("count")
            .eq("photographer_id", photographerId)
            .single();
          if (error) console.error("Supabase Read Error:", error);
          if (!error && data && isMounted) {
            setViews(baseline + data.count);
            return;
          }
        }
        // Fallback to baseline if Supabase is unreachable
        if (isMounted) setViews(baseline);
      } else {
        // Card view — read-only, no increment
        const { data, error } = await supabase
          .from("photographer_views")
          .select("count")
          .eq("photographer_id", photographerId)
          .single();

        if (!error && data && isMounted) {
          setViews(baseline + data.count);
        } else if (isMounted) {
          setViews(baseline);
        }
      }
    }

    processViews();
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photographerId]);

  if (views === null) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-zinc-500 font-medium">
        <Eye size={14} />
        {showText && <span>viewed </span>}
        <div className="w-8 h-3 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse" />
        {showText && <span> times</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400 font-medium">
      <Eye size={14} className={showText ? "text-gray-500 dark:text-zinc-400" : "text-gray-400 dark:text-zinc-500"} />
      <span>
        {showText
          ? `viewed ${views.toLocaleString()} times`
          : views.toLocaleString()}
      </span>
    </div>
  );
}

