"use server";

import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { AdminTask, TaskStatus } from "@/types/adminTask";

async function authedUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized.");
  return user;
}

export async function fetchTasksAction(): Promise<AdminTask[]> {
  const user = await authedUser();
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("tasks")
    .select("*, assignee:admin_users!tasks_assigned_to_fkey(id, name, email)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  // Non-admins see only tasks assigned to them or created by them
  if (user.role !== "admin") {
    query = query.or(`assigned_to.eq.${user.id},user_id.eq.${user.id}`);
  }

  const { data } = await query;
  return (data ?? []) as AdminTask[];
}

export async function createTaskAction(input: {
  title: string;
  description: string;
  priority: string;
  category: string;
  status: string;
  assigned_to: string;
  due_date: string;
  progress: number;
}): Promise<{ ok: true; task: AdminTask } | { error: string }> {
  const user = await authedUser();
  const supabase = getSupabaseAdmin();
  const { data: last } = await supabase.from("tasks").select("sort_order")
    .order("sort_order", { ascending: false }).limit(1).single();

  // Users always assign to themselves; admins can assign to anyone
  const assignedTo = user.role === "admin" ? (input.assigned_to || user.id) : user.id;

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: user.id,
      title: input.title.trim(),
      description: input.description.trim() || null,
      priority: input.priority,
      category: "general",        // fixed default
      status: "todo",             // always start in To Do
      assigned_to: assignedTo,
      due_date: input.due_date || null,
      progress: 0,
      sort_order: ((last?.sort_order as number) ?? -1) + 1,
    })
    .select("*, assignee:admin_users!tasks_assigned_to_fkey(id, name, email)")
    .single();

  if (error) return { error: error.message };
  return { ok: true, task: data as AdminTask };
}

export async function updateTaskAction(input: {
  id: string;
  title: string;
  description: string;
  priority: string;
  category: string;
  status: string;
  assigned_to: string;
  due_date: string;
  progress: number;
}): Promise<{ ok: true } | { error: string }> {
  const user = await authedUser();
  if (user.role !== "admin") return { error: "Only admins can edit tasks." };

  const { error } = await getSupabaseAdmin()
    .from("tasks")
    .update({
      title: input.title.trim(),
      description: input.description.trim() || null,
      priority: input.priority,
      category: input.category,
      status: input.status,
      assigned_to: input.assigned_to || null,
      due_date: input.due_date || null,
      progress: input.progress,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (error) return { error: error.message };
  return { ok: true };
}

export async function updateTaskStatusAction(
  id: string, status: TaskStatus
): Promise<{ ok: true } | { error: string }> {
  await authedUser();
  const { error } = await getSupabaseAdmin()
    .from("tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteTaskAction(id: string): Promise<{ ok: true } | { error: string }> {
  const user = await authedUser();
  if (user.role !== "admin") return { error: "Only admins can delete tasks." };
  const { error } = await getSupabaseAdmin().from("tasks").delete().eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}
