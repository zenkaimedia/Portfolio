"use server";

import { isAuthed } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { MEDIA_BUCKET as BUCKET } from "@/lib/constants";

/** Get actual file sizes from Supabase Storage (accurate, not from HTTP headers). */
export async function getFileSizesAction(
  storagePaths: string[]
): Promise<Record<string, number>> {
  if (!(await isAuthed())) return {};
  if (!storagePaths.length) return {};

  const supabase = getSupabaseAdmin();
  const result: Record<string, number> = {};

  // Group paths by parent folder so we can batch list requests
  const byFolder = new Map<string, string[]>();
  for (const path of storagePaths) {
    const slash = path.lastIndexOf("/");
    const folder = slash >= 0 ? path.slice(0, slash) : "";
    if (!byFolder.has(folder)) byFolder.set(folder, []);
    byFolder.get(folder)!.push(path);
  }

  for (const [folder, paths] of byFolder) {
    const { data } = await supabase.storage
      .from(BUCKET)
      .list(folder || undefined, { limit: 1000 });
    if (!data) continue;

    for (const file of data) {
      const fullPath = folder ? `${folder}/${file.name}` : file.name;
      const size = (file.metadata as { size?: number } | null)?.size;
      if (paths.includes(fullPath) && size !== undefined) {
        result[fullPath] = size;
      }
    }
  }

  return result;
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
