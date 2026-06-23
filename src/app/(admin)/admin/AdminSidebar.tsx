"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/ui/Logo";
import { PlusIcon, LayersIcon, LinkIcon, MessageIcon, CompressIcon, StorageIcon, BookIcon, UsersIcon, SettingsIcon, LogoutIcon, ChevronRight } from "@/components/ui/icons";
import { logoutAction } from "./actions";
import type { AdminUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

// permission = null means accessible to all logged-in users
// permission = "admin" means admin role only
const NAV = [
  { href: "/admin",              label: "Add Project",       icon: PlusIcon,      exact: true,  permission: PERMISSIONS.PROJECTS    as string | null },
  { href: "/admin/manage",       label: "Manage",             icon: LayersIcon,    exact: false, permission: PERMISSIONS.PROJECTS    as string | null },
  { href: "/admin/share",        label: "Portfolio Sharing",  icon: LinkIcon,      exact: false, permission: PERMISSIONS.SHARE       as string | null },
  { href: "/admin/messages",     label: "Message Templates",  icon: MessageIcon,   exact: false, permission: PERMISSIONS.MESSAGES    as string | null },
  { href: "/admin/compress",     label: "Compress Media",     icon: CompressIcon,  exact: false, permission: PERMISSIONS.COMPRESS    as string | null },
  { href: "/admin/storage",      label: "Storage",            icon: StorageIcon,   exact: false, permission: PERMISSIONS.STORAGE     as string | null },
  { href: "/admin/brand-story",  label: "Brand Story",        icon: BookIcon,      exact: false, permission: PERMISSIONS.BRAND_STORY as string | null },
  { href: "/admin/users",        label: "Users",               icon: UsersIcon,     exact: false, permission: "admin"                as string | null },
];

function canSee(item: typeof NAV[number], user: AdminUser | null): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (item.permission === "admin") return false;
  if (item.permission === null) return true;
  return user.permissions.includes(item.permission);
}

export default function AdminSidebar({ user }: { user: AdminUser | null }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (pathname === "/admin/login") return null;

  const visibleNav = NAV.filter(item => canSee(item, user));

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
        {visibleNav.map(({ href, label, icon: Icon, exact }) => {
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
        <Link
          href="/admin/settings"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 rounded-xl px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
            pathname.startsWith("/admin/settings") ? "bg-gold/15 text-gold" : "text-muted hover:bg-white/5 hover:text-bone"
          }`}
        >
          <SettingsIcon />
          Settings
        </Link>
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
