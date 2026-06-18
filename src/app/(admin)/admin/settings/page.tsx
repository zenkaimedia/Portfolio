import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import SettingsPanel from "./SettingsPanel";

export default async function SettingsPage() {
  if (!(await isAuthed())) redirect("/admin/login");

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 md:px-8 md:py-10">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.3em] text-gold">Admin</p>
      <h1 className="mb-8 font-display text-2xl font-bold text-bone sm:text-3xl">Settings</h1>
      <SettingsPanel />
    </div>
  );
}
