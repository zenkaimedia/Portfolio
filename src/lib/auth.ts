import { cookies } from "next/headers";
import crypto from "crypto";
import { getSupabaseAdmin } from "./supabase/admin";

export { PERMISSIONS, type Permission } from "./permissions";
import { PERMISSIONS } from "./permissions";

export const SESSION_COOKIE = "zk_session";
export const ADMIN_COOKIE = SESSION_COOKIE;

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  permissions: string[];
  is_active: boolean;
  is_super_admin: boolean;
};

/* ── Password hashing (no env var needed) ────────────────────────────────── */
export function hashPassword(password: string, userId: string): string {
  // userId acts as a unique salt per user — no server secret required
  return crypto
    .createHmac("sha512", userId)
    .update(password)
    .digest("hex");
}

/* ── Session token signed with the user's own password hash ─────────────── */
// This way: if the password changes, old sessions are automatically invalidated.
function signSession(userId: string, passwordHash: string): string {
  return crypto
    .createHmac("sha256", passwordHash)
    .update(userId)
    .digest("hex")
    .slice(0, 32);
}

export function createSessionToken(userId: string, passwordHash: string): string {
  return `${userId}:${signSession(userId, passwordHash)}`;
}

/* ── Get current user (verifies session against DB) ─────────────────────── */
export async function getCurrentUser(): Promise<AdminUser | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const sep = token.lastIndexOf(":");
    if (sep === -1) return null;
    const userId = token.slice(0, sep);
    const sig = token.slice(sep + 1);

    // Try with is_super_admin; fall back if column doesn't exist yet (migration not run)
    let row: Record<string, unknown> | null = null;

    const { data: d1 } = await getSupabaseAdmin()
      .from("admin_users")
      .select("id, name, email, role, permissions, is_active, is_super_admin, password_hash")
      .eq("id", userId).eq("is_active", true).single();

    if (d1) {
      row = d1 as Record<string, unknown>;
    } else {
      const { data: d2 } = await getSupabaseAdmin()
        .from("admin_users")
        .select("id, name, email, role, permissions, is_active, password_hash")
        .eq("id", userId).eq("is_active", true).single();
      if (d2) row = { ...(d2 as Record<string, unknown>), is_super_admin: false };
    }

    if (!row) return null;

    // Verify signature against current password hash
    const expected = signSession(userId, row.password_hash as string);
    if (sig !== expected) return null;

    const { password_hash: _ph, ...user } = row;
    return user as AdminUser;
  } catch {
    return null;
  }
}

export async function isAuthed(): Promise<boolean> {
  return !!(await getCurrentUser());
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "admin";
}

export async function hasPermission(permission: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.permissions.includes(permission);
}

/* ── First-page redirect helper ──────────────────────────────────────────── */
export function getFirstPage(role: string, permissions: string[]): string {
  if (role === "admin") return "/admin";
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
  return "/admin/settings";
}

/* ── requireAccess guard ─────────────────────────────────────────────────── */
export async function requireAccess(
  permission: string | "admin" | null = null
): Promise<AdminUser> {
  const { redirect } = await import("next/navigation");
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  const u = user!;

  const allowed =
    permission === null
      ? true
      : permission === "admin"
        ? u.role === "admin"
        : u.role === "admin" || u.permissions.includes(permission);

  if (!allowed) redirect(getFirstPage(u.role, u.permissions));
  return u;
}

/** Backward compat */
export function adminToken(): string { return ""; }
