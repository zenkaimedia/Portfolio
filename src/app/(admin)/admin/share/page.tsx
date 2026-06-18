import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import CopyLinkPanel from "./CopyLinkPanel";

export const dynamic = "force-dynamic";

export default async function SharePage() {
  if (!(await isAuthed())) redirect("/admin/login");

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 md:px-8 md:py-10">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.3em] text-gold">
        Admin
      </p>
      <h1 className="mb-2 font-display text-2xl font-bold text-bone sm:text-3xl">
        Portfolio Sharing
      </h1>
      <p className="mb-10 text-sm leading-relaxed text-muted">
        Copy the link below and share it with your clients to showcase your portfolio.
      </p>

      <CopyLinkPanel />
    </div>
  );
}
