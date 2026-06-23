import { requireAccess } from "@/lib/auth";
import { fetchProjects, fetchFolderOrder } from "@/lib/supabase/server";
import type { Project } from "@/lib/types";
import ManagePanel from "./ManagePanel";

export const dynamic = "force-dynamic";

export default async function ManagePage() {
  await requireAccess("projects");

  let projects: Project[] = [];
  let folderOrder: Record<string, number> = {};
  try {
    [projects, folderOrder] = await Promise.all([
      fetchProjects(),
      fetchFolderOrder(),
    ]);
  } catch { /* none yet */ }

  const categories = [...new Set(projects.map((p) => p.category))].sort();
  const subcategories = [
    ...new Set(projects.map((p) => p.subcategory).filter((s): s is string => !!s)),
  ].sort();

  return (
    <div className="flex h-full flex-col px-5 pt-8 md:px-8 md:pt-10">
      <div className="shrink-0 pb-4">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.3em] text-gold">Admin</p>
        <h1 className="mb-1 font-display text-2xl font-bold text-bone sm:text-3xl">Manage Work</h1>
        <p className="text-sm text-muted">{projects.length} project{projects.length !== 1 ? "s" : ""} total</p>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden pb-8">
        <ManagePanel
          projects={projects}
          categories={categories}
          subcategories={subcategories}
          folderOrder={folderOrder}
        />
      </div>
    </div>
  );
}

