import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { fetchProjects } from "@/lib/supabase/server";
import AdminHeader from "@/components/AdminHeader";
import AdminForm from "./AdminForm";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAuthed())) redirect("/admin/login");

  // Existing values power the autocomplete so you reuse exact folder names.
  let categories: string[] = [];
  let subcategories: string[] = [];
  try {
    const projects = await fetchProjects();
    categories = [...new Set(projects.map((p) => p.category))].sort();
    subcategories = [
      ...new Set(
        projects
          .map((p) => p.subcategory)
          .filter((s): s is string => !!s)
      ),
    ].sort();
  } catch {
    /* no existing data yet — fine */
  }

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <AdminHeader current="add" />

      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.3em] text-gold">
        Admin
      </p>
      <h1 className="mb-8 font-display text-2xl font-bold text-bone sm:text-3xl">
        Add a project
      </h1>

      <AdminForm categories={categories} subcategories={subcategories} />
    </main>
  );
}
