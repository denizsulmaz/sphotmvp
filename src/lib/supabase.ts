import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Initialize only if URL is present to avoid build errors in CI environments
export const supabase = supabaseUrl 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as any); // Use 'any' or a mock to satisfy types if necessary, but null is safer for runtime checks

