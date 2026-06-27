import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(`${origin}/auth?error=oauth_callback_failed`);
  }

  const cookieStore = await cookies();

  let redirectTo = `${origin}/client/dashboard`;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/auth?error=oauth_callback_failed`);
  }

  if (next) {
    redirectTo = `${origin}${next}`;
  } else {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    const role = profile?.role;
    if (role === "admin") redirectTo = `${origin}/admin/dashboard`;
    else if (role === "photographer") redirectTo = `${origin}/photographer/dashboard`;
  }

  // Build the redirect and forward all cookies set during the exchange
  const response = NextResponse.redirect(redirectTo);
  cookieStore.getAll().forEach(({ name, value }) => {
    response.cookies.set(name, value);
  });

  return response;
}
