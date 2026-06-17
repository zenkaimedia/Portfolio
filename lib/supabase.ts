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

const BASE_COLUMNS =
  "id, title, category, subcategory, type, media, description, created_at, updated_at";

export async function fetchProjects(): Promise<Project[]> {
  const supabase = getSupabase();

  // Preferred query (includes sort_order for manual ordering).
  const withOrder = await supabase
    .from("projects")
    .select(`${BASE_COLUMNS}, sort_order`)
    .order("category", { ascending: true })
    .order("subcategory", { ascending: true, nullsFirst: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!withOrder.error) {
    return (withOrder.data ?? []) as Project[];
  }

  // Fallback for databases that haven't added the sort_order column yet —
  // keeps the site working before the migration is run.
  const basic = await supabase
    .from("projects")
    .select(BASE_COLUMNS)
    .order("category", { ascending: true })
    .order("subcategory", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });

  if (basic.error) {
    throw new Error(`Supabase query failed: ${basic.error.message}`);
  }
  return (basic.data ?? []).map((row) => ({
    ...(row as Omit<Project, "sort_order">),
    sort_order: 0,
  }));
}

/** Manual folder ordering: { "AI": 0, "AI/AI Commercials": 1, ... }.
 *  Returns {} gracefully if the folder_order table doesn't exist yet. */
export async function fetchFolderOrder(): Promise<Record<string, number>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("folder_order")
      .select("path, position");
    if (error || !data) return {};
    const out: Record<string, number> = {};
    for (const row of data as { path: string; position: number }[]) {
      out[row.path] = row.position;
    }
    return out;
  } catch {
    return {};
  }
}
