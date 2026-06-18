"use server";

import { isAuthed } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type MessageTemplate = {
  id: string;
  title: string;
  message: string;
  created_at: string;
};

export async function fetchTemplates(): Promise<MessageTemplate[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as MessageTemplate[];
}

export async function createTemplateAction(
  title: string,
  message: string
): Promise<{ ok: true; template: MessageTemplate } | { error: string }> {
  if (!(await isAuthed())) return { error: "Unauthorized." };
  if (!title.trim() || !message.trim()) return { error: "Title and message are required." };
  const { data, error } = await getSupabaseAdmin()
    .from("message_templates")
    .insert({ title: title.trim(), message: message.trim() })
    .select()
    .single();
  if (error) return { error: error.message };
  revalidatePath("/admin/messages");
  return { ok: true, template: data as MessageTemplate };
}

export async function updateTemplateAction(
  id: string,
  title: string,
  message: string
): Promise<{ ok: true; template: MessageTemplate } | { error: string }> {
  if (!(await isAuthed())) return { error: "Unauthorized." };
  if (!title.trim() || !message.trim()) return { error: "Title and message are required." };
  const { data, error } = await getSupabaseAdmin()
    .from("message_templates")
    .update({ title: title.trim(), message: message.trim() })
    .eq("id", id)
    .select()
    .single();
  if (error) return { error: error.message };
  revalidatePath("/admin/messages");
  return { ok: true, template: data as MessageTemplate };
}

export async function deleteTemplateAction(
  id: string
): Promise<{ ok: true } | { error: string }> {
  if (!(await isAuthed())) return { error: "Unauthorized." };
  const { error } = await getSupabaseAdmin()
    .from("message_templates")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/messages");
  return { ok: true };
}
