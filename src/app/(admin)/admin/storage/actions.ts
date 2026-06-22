"use server";

import { isAuthed } from "@/lib/auth";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { MEDIA_BUCKET as BUCKET } from "@/lib/constants";

/* ── Types ───────────────────────────────────────────────────────────────── */
export type StorageFileInfo = {
  path: string;
  size: number;
  mimetype: string;
  lastModified: string;
};

export type StorageStats = {
  totalFiles: number;
  totalSize: number;
  breakdown: {
    image: { size: number; count: number };
    video: { size: number; count: number };
    pdf:   { size: number; count: number };
    other: { size: number; count: number };
  };
  orphaned: StorageFileInfo[];
  orphanedSize: number;
  largest: StorageFileInfo[];
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function storagePathFromUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(url.slice(i + marker.length));
}

/** Recursively list all files in the bucket using the Storage API with pagination. */
async function fetchAllStorageObjects(): Promise<StorageFileInfo[]> {
  const supabase = getSupabaseAdmin();
  const all: StorageFileInfo[] = [];
  await listFolder(supabase, "", all);
  return all;
}

async function listFolder(
  supabase: SupabaseClient,
  prefix: string,
  out: StorageFileInfo[],
  depth = 0
) {
  if (depth > 8) return;
  const PAGE = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix || undefined, {
        limit: PAGE,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

    if (error || !data || data.length === 0) break;

    for (const item of data) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      const meta = item.metadata as { size?: number; mimetype?: string } | null;

      if (meta) {
        // It's a file — metadata is populated
        out.push({
          path: fullPath,
          size: meta.size ?? 0,
          mimetype: meta.mimetype ?? "application/octet-stream",
          lastModified: (item as { updated_at?: string }).updated_at ?? "",
        });
      } else {
        // It's a folder — recurse
        await listFolder(supabase, fullPath, out, depth + 1);
      }
    }

    if (data.length < PAGE) break;
    offset += PAGE;
  }
}

/* ── Actions ─────────────────────────────────────────────────────────────── */
export async function getStorageStatsAction(): Promise<StorageStats | { error: string }> {
  if (!(await isAuthed())) return { error: "Unauthorized." };

  let allFiles: StorageFileInfo[];
  try {
    allFiles = await fetchAllStorageObjects();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to read storage." };
  }

  // Cross-reference with projects to find orphans
  const { data: projects } = await getSupabaseAdmin()
    .from("projects")
    .select("media");

  const referenced = new Set<string>();
  for (const p of (projects ?? []) as { media: string }[]) {
    const path = storagePathFromUrl(p.media);
    if (path) referenced.add(path);
  }

  const totalSize = allFiles.reduce((s, f) => s + f.size, 0);

  const breakdown = {
    image: { size: 0, count: 0 },
    video: { size: 0, count: 0 },
    pdf:   { size: 0, count: 0 },
    other: { size: 0, count: 0 },
  };
  for (const f of allFiles) {
    const k = f.mimetype.startsWith("image/") ? "image"
      : f.mimetype.startsWith("video/") ? "video"
      : f.mimetype === "application/pdf" ? "pdf"
      : "other";
    breakdown[k].size += f.size;
    breakdown[k].count++;
  }

  const orphaned = allFiles.filter((f) => !referenced.has(f.path));
  const orphanedSize = orphaned.reduce((s, f) => s + f.size, 0);
  const largest = [...allFiles].sort((a, b) => b.size - a.size).slice(0, 15);

  return {
    totalFiles: allFiles.length,
    totalSize,
    breakdown,
    orphaned,
    orphanedSize,
    largest,
  };
}

export async function deleteFilesAction(
  paths: string[]
): Promise<{ ok: true; deleted: number } | { error: string }> {
  if (!(await isAuthed())) return { error: "Unauthorized." };
  if (!paths.length) return { ok: true, deleted: 0 };
  const { error } = await getSupabaseAdmin().storage.from(BUCKET).remove(paths);
  if (error) return { error: error.message };
  return { ok: true, deleted: paths.length };
}
