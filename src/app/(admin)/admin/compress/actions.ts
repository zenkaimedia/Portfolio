"use server";

import { isAuthed } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { MEDIA_BUCKET as BUCKET } from "@/lib/constants";

/** Extract the storage path from a Supabase public URL. */
export function storagePathFromUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(url.slice(i + marker.length));
}

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
