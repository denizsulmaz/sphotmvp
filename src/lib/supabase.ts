import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Browser-safe Supabase client (uses anon/public key).
 * Used in all client-side components and contexts.
 * Returns null if environment variables are not configured (CI/build).
 */
export const supabase: SupabaseClient | null = supabaseUrl
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Type guard to check if Supabase client is initialized.
 * Use this instead of `if (!supabase)` for proper narrowing.
 */
export function isSupabaseReady(
  client: SupabaseClient | null
): client is SupabaseClient {
  return client !== null;
}
