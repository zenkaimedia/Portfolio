"use server";

import { isAuthed } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { MEDIA_BUCKET as BUCKET } from "@/lib/constants";

/** Create a signed upload URL for overwriting an existing storage file. */
export async function getOverwriteUploadUrlAction(
  storagePath: string
): Promise<{ token: string; path: string } | { error: string }> {
  if (!(await isAuthed())) return { error: "Unauthorized." };
  const { data, error } = await getSupabaseAdmin()
    .storage
    .from(BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: true });
  if (error) return { error: error.message };
  return { token: data.token, path: data.path };
}
