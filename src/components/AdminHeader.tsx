import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { logoutAction } from "@/app/(admin)/admin/actions";

const links = [
  { href: "/admin", label: "+ Add", key: "add" },
  { href: "/admin/manage", label: "Manage", key: "manage" },
  { href: "/work", label: "View site", key: "site" },
] as const;

export default function AdminHeader({
  current,
}: {
  current?: "add" | "manage";
}) {
  return (
    <header className="mb-8">
      <div className="flex items-center justify-between gap-3">
        <Link href="/">
          <Logo className="h-6 sm:h-7" />
        </Link>

        {/* Desktop: inline links */}
        <nav className="hidden items-center gap-5 font-mono text-[11px] uppercase tracking-[0.2em] sm:flex">
          {links.map((l) => (
            <Link
              key={l.key}
              href={l.href}
              className={`transition-colors hover:text-gold ${
                current === l.key ? "text-gold" : "text-muted"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <form action={logoutAction}>
            <button className="text-muted transition-colors hover:text-ember">
              Log out
            </button>
          </form>
        </nav>
      </div>

      {/* Mobile: links as a clean pill bar below the logo */}
      <nav className="mt-4 grid grid-cols-4 gap-1 rounded-xl border border-line bg-panel/40 p-1 font-mono text-[10px] uppercase tracking-[0.1em] sm:hidden">
        {links.map((l) => (
          <Link
            key={l.key}
            href={l.href}
            className={`rounded-lg px-2 py-2.5 text-center transition-colors ${
              current === l.key
                ? "bg-gold/15 text-gold-soft"
                : "text-muted hover:text-bone"
            }`}
          >
            {l.key === "site" ? "Site" : l.label}
          </Link>
        ))}
        <form action={logoutAction}>
          <button className="w-full rounded-lg px-2 py-2.5 text-center text-muted transition-colors hover:text-ember">
            Log out
          </button>
        </form>
      </nav>
    </header>
  );
}
