import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { fetchTemplates } from "./actions";
import MessagesPanel from "./MessagesPanel";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  if (!(await isAuthed())) redirect("/admin/login");

  let templates = [];
  try {
    templates = await fetchTemplates();
  } catch {
    /* table may not exist yet */
  }

  return (
    <div className="flex h-full flex-col px-5 pt-8 md:px-8 md:pt-10">
      {/* Header — fixed, doesn't scroll */}
      <div className="shrink-0 pb-6">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.3em] text-gold">Admin</p>
        <h1 className="mb-1 font-display text-2xl font-bold text-bone sm:text-3xl">Message Templates</h1>
        <p className="text-sm leading-relaxed text-muted">
          Save reusable messages. Copy and share with clients in seconds.
        </p>
      </div>

      {/* Panel — grows to fill remaining height, scrolls independently */}
      <div className="flex min-h-0 flex-1 overflow-hidden pb-8">
        <MessagesPanel templates={templates} />
      </div>
    </div>
  );
}
