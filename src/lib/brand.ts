/**
 * ───────────────────────────────────────────────────────────────
 *  SPHOT — Central Brand Configuration
 * ───────────────────────────────────────────────────────────────
 *  SINGLE SOURCE OF TRUTH for brand identity. Change values here and
 *  they propagate across the whole app.
 *
 *  • Colors  → also defined as CSS variables in src/app/globals.css
 *              and consumed by Tailwind via tailwind.config.ts.
 *              To recolor the brand, update BOTH this file (for JS use)
 *              and the matching CSS vars in globals.css.
 *  • Font    → see FONT below + the single import in src/app/layout.tsx.
 *  • Strings → brand name, tagline, contact, socials used app-wide.
 * ───────────────────────────────────────────────────────────────
 */

export const BRAND = {
  /** Product / company name shown in nav, footer, metadata. */
  name: "SPHOT",
  /** Short tagline / value proposition. */
  tagline: "Find & Book Your Perfect Photographer in Seoul",
  /** Public site URL (also override via NEXT_PUBLIC_SITE_URL env). */
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://booksphot.com",

  /** Contact + support. */
  contactEmail: "hello@booksphot.com",
  supportEmail: "support@booksphot.com",

  /** Social links (empty string hides the link where rendered). */
  socials: {
    instagram: "https://instagram.com/booksphot",
    tiktok: "https://tiktok.com/@booksphot",
    // add more as needed: x, youtube, threads, ...
  },

  /** Headquarters (shown in email footer). */
  hq: "Seoul, South Korea",

  /** Public icon URLs for email footer (white glyphs on transparent). */
  emailIcons: {
    instagram: "https://jarhfsdjtosjpktypwcn.supabase.co/storage/v1/object/public/avatars/brand/instagram.png",
    tiktok: "https://jarhfsdjtosjpktypwcn.supabase.co/storage/v1/object/public/avatars/brand/tiktok.png",
  },

  /**
   * Absolute, always-public logo URL for transactional emails.
   * Hosted on Supabase Storage (served regardless of the web deploy/domain),
   * so email clients can always load it. Override via NEXT_PUBLIC_EMAIL_LOGO_URL.
   */
  emailLogoUrl:
    process.env.NEXT_PUBLIC_EMAIL_LOGO_URL ||
    "https://jarhfsdjtosjpktypwcn.supabase.co/storage/v1/object/public/avatars/brand/sphot-logo.png",

  /**
   * Brand colors. Keep in sync with the CSS variables in globals.css.
   * These JS values are for places that can't read CSS vars (e.g. canvas,
   * meta theme-color generation, charts).
   */
  colors: {
    accent: "#fffa6c", // cream / yellow
    lightBg: "#ffffff",
    lightFg: "#000000",
    darkBg: "#000000",
    darkFg: "#f4f4f5",
  },

  /** Reservation fee (KRW) — display default; server enforces its own. */
  reservationFeeKrw: 25000,

  /** Max portfolio images per photographer (per spec). */
  maxPortfolioImages: 10,
} as const;

/**
 * Active UI font. To swap the brand font:
 *   1. Change the import in src/app/layout.tsx (e.g. `Inter` → `Manrope`).
 *   2. Update FONT.name below for reference/docs.
 * The font is applied once at the <body> in layout.tsx; everything inherits it.
 */
export const FONT = {
  name: "Inter",
} as const;

export type Brand = typeof BRAND;
