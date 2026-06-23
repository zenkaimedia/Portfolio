"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/ui/Logo";
import PasswordInput from "@/components/ui/PasswordInput";
import { createFirstAdminAction } from "./actions";

export default function SetupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true); setError(null);
    const res = await createFirstAdminAction(name, email, password);
    setLoading(false);
    if ("error" in res) { setError(res.error); return; }
    router.push("/admin/login");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <Logo className="mb-10 h-8" />
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-line bg-panel/60 p-8 backdrop-blur">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.3em] text-gold">First time setup</p>
        <h1 className="mb-2 font-display text-2xl font-bold text-bone">Create Admin Account</h1>
        <p className="mb-6 text-sm text-muted">No accounts exist yet. Create the first admin account to get started.</p>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} required placeholder="Your name" className="w-full rounded-lg border border-line bg-ink px-4 py-3 text-bone outline-none transition-colors focus:border-gold placeholder:text-muted/40" />
          </div>
          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="admin@yourcompany.com" className="w-full rounded-lg border border-line bg-ink px-4 py-3 text-bone outline-none transition-colors focus:border-gold placeholder:text-muted/40" />
          </div>
          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Password</label>
            <PasswordInput value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min 8 characters" className="w-full rounded-lg border border-line bg-ink px-4 py-3 text-bone outline-none transition-colors focus:border-gold placeholder:text-muted/40" />
          </div>
          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Confirm Password</label>
            <PasswordInput value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Repeat password" className="w-full rounded-lg border border-line bg-ink px-4 py-3 text-bone outline-none transition-colors focus:border-gold placeholder:text-muted/40" />
          </div>
        </div>

        {error && <p className="mt-3 font-mono text-xs text-ember">{error}</p>}

        <button type="submit" disabled={loading || !name || !email || !password || !confirm}
          className="mt-6 w-full rounded-full border border-gold/40 bg-gold/10 px-6 py-3 font-mono text-xs uppercase tracking-[0.25em] text-gold-soft transition-all hover:border-gold hover:bg-gold/20 disabled:opacity-50">
          {loading ? "Creating…" : "Create Admin Account"}
        </button>
      </form>
    </main>
  );
}
