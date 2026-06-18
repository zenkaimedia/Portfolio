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
    <div className="mx-auto w-full max-w-3xl px-5 py-8 md:px-8 md:py-10">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.3em] text-gold">
        Admin
      </p>
      <h1 className="mb-2 font-display text-2xl font-bold text-bone sm:text-3xl">
        Message Templates
      </h1>
      <p className="mb-8 text-sm leading-relaxed text-muted">
        Save reusable messages. Copy and share with clients in seconds.
      </p>
      <MessagesPanel templates={templates} />
    </div>
  );
}
