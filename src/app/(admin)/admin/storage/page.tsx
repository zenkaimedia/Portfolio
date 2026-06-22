import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import StoragePanel from "./StoragePanel";

export const dynamic = "force-dynamic";

export default async function StoragePage() {
  if (!(await isAuthed())) redirect("/admin/login");
  return (
    <div className="flex h-full flex-col px-5 pt-8 md:px-8 md:pt-10">
      <div className="shrink-0 pb-6">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.3em] text-gold">Admin</p>
        <h1 className="mb-1 font-display text-2xl font-bold text-bone sm:text-3xl">Storage</h1>
        <p className="text-sm leading-relaxed text-muted">
          Monitor your Supabase storage usage and clean up orphaned files.
        </p>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden pb-8">
        <StoragePanel />
      </div>
    </div>
  );
}
