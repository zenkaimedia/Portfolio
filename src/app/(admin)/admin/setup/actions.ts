"use server";

import { hashPassword } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function createFirstAdminAction(
  name: string,
  email: string,
  password: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = getSupabaseAdmin();

  // Only allow if no users exist
  const { count } = await supabase
    .from("admin_users")
    .select("*", { count: "exact", head: true });
  if ((count ?? 0) > 0) {
    return { error: "Setup already complete. Use the login page." };
  }

  const id = crypto.randomUUID();
  const { error } = await supabase.from("admin_users").insert({
    id,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password_hash: hashPassword(password, id),
    role: "admin",
    is_active: true,
    is_super_admin: true,  // first admin is always super admin
    permissions: [],
  });

  if (error) return { error: error.message };
  return { ok: true };
}
