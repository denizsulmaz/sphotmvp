import type { Metadata } from "next";
import ProfilePageClient from "./ProfilePageClient";
import photographersData from "@/data/photographers.json";
import { getServerSupabase } from "@/lib/supabaseServer";

// Pre-render approved DB photographers (UUIDs) + legacy static IDs at build time.
// dynamicParams stays true (default) so newly-approved photographers resolve via SSR.
export async function generateStaticParams() {
  // Pre-render by public_code slug (e.g. /p/S01023). dynamicParams stays true so
  // codes/UUIDs not in this list still resolve via SSR.
  const seen = new Set<string>();
  const params: { id: string }[] = [];
  for (const p of photographersData) {
    if (!seen.has(p.ID)) { seen.add(p.ID); params.push({ id: p.ID }); }
  }
  try {
    const supabase = getServerSupabase();
    const { data } = await supabase
      .from("photographer_profiles")
      .select("id, public_code")
      .eq("is_approved", true);
    for (const row of data || []) {
      const slug = row.public_code || row.id;
      if (!seen.has(slug)) { seen.add(slug); params.push({ id: slug }); }
    }
  } catch {
    // DB unreachable at build — fall back to static IDs only.
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  let name = "Photographer";
  let categories = "";
  let avatar = "";
  try {
    const supabase = getServerSupabase();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);
    const col = isUuid ? "id" : "public_code";
    const { data } = await supabase
      .from("photographer_profiles")
      .select("categories, public_code, profiles:id(full_name, avatar_url)")
      .eq(col, params.id)
      .maybeSingle();
    if (data) {
      const prof = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
      name = prof?.full_name || name;
      avatar = prof?.avatar_url || "";
      categories = (data.categories || []).slice(0, 3).join(", ");
    }
  } catch {
    const local = photographersData.find((p) => p.ID === params.id);
    if (local) {
      name = local.Name;
      categories = local["Global Categories"];
      avatar = `/media/p/${params.id}/${params.id}.webp`;
    }
  }
  const title = `${name} — Seoul Photographer`;
  const description = categories
    ? `Book ${name}, a Seoul photographer specializing in ${categories}. View portfolio, availability, and reserve your shoot on SPHOT.`
    : `Book ${name} on SPHOT — view portfolio, availability, and reserve your shoot.`;
  return {
    title,
    description,
    alternates: { canonical: `/p/${params.id}` },
    openGraph: {
      title,
      description,
      type: "profile",
      images: avatar ? [{ url: avatar, alt: name }] : undefined,
    },
  };
}

export default function ProfilePage({ params }: { params: { id: string } }) {
  return <ProfilePageClient id={params.id} />;
}
