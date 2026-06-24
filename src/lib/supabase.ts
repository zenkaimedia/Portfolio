import { createBrowserClient } from "@supabase/ssr";

// Public browser client for Supabase Auth (task manager)
export function createTaskSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export const taskSupabase = createTaskSupabaseClient();
