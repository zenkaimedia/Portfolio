"use client";

import { createClient } from "@supabase/supabase-js";

/** Browser (anon) client — used only to upload files to a server-issued
 *  signed upload URL. The anon key is safe to expose. */
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  { auth: { persistSession: false } }
);

export { MEDIA_BUCKET } from "../constants";
