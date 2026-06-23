import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import ActivityLog from "./ActivityLog";

export const dynamic = "force-dynamic";

export type ActivityEntry = {
  id: string;
  user_id: string | null;
  user_name: string;
  user_email: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
};

export default async function ActivityPage() {
  if (!(await isAdmin())) redirect("/admin");

  const { data } = await getSupabaseAdmin()
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="flex h-full flex-col px-5 pt-8 md:px-8 md:pt-10">
      <div className="shrink-0 pb-6">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.3em] text-gold">Admin</p>
        <h1 className="mb-1 font-display text-2xl font-bold text-bone sm:text-3xl">Activity Log</h1>
        <p className="text-sm leading-relaxed text-muted">Recent actions by all team members.</p>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden pb-8">
        <ActivityLog entries={(data ?? []) as ActivityEntry[]} />
      </div>
    </div>
  );
}
