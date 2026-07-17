import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";

/**
 * Secure API route to reject (and completely delete) a photographer application.
 * Verifies that the caller is an authenticated admin first.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { access_token, photographer_id } = body;

    if (!access_token || !photographer_id) {
      return NextResponse.json(
        { error: "access_token and photographer_id are required." },
        { status: 400 }
      );
    }

    const supabase = getServerSupabase();

    // 1. Verify caller session
    const { data: { user }, error: authErr } = await supabase.auth.getUser(access_token);
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    // 2. Verify caller is admin
    const { data: callerProfile, error: profileErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileErr || callerProfile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }

    // 3. Guard: only pending (unapproved) photographer applications may be rejected.
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", photographer_id)
      .maybeSingle();
    const { data: targetPhotographer } = await supabase
      .from("photographer_profiles")
      .select("id, is_approved")
      .eq("id", photographer_id)
      .maybeSingle();

    if (
      targetProfile?.role !== "photographer" ||
      !targetPhotographer ||
      targetPhotographer.is_approved !== false
    ) {
      return NextResponse.json(
        { error: "Can only reject pending photographer applications." },
        { status: 400 }
      );
    }

    // 4. Delete target photographer from auth.users (cascades to public tables)
    const { error: deleteErr } = await supabase.auth.admin.deleteUser(photographer_id);
    if (deleteErr) {
      throw deleteErr;
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[api/admin/reject] Error:", err.message || err);
    return NextResponse.json(
      { error: err.message || "Failed to reject photographer application." },
      { status: 500 }
    );
  }
}
