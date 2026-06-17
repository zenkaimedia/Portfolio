import { createClient } from "@supabase/supabase-js";

/**
 * SERVER-ONLY Supabase client using the service_role key.
 * This key bypasses RLS — it must NEVER be imported into a Client Component
 * or exposed with a NEXT_PUBLIC_ prefix. Used only inside server actions.
 */
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (server env)."
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
