"use client";

import { useActionState } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { loginAction } from "../actions";

export default function AdminLoginPage() {
  const [error, formAction, pending] = useActionState(loginAction, null);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <Logo className="mb-10 h-8" />
      <form
        action={formAction}
        className="w-full max-w-sm rounded-2xl border border-line bg-panel/60 p-8 backdrop-blur"
      >
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.3em] text-gold">Admin</p>
        <h1 className="mb-6 font-display text-2xl font-bold text-bone">Sign in</h1>

        <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Email</label>
        <input
          name="email"
          type="email"
          autoFocus
          required
          placeholder="admin@zenkai.in"
          className="mb-4 w-full rounded-lg border border-line bg-ink px-4 py-3 text-bone outline-none transition-colors focus:border-gold placeholder:text-muted/40"
        />

        <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Password</label>
        <input
          name="password"
          type="password"
          required
          className="w-full rounded-lg border border-line bg-ink px-4 py-3 text-bone outline-none transition-colors focus:border-gold"
        />

        {error && <p className="mt-3 font-mono text-xs text-ember">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full rounded-full border border-gold/40 bg-gold/10 px-6 py-3 font-mono text-xs uppercase tracking-[0.25em] text-gold-soft transition-all hover:border-gold hover:bg-gold/20 disabled:opacity-50"
        >
          {pending ? "Signing in…" : "Enter"}
        </button>
      </form>

      <p className="mt-6 font-mono text-[10px] text-muted">
        Default: admin@zenkai.in + your ADMIN_PASSWORD
      </p>
    </main>
  );
}
