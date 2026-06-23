import { requireAccess } from "@/lib/auth";
import { getStorageStatsAction } from "./actions";
import StoragePanel from "./StoragePanel";

export const dynamic = "force-dynamic";

export default async function StoragePage() {
  await requireAccess("storage");

  // Fetch on the server â€” data is ready the moment the page loads
  const stats = await getStorageStatsAction();

  return (
    <div className="flex h-full flex-col px-5 pt-8 md:px-8 md:pt-10">
      <div className="shrink-0 pb-6">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.3em] text-gold">Admin</p>
        <h1 className="mb-1 font-display text-2xl font-bold text-bone sm:text-3xl">Storage</h1>
        <p className="text-sm leading-relaxed text-muted">
          Live storage usage from your Supabase bucket.
        </p>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden pb-8">
        <StoragePanel
          initialStats={"error" in stats ? null : stats}
          initialError={"error" in stats ? stats.error : null}
        />
      </div>
    </div>
  );
}

