"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type Priority = "urgent" | "high" | "medium" | "low";
export type Status   = "todo" | "in_progress" | "done";

export type Task = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: Status;
  due_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

async function authedUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized.");
  return user;
}

export async function fetchTasksAction(): Promise<Task[]> {
  const user = await authedUser();
  const { data } = await getSupabaseAdmin()
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("status", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  return (data ?? []) as Task[];
}

export async function createTaskAction(input: {
  title: string;
  description: string;
  priority: Priority;
  due_date: string;
}): Promise<{ ok: true; task: Task } | { error: string }> {
  const user = await authedUser();
  const supabase = getSupabaseAdmin();

  const { data: last } = await supabase
    .from("tasks").select("sort_order").eq("user_id", user.id)
    .order("sort_order", { ascending: false }).limit(1).single();

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: user.id,
      title: input.title.trim(),
      description: input.description.trim() || null,
      priority: input.priority,
      status: "todo",
      due_date: input.due_date || null,
      sort_order: ((last?.sort_order as number) ?? -1) + 1,
    })
    .select().single();

  if (error) return { error: error.message };
  revalidatePath("/admin/tasks");
  return { ok: true, task: data as Task };
}

export async function updateTaskAction(input: {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  due_date: string;
}): Promise<{ ok: true; task: Task } | { error: string }> {
  const user = await authedUser();
  const { data, error } = await getSupabaseAdmin()
    .from("tasks")
    .update({
      title: input.title.trim(),
      description: input.description.trim() || null,
      priority: input.priority,
      status: input.status,
      due_date: input.due_date || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("user_id", user.id)
    .select().single();

  if (error) return { error: error.message };
  revalidatePath("/admin/tasks");
  return { ok: true, task: data as Task };
}

export async function updateTaskStatusAction(
  id: string, status: Status
): Promise<{ ok: true } | { error: string }> {
  const user = await authedUser();
  const { error } = await getSupabaseAdmin()
    .from("tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/admin/tasks");
  return { ok: true };
}

export async function deleteTaskAction(
  id: string
): Promise<{ ok: true } | { error: string }> {
  const user = await authedUser();
  const { error } = await getSupabaseAdmin()
    .from("tasks").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };
  return { ok: true };
}
