import { requireAccess } from "@/lib/auth";
import { fetchProjects } from "@/lib/supabase/server";
import AdminForm from "./AdminForm";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAccess("projects");

  let categories: string[] = [];
  let subcategories: string[] = [];
  try {
    const projects = await fetchProjects();
    categories = [...new Set(projects.map((p) => p.category))].sort();
    subcategories = [
      ...new Set(projects.map((p) => p.subcategory).filter((s): s is string => !!s)),
    ].sort();
  } catch {
    /* no existing data yet */
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 md:px-8 md:py-10">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.3em] text-gold">
        Admin
      </p>
      <h1 className="mb-8 font-display text-2xl font-bold text-bone sm:text-3xl">
        Add a project
      </h1>
      <AdminForm categories={categories} subcategories={subcategories} />
    </div>
  );
}

