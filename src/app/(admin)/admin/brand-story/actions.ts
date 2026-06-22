"use server";

import { revalidatePath } from "next/cache";
import { isAuthed } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type FAQ = {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  created_at: string;
};

/* ── Brand story ─────────────────────────────────────────────────────────── */
export async function fetchBrandStory(): Promise<string> {
  const { data } = await getSupabaseAdmin()
    .from("brand_story")
    .select("content")
    .eq("id", 1)
    .single();
  return data?.content ?? "";
}

export async function saveBrandStoryAction(
  content: string
): Promise<{ ok: true } | { error: string }> {
  if (!(await isAuthed())) return { error: "Unauthorized." };
  const { error } = await getSupabaseAdmin()
    .from("brand_story")
    .upsert({ id: 1, content: content.trim(), updated_at: new Date().toISOString() });
  if (error) return { error: error.message };
  revalidatePath("/admin/brand-story");
  return { ok: true };
}

/* ── FAQs ────────────────────────────────────────────────────────────────── */
export async function fetchFAQs(): Promise<FAQ[]> {
  const { data } = await getSupabaseAdmin()
    .from("faqs")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []) as FAQ[];
}

export async function createFAQAction(
  question: string,
  answer: string
): Promise<{ ok: true; faq: FAQ } | { error: string }> {
  if (!(await isAuthed())) return { error: "Unauthorized." };
  const { data: existing } = await getSupabaseAdmin().from("faqs").select("sort_order").order("sort_order", { ascending: false }).limit(1).single();
  const sort_order = ((existing?.sort_order as number) ?? -1) + 1;
  const { data, error } = await getSupabaseAdmin()
    .from("faqs")
    .insert({ question: question.trim(), answer: answer.trim(), sort_order })
    .select()
    .single();
  if (error) return { error: error.message };
  return { ok: true, faq: data as FAQ };
}

export async function updateFAQAction(
  id: string, question: string, answer: string
): Promise<{ ok: true; faq: FAQ } | { error: string }> {
  if (!(await isAuthed())) return { error: "Unauthorized." };
  const { data, error } = await getSupabaseAdmin()
    .from("faqs")
    .update({ question: question.trim(), answer: answer.trim() })
    .eq("id", id)
    .select()
    .single();
  if (error) return { error: error.message };
  return { ok: true, faq: data as FAQ };
}

export async function deleteFAQAction(
  id: string
): Promise<{ ok: true } | { error: string }> {
  if (!(await isAuthed())) return { error: "Unauthorized." };
  const { error } = await getSupabaseAdmin().from("faqs").delete().eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function reorderFAQsAction(
  orderedIds: string[]
): Promise<{ ok: true } | { error: string }> {
  if (!(await isAuthed())) return { error: "Unauthorized." };
  const supabase = getSupabaseAdmin();
  for (let i = 0; i < orderedIds.length; i++) {
    await supabase.from("faqs").update({ sort_order: i }).eq("id", orderedIds[i]);
  }
  return { ok: true };
}
