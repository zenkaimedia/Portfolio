"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/ui/Logo";
import { PlusIcon, LayersIcon, LinkIcon, ExternalIcon, LogoutIcon, ChevronRight } from "@/components/ui/icons";
import { logoutAction } from "./actions";

const NAV = [
  { href: "/admin",        label: "Add Project",      icon: PlusIcon,   exact: true },
  { href: "/admin/manage", label: "Manage",            icon: LayersIcon, exact: false },
  { href: "/admin/share",  label: "Portfolio Sharing", icon: LinkIcon,   exact: false },
] as const;

export default function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (pathname === "/admin/login") return null;

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-line px-6 py-5">
        <Logo className="h-6" />
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 p-3 pt-4">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
                active
                  ? "bg-gold/15 text-gold"
                  : "text-muted hover:bg-white/5 hover:text-bone"
              }`}
            >
              <Icon />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-line p-3 space-y-1">
        <a
          href="/work"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-xl px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted transition-colors hover:bg-white/5 hover:text-bone"
        >
          <ExternalIcon />
          View Portfolio
        </a>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted transition-colors hover:bg-ember/10 hover:text-ember"
          >
            <LogoutIcon />
            Log out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────────────────── */}
      <aside className="hidden w-60 shrink-0 border-r border-line bg-panel/50 md:flex md:flex-col">
        <SidebarContent />
      </aside>

      {/* ── Mobile top bar ───────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-b border-line bg-panel/50 px-4 py-3 md:hidden">
        <Logo className="h-6" />
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition-colors hover:text-bone"
        >
          <span className="rotate-90">
            <ChevronRight />
          </span>
        </button>
      </div>

      {/* ── Mobile drawer ────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute bottom-0 left-0 top-0 w-72 border-r border-line bg-ink shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-line text-muted hover:text-bone"
              aria-label="Close menu"
            >
              ×
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
