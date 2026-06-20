import type { Metadata } from "next";
import ProfilePageClient from "./ProfilePageClient";
import photographersData from "@/data/photographers.json";
import { getServerSupabase } from "@/lib/supabaseServer";

// Pre-render approved DB photographers (UUIDs) + legacy static IDs at build time.
// dynamicParams stays true (default) so newly-approved photographers resolve via SSR.
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
    const { data } = await supabase
      .from("photographer_profiles")
      .select("categories, public_code, profiles:id(full_name, avatar_url)")
      .eq("id", params.id)
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
