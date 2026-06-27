"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!supabase) {
      router.replace("/auth?error=oauth_callback_failed");
      return;
    }

    const next = searchParams.get("next");

    const { data: { subscription } } = supabase!.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        subscription.unsubscribe();

        if (next) {
          router.replace(next);
          return;
        }

        const { data: profile } = await supabase!
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        const role = profile?.role;
        if (role === "admin") router.replace("/admin/dashboard");
        else if (role === "photographer") router.replace("/photographer/dashboard");
        else router.replace("/client/dashboard");
      }
    });

    // Fallback if already signed in
    supabase!.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        subscription.unsubscribe();
        router.replace(next ?? "/client/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="w-8 h-8 border-2 border-gray-300 dark:border-zinc-600 border-t-black dark:border-t-white rounded-full animate-spin" />
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-gray-300 dark:border-zinc-600 border-t-black dark:border-t-white rounded-full animate-spin" />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
