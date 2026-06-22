"use server";

import { isAuthed } from "@/lib/auth";
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

/** Query storage.objects via PostgREST Accept-Profile header — same source as Supabase dashboard. */
async function fetchAllStorageObjects(): Promise<StorageFileInfo[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");

  const PAGE = 1000;
  let offset = 0;
  const all: StorageFileInfo[] = [];

  while (true) {
    // PostgREST supports switching to non-public schemas via Accept-Profile header
    const res = await fetch(
      `${supabaseUrl}/rest/v1/objects?bucket_id=eq.${BUCKET}&metadata=not.is.null&select=name,metadata,updated_at&limit=${PAGE}&offset=${offset}`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Accept-Profile": "storage", // query the storage schema
        },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Storage query failed: ${res.status} ${text}`);
    }

    const data = (await res.json()) as {
      name: string;
      metadata: { size?: number; mimetype?: string } | null;
      updated_at: string;
    }[];

    if (!data.length) break;

    for (const obj of data) {
      if (obj.metadata) {
        all.push({
          path: obj.name,
          size: obj.metadata.size ?? 0,
          mimetype: obj.metadata.mimetype ?? "application/octet-stream",
          lastModified: obj.updated_at ?? "",
        });
      }
    }

    if (data.length < PAGE) break;
    offset += PAGE;
  }

  return all;
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
