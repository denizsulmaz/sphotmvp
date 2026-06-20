import type { MetadataRoute } from "next";
import { getServerSupabase } from "@/lib/supabaseServer";
import { BLOG_POSTS } from "@/data/blog";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://booksphot.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ["", "/about", "/contact", "/blog", "/privacy", "/terms"].map((p) => ({
    url: `${siteUrl}${p}`,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.6,
  }));

  // Approved photographer profiles.
  let photographerRoutes: MetadataRoute.Sitemap = [];
  try {
    const supabase = getServerSupabase();
    const { data } = await supabase
      .from("photographer_profiles")
      .select("id")
      .eq("is_approved", true);
    photographerRoutes = (data || []).map((row) => ({
      url: `${siteUrl}/p/${row.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // DB unreachable at build — skip dynamic entries.
  }

  // Blog posts.
  const blogRoutes: MetadataRoute.Sitemap = (BLOG_POSTS || []).map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...photographerRoutes, ...blogRoutes];
}
