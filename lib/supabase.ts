import { createClient } from "@supabase/supabase-js";
import type { Project } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * A read-only Supabase client used in Server Components.
 * The anon key is public by design; access is constrained by RLS policies
 * (see supabase/schema.sql) which only permit SELECT on the projects table.
 */
export function getSupabase() {
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.local.example to .env.local."
    );
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function fetchProjects(): Promise<Project[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, title, category, subcategory, type, media, description, created_at, updated_at"
    )
    .order("category", { ascending: true })
    .order("subcategory", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Supabase query failed: ${error.message}`);
  }
  return (data ?? []) as Project[];
}
