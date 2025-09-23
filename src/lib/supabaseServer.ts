import "server-only";
import { createClient } from "@supabase/supabase-js";

// Prefer server-only URL; fall back to public URL for dev convenience
const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Missing Supabase server env vars (SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)"
  );
}

export function createServerSupabaseClient() {
  return createClient(supabaseUrl!, supabaseServiceRoleKey!, {
    auth: { persistSession: false },
  });
}
