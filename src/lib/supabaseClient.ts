import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

/**
 * Lazily create a browser Supabase client. Avoids throwing during
 * server-side import when public env vars aren’t loaded yet.
 */
export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Throw only when actually attempting to use the client.
    // This protects server rendering/imports while still surfacing a clear
    // message in the browser if the env vars are missing.
    throw new Error(
      "Missing Supabase env vars: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: true, storageKey: "ps-auth-v1" },
  });
  return cachedClient;
}

export const STORAGE_BUCKET = "public";
