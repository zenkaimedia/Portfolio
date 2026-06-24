import { requireAccess } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import type { Permission } from "@/lib/permissions";
import { fetchTemplates } from "./actions";
import MessagesPanel from "./MessagesPanel";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const user = await requireAccess(PERMISSIONS.MESSAGES);
  const canManage = user.role === "admin" || user.permissions.includes(PERMISSIONS.MESSAGES_MANAGE as Permission);

  let templates: Awaited<ReturnType<typeof fetchTemplates>> = [];
  try { templates = await fetchTemplates(); } catch { /* table may not exist yet */ }

  return (
    <div className="flex h-full flex-col px-5 pt-8 md:px-8 md:pt-10">
      <div className="shrink-0 pb-6">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.3em] text-gold">Admin</p>
        <h1 className="mb-1 font-display text-2xl font-bold text-bone sm:text-3xl">Message Templates</h1>
        <p className="text-sm leading-relaxed text-muted">
          {canManage ? "Save reusable messages. Copy and share with clients in seconds." : "Copy and share message templates with clients."}
        </p>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden pb-8">
        <MessagesPanel templates={templates} canManage={canManage} />
      </div>
    </div>
  );
}
