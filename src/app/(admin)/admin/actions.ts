"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminToken, isAuthed } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { MEDIA_BUCKET as BUCKET } from "@/lib/constants";

/** Login form action — used with useActionState. Returns an error string or
 *  redirects on success. */
export async function loginAction(
  _prev: string | null,
  formData: FormData
): Promise<string | null> {
  const pw = String(formData.get("password") ?? "");
  if (!process.env.ADMIN_PASSWORD) {
    return "Server not configured: ADMIN_PASSWORD is missing.";
  }
  if (pw !== process.env.ADMIN_PASSWORD) {
    return "Incorrect password.";
  }
  const store = await cookies();
  store.set(ADMIN_COOKIE, adminToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
  redirect("/admin");
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

/** Create a one-time signed URL so the browser can upload a file directly to
 *  Storage (bypassing Vercel's request-body size limit). */
export async function createSignedUploadUrlAction(
  path: string
): Promise<{ token: string; path: string } | { error: string }> {
  if (!(await isAuthed())) return { error: "Unauthorized." };
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);
  if (error) return { error: error.message };
  return { token: data.token, path: data.path };
}

/** Insert a project row (after the file has been uploaded, or with an external
 *  URL for websites). */
export async function createProjectAction(input: {
  title: string;
  category: string;
  subcategory: string;
  type: string;
  media: string;
  description: string;
}): Promise<{ ok: true } | { error: string }> {
  if (!(await isAuthed())) return { error: "Unauthorized." };

  const title = input.title.trim();
  const category = input.category.trim();
  const type = input.type.trim();
  const media = input.media.trim();

  if (!title || !category || !type || !media) {
    return { error: "Title, category, type and media are required." };
  }
  if (!["image", "video", "website", "pdf"].includes(type)) {
    return { error: "Type must be image, video, website or pdf." };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("projects").insert({
    title,
    category,
    subcategory: input.subcategory.trim() || null,
    type,
    media,
    description: input.description.trim() || null,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

/* ── Management: edit / delete / folder ops ─────────────────────────────────── */

/** Extract the storage object path from a public media URL (or null if the URL
 *  doesn't point at our bucket, e.g. an external website link). */
function storagePathFromUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(url.slice(i + marker.length));
}

async function removeFiles(medias: string[]) {
  const paths = medias
    .map(storagePathFromUrl)
    .filter((p): p is string => !!p);
  if (paths.length === 0) return;
  await getSupabaseAdmin().storage.from(BUCKET).remove(paths);
}

/** Update a project's text fields (also moves it between folders when the
 *  category/subcategory change). */
export async function updateProjectAction(input: {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  description: string;
}): Promise<{ ok: true } | { error: string }> {
  if (!(await isAuthed())) return { error: "Unauthorized." };
  const title = input.title.trim();
  const category = input.category.trim();
  if (!input.id || !title || !category) {
    return { error: "Title and category are required." };
  }
  const { error } = await getSupabaseAdmin()
    .from("projects")
    .update({
      title,
      category,
      subcategory: input.subcategory.trim() || null,
      description: input.description.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);
  if (error) return { error: error.message };
  return { ok: true };
}

/** Delete one project (row + its stored file). */
export async function deleteProjectAction(
  id: string,
  media: string
): Promise<{ ok: true } | { error: string }> {
  if (!(await isAuthed())) return { error: "Unauthorized." };
  if (!id) return { error: "Missing id." };
  await removeFiles([media]);
  const { error } = await getSupabaseAdmin()
    .from("projects")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

/** Rename a whole folder (bulk-updates every project in it). Pass
 *  subcategory=null to rename a top-level category. */
export async function renameFolderAction(input: {
  category: string;
  subcategory: string | null;
  newName: string;
}): Promise<{ ok: true } | { error: string }> {
  if (!(await isAuthed())) return { error: "Unauthorized." };
  const newName = input.newName.trim();
  if (!newName) return { error: "New name is required." };

  const supabase = getSupabaseAdmin();
  if (input.subcategory === null) {
    const { error } = await supabase
      .from("projects")
      .update({ category: newName })
      .eq("category", input.category);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("projects")
      .update({ subcategory: newName })
      .eq("category", input.category)
      .eq("subcategory", input.subcategory);
    if (error) return { error: error.message };
  }
  return { ok: true };
}

/** Delete a whole folder: every project in it, plus their files. Pass
 *  subcategory=null to delete a top-level category and everything under it. */
export async function deleteFolderAction(input: {
  category: string;
  subcategory: string | null;
}): Promise<{ ok: true } | { error: string }> {
  if (!(await isAuthed())) return { error: "Unauthorized." };
  const supabase = getSupabaseAdmin();

  // subcategory === null  → delete the WHOLE category (incl. all subfolders)
  // subcategory provided   → delete just that subfolder
  let query = supabase
    .from("projects")
    .select("id, media")
    .eq("category", input.category);
  if (input.subcategory !== null) {
    query = query.eq("subcategory", input.subcategory);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };

  const rows = (data ?? []) as { id: string; media: string }[];
  await removeFiles(rows.map((r) => r.media));

  let del = supabase.from("projects").delete().eq("category", input.category);
  if (input.subcategory !== null) {
    del = del.eq("subcategory", input.subcategory);
  }

  const { error: delErr } = await del;
  if (delErr) return { error: delErr.message };
  return { ok: true };
}

/** Persist a new order for items within a folder: their sort_order becomes
 *  their index in the given array. */
export async function reorderItemsAction(
  orderedIds: string[]
): Promise<{ ok: true } | { error: string }> {
  if (!(await isAuthed())) return { error: "Unauthorized." };
  const supabase = getSupabaseAdmin();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("projects")
      .update({ sort_order: i })
      .eq("id", orderedIds[i]);
    if (error) return { error: error.message };
  }
  return { ok: true };
}

/** Persist a new order for sibling folders. Each path is the folder's full
 *  name ("AI" for a category, "AI/AI Commercials" for a subfolder). */
export async function reorderFoldersAction(
  orderedPaths: string[]
): Promise<{ ok: true } | { error: string }> {
  if (!(await isAuthed())) return { error: "Unauthorized." };
  const supabase = getSupabaseAdmin();
  for (let i = 0; i < orderedPaths.length; i++) {
    const { error } = await supabase
      .from("folder_order")
      .upsert({ path: orderedPaths[i], position: i }, { onConflict: "path" });
    if (error) return { error: error.message };
  }
  return { ok: true };
}
