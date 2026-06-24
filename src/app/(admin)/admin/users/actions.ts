"use server";

import { revalidatePath } from "next/cache";
import { isAdmin, hashPassword, getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  is_active: boolean;
  is_super_admin: boolean;
  permissions: string[];
  created_at: string;
  last_login_at: string | null;
};

/** Transfer super-admin rights to another admin user. */
export async function transferSuperAdminAction(
  targetId: string
): Promise<{ ok: true } | { error: string }> {
  const me = await getCurrentUser();
  if (!me?.is_super_admin) return { error: "Only the main admin can transfer admin rights." };
  if (me.id === targetId) return { error: "You are already the main admin." };

  const supabase = getSupabaseAdmin();
  // Target must be an active admin
  const { data: target } = await supabase.from("admin_users").select("role, is_active").eq("id", targetId).single();
  if (!target?.is_active) return { error: "Target user must be active." };
  if (target.role !== "admin") return { error: "You can only transfer admin rights to an existing admin." };

  // Transfer: give target super-admin, remove from self
  await supabase.from("admin_users").update({ is_super_admin: true }).eq("id", targetId);
  await supabase.from("admin_users").update({ is_super_admin: false }).eq("id", me.id);
  revalidatePath("/admin/users");
  return { ok: true };
}

/** Lightweight name lookup — available to all authenticated users for task attribution. */
export async function fetchUserNamesAction(): Promise<{ id: string; name: string; role: string }[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const { data } = await getSupabaseAdmin()
    .from("admin_users")
    .select("id, name, role")
    .eq("is_active", true);
  return (data ?? []) as { id: string; name: string; role: string }[];
}

export async function fetchUsersAction(): Promise<AdminUserRow[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  if (user.role !== "admin" && !user.permissions.includes("task_assign")) return [];
  const supabase = getSupabaseAdmin();

  // Try with is_super_admin; fall back if column doesn't exist yet
  const { data: withSA } = await supabase
    .from("admin_users")
    .select("id, name, email, role, is_active, is_super_admin, permissions, created_at, last_login_at")
    .order("created_at", { ascending: true });

  if (withSA && withSA.length >= 0) return withSA as AdminUserRow[];

  // Fallback without is_super_admin
  const { data } = await supabase
    .from("admin_users")
    .select("id, name, email, role, is_active, permissions, created_at, last_login_at")
    .order("created_at", { ascending: true });

  return ((data ?? []) as Omit<AdminUserRow, "is_super_admin">[]).map(u => ({ ...u, is_super_admin: false }));
}

export async function createUserAction(input: {
  name: string;
  email: string;
  password: string;
  role: "admin" | "user";
  permissions: string[];
}): Promise<{ ok: true; user: AdminUserRow } | { error: string }> {
  if (!(await isAdmin())) return { error: "Unauthorized." };
  const { name, email, password, role, permissions } = input;
  if (!name.trim() || !email.trim() || !password) return { error: "All fields are required." };

  const supabase = getSupabaseAdmin();
  // Generate id first so we can hash with it
  const id = crypto.randomUUID();
  const { data, error } = await supabase
    .from("admin_users")
    .insert({
      id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password_hash: hashPassword(password, id),
      role,
      permissions,
      is_active: true,
    })
    .select()
    .single();

  if (error) return { error: error.code === "23505" ? "Email already exists." : error.message };

  revalidatePath("/admin/users");
  return { ok: true, user: data as AdminUserRow };
}

export async function updateUserAction(input: {
  id: string;
  name: string;
  role: "admin" | "user";
  permissions: string[];
  is_active: boolean;
  newPassword?: string;
}): Promise<{ ok: true } | { error: string }> {
  if (!(await isAdmin())) return { error: "Unauthorized." };
  const supabase = getSupabaseAdmin();
  const update: Record<string, unknown> = {
    name: input.name.trim(),
    role: input.role,
    permissions: input.permissions,
    is_active: input.is_active,
  };
  if (input.newPassword) {
    update.password_hash = hashPassword(input.newPassword, input.id);
  }
  const { error } = await supabase.from("admin_users").update(update).eq("id", input.id);
  if (error) return { error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function toggleUserActiveAction(
  id: string, is_active: boolean
): Promise<{ ok: true } | { error: string }> {
  if (!(await isAdmin())) return { error: "Unauthorized." };
  const me = await getCurrentUser();
  if (me?.id === id) return { error: "You cannot deactivate your own account." };
  // Super admin cannot be deactivated by another admin
  const { data: target } = await getSupabaseAdmin().from("admin_users").select("is_super_admin").eq("id", id).single();
  if (target?.is_super_admin && !me?.is_super_admin) return { error: "The main admin account cannot be deactivated." };
  const { error } = await getSupabaseAdmin()
    .from("admin_users").update({ is_active }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function deleteUserAction(
  id: string
): Promise<{ ok: true } | { error: string }> {
  if (!(await isAdmin())) return { error: "Unauthorized." };
  const me = await getCurrentUser();
  if (me?.id === id) return { error: "You cannot delete your own account." };
  // Super admin cannot be deleted by another admin
  const { data: target } = await getSupabaseAdmin().from("admin_users").select("is_super_admin").eq("id", id).single();
  if (target?.is_super_admin && !me?.is_super_admin) return { error: "The main admin account cannot be removed." };
  const { error } = await getSupabaseAdmin().from("admin_users").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}
