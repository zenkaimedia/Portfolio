import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { fetchProjects, fetchFolderOrder } from "@/lib/supabase/server";
import { buildTree } from "@/lib/tree";
import CopyLinkPanel from "./CopyLinkPanel";

export const dynamic = "force-dynamic";

export default async function SharePage() {
  if (!(await isAuthed())) redirect("/admin/login");

  let categories: { name: string; slug: string }[] = [];

  try {
    const [projects, folderOrder] = await Promise.all([
      fetchProjects(),
      fetchFolderOrder(),
    ]);
    const tree = buildTree(projects, folderOrder);
    categories = tree.children
      .filter((c) => c.kind === "folder")
      .map((c) => ({ name: c.name, slug: c.slug }));
  } catch {
    /* no data yet */
  }

  return (
    <div className="flex h-full flex-col px-5 pt-8 md:px-8 md:pt-10">
      <div className="shrink-0 pb-6">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.3em] text-gold">Admin</p>
        <h1 className="mb-1 font-display text-2xl font-bold text-bone sm:text-3xl">Portfolio Sharing</h1>
        <p className="text-sm leading-relaxed text-muted">
          Copy any category link and share it directly with your clients.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden pb-8">
        <CopyLinkPanel categories={categories} />
      </div>
    </div>
  );
}
