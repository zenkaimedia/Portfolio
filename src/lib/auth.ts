import { cookies } from "next/headers";
import crypto from "crypto";
import { getSupabaseAdmin } from "./supabase/admin";

export const SESSION_COOKIE = "zk_session";
export const ADMIN_COOKIE = SESSION_COOKIE; // backward compat alias

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  permissions: string[];
  is_active: boolean;
};

export { PERMISSIONS, type Permission } from "./permissions";

/* ── Password hashing ────────────────────────────────────────────────────── */
export function hashPassword(password: string, userId: string): string {
  const secret = process.env.ADMIN_PASSWORD ?? "zenkai-media";
  return crypto
    .createHmac("sha512", secret)
    .update(`${password}::${userId}`)
    .digest("hex");
}

/* ── Session token ───────────────────────────────────────────────────────── */
function signSession(userId: string): string {
  const secret = process.env.ADMIN_PASSWORD ?? "zenkai-media";
  return crypto.createHmac("sha256", secret).update(userId).digest("hex");
}

export function createSessionToken(userId: string): string {
  return `${userId}:${signSession(userId)}`;
}

function parseSessionToken(token: string): string | null {
  const sep = token.lastIndexOf(":");
  if (sep === -1) return null;
  const userId = token.slice(0, sep);
  const sig = token.slice(sep + 1);
  if (!userId || sig !== signSession(userId)) return null;
  return userId;
}

/* ── Session helpers ─────────────────────────────────────────────────────── */
export async function getCurrentUser(): Promise<AdminUser | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const userId = parseSessionToken(token);
    if (!userId) return null;
    const { data } = await getSupabaseAdmin()
      .from("admin_users")
      .select("id, name, email, role, permissions, is_active")
      .eq("id", userId)
      .eq("is_active", true)
      .single();
    return (data as AdminUser) ?? null;
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

/** Kept for backward compat — no longer used internally. */
export function adminToken(): string { return ""; }
