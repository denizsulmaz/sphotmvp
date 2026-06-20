/**
 * Shared type definitions for the SPHOT platform.
 * These types correspond to the Supabase database schema and
 * the legacy static photographer data format.
 */

// ── Legacy static data format (photographers.json) ──────────────

export interface Photographer {
  ID: string;
  Name: string;
  "Delivery Time": string;
  "Global Categories": string;
  Instagram: string;
  "URL Instagram": string;
  Languages: string;
  "English Level": string;
  "Other (Languages)": string;
  "Location Types": string;
  "Min Price KRW(per hour & starting from)": string;
  "Response Speed": string;
  Style: string;
  "Style (Other)": string;
  IsStudio?: boolean;
  hidden?: boolean;
  /** DB-backed portfolio image URLs for Supabase photographers (UUID IDs). */
  portfolioUrls?: string[];
  /** DB-backed avatar URL for Supabase photographers (UUID IDs). */
  avatarUrl?: string;
  /** Public human-readable photographer code, e.g. "S01019". */
  publicCode?: string;
}

// ── Supabase row types ──────────────────────────────────────────

/** profiles table row */
export interface DBProfile {
  id: string;
  role: "admin" | "photographer" | "client";
  full_name: string;
  avatar_url: string;
  created_at: string;
}

/** photographer_profiles table row */
export interface DBPhotographerProfile {
  id: string;
  bio: string | null;
  base_price: number;
  locations: string[];
  categories: string[];
  portfolio_urls: string[];
  instagram: string | null;
  instagram_url: string | null;
  languages: string[];
  english_level: string | null;
  styles: string[] | null;
  delivery_time: string | null;
  response_speed: string | null;
  is_approved: boolean;
  profiles?: {
    full_name: string;
    avatar_url: string;
  } | null;
}

/** availability_slots table row */
export interface DBAvailabilitySlot {
  id: string;
  photographer_id: string;
  start_time: string;
  end_time: string;
  status: "available" | "booked";
}

export type BookingStatus = "pending" | "paid" | "completed" | "cancelled";

/** bookings table row */
export interface DBBooking {
  id: string;
  status: BookingStatus;
  fee_krw: number;
  created_at: string;
  client_id: string;
  photographer_id: string;
  slot_id: string | null;
  checkout_id: string | null;
}

/** messages table row */
export interface DBMessage {
  id: string;
  booking_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

/** photographer_views table row */
export interface DBPhotographerView {
  photographer_id: string;
  count: number;
}

// ── Constants ───────────────────────────────────────────────────

export const CATEGORIES = [
  "Hanbok",
  "Family",
  "Couple",
  "Individual",
  "Wedding",
  "Editorial",
  "Lifestyle",
  "Event",
  "Business",
  "Branding",
  "Sports",
] as const;

export type Category = (typeof CATEGORIES)[number];
