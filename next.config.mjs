/** @type {import('next').NextConfig} */

const nextConfig = {
  // Do NOT use output: "export" — it strips API routes (webhooks) and SSR
  images: {
    // Vercel image optimizer (WebP/AVIF + responsive sizes) for any next/image usage.
    // Local <img> tags are unaffected; their sources are already optimized .webp assets.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Supabase Storage public objects (photographer-uploaded portfolios/avatars).
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
