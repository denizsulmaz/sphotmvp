"use client";

import { supabase } from "@/lib/supabase";

// Messages already reported this page load — avoids flooding on render loops.
const reported = new Set<string>();

/**
 * Fire-and-forget client error report to /api/log-error.
 * Never throws; at most one report per distinct message per page load.
 */
export function reportError(
  error: unknown,
  source: "boundary" | "client" | "unhandledrejection" = "client"
): void {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    const key = `${source}:${err.message}`;
    if (reported.has(key) || reported.size > 20) return;
    reported.add(key);

    const send = async () => {
      let access_token: string | undefined;
      try {
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          access_token = data.session?.access_token;
        }
      } catch {
        /* report anonymously */
      }
      await fetch("/api/log-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token,
          message: err.message,
          stack: err.stack,
          page: window.location.pathname + window.location.search,
          source,
        }),
      });
    };
    send().catch(() => {});
  } catch {
    // Reporting must never cause an error itself.
  }
}
