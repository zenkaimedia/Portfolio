"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, hashPassword, createSessionToken, isAuthed, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { MEDIA_BUCKET as BUCKET } from "@/lib/constants";

/* ── Ensure at least one admin exists (first-run bootstrap) ──────────────── */
async function ensureDefaultAdmin() {
  const supabase = getSupabaseAdmin();
  const { count } = await supabase
    .from("admin_users")
    .select("*", { count: "exact", head: true });
  if ((count ?? 0) > 0) return;

  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return;

  const DEFAULT_ID = "00000000-0000-0000-0000-000000000001";
  await supabase.from("admin_users").upsert({
    id: DEFAULT_ID,
    name: "Admin",
    email: "admin@zenkai.in",
    password_hash: hashPassword(pw, DEFAULT_ID),
    role: "admin",
    is_active: true,
  });
}

export async function loginAction(
  _prev: string | null,
  formData: FormData
): Promise<string | null> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return "Email and password are required.";

  await ensureDefaultAdmin();

  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from("admin_users")
    .select("id, name, email, role, is_active, password_hash, permissions")
    .eq("email", email)
    .single();

  if (!user) return "Invalid email or password.";
  if (!user.is_active) return "Your account has been deactivated. Contact the admin.";

  const hash = hashPassword(password, user.id);
  if (hash !== user.password_hash) return "Invalid email or password.";

  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  // Log activity
  await supabase.from("activity_log").insert({
    user_id: user.id,
    user_name: user.name,
    user_email: user.email,
    action: "login",
    details: { role: user.role },
  });

  // Update last_login_at
  await supabase.from("admin_users").update({ last_login_at: new Date().toISOString() }).eq("id", user.id);

  redirect(getFirstPage(user.role, user.permissions as string[]));
}

function getFirstPage(role: string, permissions: string[]): string {
  if (role === "admin") return "/admin";
  // Walk pages in sidebar order and return first one permitted
  const order: [string, string][] = [
    [PERMISSIONS.PROJECTS,    "/admin"],
    [PERMISSIONS.SHARE,       "/admin/share"],
    [PERMISSIONS.MESSAGES,    "/admin/messages"],
    [PERMISSIONS.COMPRESS,    "/admin/compress"],
    [PERMISSIONS.STORAGE,     "/admin/storage"],
    [PERMISSIONS.BRAND_STORY, "/admin/brand-story"],
  ];
  for (const [perm, page] of order) {
    if (permissions.includes(perm)) return page;
  }
  return "/admin/settings"; // fallback — always accessible
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) {
    await getSupabaseAdmin().from("activity_log").insert({
      user_id: user.id,
      user_name: user.name,
      user_email: user.email,
      action: "logout",
      details: {},
    });
  }
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/admin/login");
}

/** Check whether a category already has a PDF — call this BEFORE uploading. */
export async function checkPdfExistsAction(
  category: string
): Promise<{ exists: boolean } | { error: string }> {
  if (!(await isAuthed())) return { error: "Unauthorized." };
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("projects")
    .select("id")
    .eq("category", category)
    .eq("type", "pdf");
  return { exists: !!(data && data.length > 0) };
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
  if (!["image", "video", "website", "pdf", "redirect"].includes(type)) {
    return { error: "Type must be image, video, website, pdf or redirect." };
  }

  const supabase = getSupabaseAdmin();

  // Only one PDF allowed per category
  if (type === "pdf") {
    const { data: existing } = await supabase
      .from("projects")
      .select("id")
      .eq("category", category)
      .eq("type", "pdf");
    if (existing && existing.length > 0) {
      return { error: `"${category}" already has a PDF. Only one PDF is allowed per category.` };
    }
  }

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

async function removeFiles(medias: string[], excludeIds: string[] = []) {
  const supabase = getSupabaseAdmin();

  // Only delete a storage file when NO other project still references it.
  // This prevents deleting originals when a copy sharing the same URL is removed.
  let query = supabase.from("projects").select("media").in("media", medias);
  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }
  const { data: stillReferenced } = await query;
  const referenced = new Set((stillReferenced ?? []).map((r: { media: string }) => r.media));

  const safePaths = medias
    .filter((m) => !referenced.has(m))
    .map(storagePathFromUrl)
    .filter((p): p is string => !!p);

  if (safePaths.length > 0) {
    await getSupabaseAdmin().storage.from(BUCKET).remove(safePaths);
  }
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

/** Move items to a different category (bulk update). */
export async function moveItemsAction(
  ids: string[],
  targetCategory: string
): Promise<{ ok: true } | { error: string }> {
  if (!(await isAuthed())) return { error: "Unauthorized." };
  if (!ids.length) return { ok: true };
  const { error } = await getSupabaseAdmin()
    .from("projects")
    .update({ category: targetCategory, subcategory: null })
    .in("id", ids);
  if (error) return { error: error.message };
  return { ok: true };
}

/** Copy items to a different category (insert duplicate rows). Returns inserted rows. */
export async function copyItemsAction(
  ids: string[],
  targetCategory: string
): Promise<{ ok: true; count: number; items: import("@/lib/types").Project[] } | { error: string }> {
  if (!(await isAuthed())) return { error: "Unauthorized." };
  if (!ids.length) return { ok: true, count: 0, items: [] };
  const supabase = getSupabaseAdmin();
  const { data: src, error: fetchErr } = await supabase
    .from("projects")
    .select("id, title, type, media, description, parent_id")
    .in("id", ids);
  if (fetchErr) return { error: fetchErr.message };
  const copies = (src ?? []).map((p) => ({
    title: p.title,
    category: targetCategory,
    subcategory: null,
    type: p.type,
    media: p.media,
    description: p.description,
    // Track lineage: if the source is already a copy, point to its parent; otherwise point to the source itself
    parent_id: p.parent_id ?? p.id,
  }));
  const { data, error } = await supabase.from("projects").insert(copies).select();
  if (error) return { error: error.message };
  return { ok: true, count: copies.length, items: (data ?? []) as import("@/lib/types").Project[] };
}

/** Delete multiple projects at once (rows + their stored files). */
export async function bulkDeleteProjectsAction(
  items: { id: string; media: string }[]
): Promise<{ ok: true; deleted: number } | { error: string }> {
  if (!(await isAuthed())) return { error: "Unauthorized." };
  if (!items.length) return { ok: true, deleted: 0 };
  const ids = items.map((i) => i.id);
  await removeFiles(items.map((i) => i.media), ids);
  const { error } = await getSupabaseAdmin()
    .from("projects")
    .delete()
    .in("id", ids);
  if (error) return { error: error.message };
  return { ok: true, deleted: ids.length };
}

/** Delete one project (row + its stored file). */
export async function deleteProjectAction(
  id: string,
  media: string
): Promise<{ ok: true } | { error: string }> {
  if (!(await isAuthed())) return { error: "Unauthorized." };
  if (!id) return { error: "Missing id." };
  await removeFiles([media], [id]);
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
  await removeFiles(rows.map((r) => r.media), rows.map((r) => r.id));

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
