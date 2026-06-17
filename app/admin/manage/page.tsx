import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/adminAuth";
import { fetchProjects, fetchFolderOrder } from "@/lib/supabase";
import type { Project } from "@/lib/types";
import AdminHeader from "@/components/AdminHeader";
import ManagePanel from "./ManagePanel";

export const dynamic = "force-dynamic";

export default async function ManagePage() {
  if (!(await isAuthed())) redirect("/admin/login");

  let projects: Project[] = [];
  let folderOrder: Record<string, number> = {};
  try {
    [projects, folderOrder] = await Promise.all([
      fetchProjects(),
      fetchFolderOrder(),
    ]);
  } catch {
    /* none yet */
  }

  const categories = [...new Set(projects.map((p) => p.category))].sort();
  const subcategories = [
    ...new Set(
      projects.map((p) => p.subcategory).filter((s): s is string => !!s)
    ),
  ].sort();

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <AdminHeader current="manage" />

      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.3em] text-gold">
        Admin
      </p>
      <h1 className="mb-8 font-display text-2xl font-bold text-bone sm:text-3xl">
        Manage work
      </h1>

      <ManagePanel
        projects={projects}
        categories={categories}
        subcategories={subcategories}
        folderOrder={folderOrder}
      />
    </main>
  );
}
