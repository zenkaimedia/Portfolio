import { requireAccess } from "@/lib/auth";
import { fetchProjects } from "@/lib/supabase/server";
import CompressPanel from "./CompressPanel";

export const dynamic = "force-dynamic";

export default async function CompressPage() {
  await requireAccess("compress");

  let projects: Awaited<ReturnType<typeof fetchProjects>> = [];
  try { projects = await fetchProjects(); } catch { /* no data yet */ }

  return (
    <div className="flex h-full flex-col px-5 pt-8 md:px-8 md:pt-10">
      <div className="shrink-0 pb-6">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.3em] text-gold">Admin</p>
        <h1 className="mb-1 font-display text-2xl font-bold text-bone sm:text-3xl">Compress Media</h1>
        <p className="text-sm leading-relaxed text-muted">
          Reduce file sizes to improve loading speed. Images are compressed in the browser and re-uploaded automatically.
        </p>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden pb-8">
        <CompressPanel projects={projects} />
      </div>
    </div>
  );
}

