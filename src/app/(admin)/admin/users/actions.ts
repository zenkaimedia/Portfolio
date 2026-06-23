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
  permissions: string[];
  created_at: string;
  last_login_at: string | null;
};

export async function fetchUsersAction(): Promise<AdminUserRow[]> {
  if (!(await isAdmin())) return [];
  const { data } = await getSupabaseAdmin()
    .from("admin_users")
    .select("id, name, email, role, is_active, permissions, created_at, last_login_at")
    .order("created_at", { ascending: true });
  return (data ?? []) as AdminUserRow[];
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

  const me = await getCurrentUser();
  await supabase.from("activity_log").insert({
    user_id: me?.id ?? null,
    user_name: me?.name ?? "Admin",
    user_email: me?.email ?? null,
    action: "user_created",
    details: { created_user: email, role },
  });

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
  const { error } = await getSupabaseAdmin()
    .from("admin_users").update({ is_active }).eq("id", id);
  if (error) return { error: error.message };

  await getSupabaseAdmin().from("activity_log").insert({
    user_id: me?.id ?? null,
    user_name: me?.name ?? "Admin",
    action: is_active ? "user_activated" : "user_deactivated",
    details: { target_user_id: id },
  });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function deleteUserAction(
  id: string
): Promise<{ ok: true } | { error: string }> {
  if (!(await isAdmin())) return { error: "Unauthorized." };
  const me = await getCurrentUser();
  if (me?.id === id) return { error: "You cannot delete your own account." };
  const { error } = await getSupabaseAdmin().from("admin_users").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}
