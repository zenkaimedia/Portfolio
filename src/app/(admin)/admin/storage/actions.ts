"use server";

import { isAuthed } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { MEDIA_BUCKET as BUCKET } from "@/lib/constants";

/* ── Types ───────────────────────────────────────────────────────────────── */
export type StorageFileInfo = {
  path: string;
  size: number;
  mimetype: string;
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

type RawFile = { name: string; metadata: Record<string, unknown> | null; updated_at?: string };

async function listAllFiles(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  prefix = "",
  depth = 0
): Promise<StorageFileInfo[]> {
  if (depth > 6) return []; // safety limit
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(prefix || undefined, { limit: 1000, sortBy: { column: "name", order: "asc" } });

  if (error || !data) return [];

  const files: StorageFileInfo[] = [];
  for (const item of data as RawFile[]) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.metadata) {
      // It's a file
      files.push({
        path: fullPath,
        size: (item.metadata.size as number) ?? 0,
        mimetype: (item.metadata.mimetype as string) ?? "application/octet-stream",
      });
    } else {
      // It's a folder — recurse
      const sub = await listAllFiles(supabase, fullPath, depth + 1);
      files.push(...sub);
    }
  }
  return files;
}

/* ── Actions ─────────────────────────────────────────────────────────────── */
export async function getStorageStatsAction(): Promise<StorageStats | { error: string }> {
  if (!(await isAuthed())) return { error: "Unauthorized." };

  const supabase = getSupabaseAdmin();

  const [allFiles, projectsRes] = await Promise.all([
    listAllFiles(supabase),
    supabase.from("projects").select("media"),
  ]);

  // Build set of paths referenced by projects
  const referenced = new Set<string>();
  for (const p of (projectsRes.data ?? []) as { media: string }[]) {
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
