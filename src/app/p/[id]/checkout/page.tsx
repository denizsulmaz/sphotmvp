import { Suspense } from "react";
import CheckoutClient from "./CheckoutClient";
import photographersData from "@/data/photographers.json";
import { getServerSupabase } from "@/lib/supabaseServer";

export async function generateStaticParams() {
  const params: { id: string }[] = photographersData.map((p) => ({ id: p.ID }));
  try {
    const supabase = getServerSupabase();
    const { data } = await supabase
      .from("photographer_profiles")
      .select("id")
      .eq("is_approved", true);
    for (const row of data || []) params.push({ id: row.id });
  } catch {
    // DB unreachable at build — fall back to static IDs only.
  }
  return params;
}

export default function CheckoutPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CheckoutClient id={params.id} />
    </Suspense>
  );
}
