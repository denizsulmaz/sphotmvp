import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // If a specific next URL was provided (e.g. checkout page), use it
      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Otherwise look up role and route to the right dashboard
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: profile } = await admin
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      const role = profile?.role;
      if (role === "admin") return NextResponse.redirect(`${origin}/admin/dashboard`);
      if (role === "photographer") return NextResponse.redirect(`${origin}/photographer/dashboard`);
      return NextResponse.redirect(`${origin}/client/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=oauth_callback_failed`);
}
