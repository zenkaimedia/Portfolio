import Link from "next/link";
import { fetchProjects, fetchFolderOrder } from "@/lib/supabase/server";
import Browser from "@/components/Browser";
import Logo from "@/components/ui/Logo";

export const dynamic = "force-dynamic";

export default async function WorkPage({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path } = await params;
  const initialPath = (path ?? []).map((p) => decodeURIComponent(p));

  try {
    const [projects, folderOrder] = await Promise.all([
      fetchProjects(),
      fetchFolderOrder(),
    ]);
    return (
      <Browser
        projects={projects}
        initialPath={initialPath}
        folderOrder={folderOrder}
      />
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return <SetupNotice message={message} />;
  }
}

function SetupNotice({ message }: { message: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Logo className="mb-10 h-8" />
      <div className="max-w-lg rounded-2xl border border-line bg-panel/60 p-8 backdrop-blur">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.3em] text-ember">
          Our Work offline
        </p>
        <h1 className="mb-4 font-display text-2xl font-bold text-bone">
          Connect Supabase to continue
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-muted">{message}</p>
        <ol className="space-y-2 text-left font-mono text-xs leading-relaxed text-bone/70">
          <li>1 — copy <span className="text-gold">.env.local.example</span> to <span className="text-gold">.env.local</span></li>
          <li>2 — fill in your project URL + anon key</li>
          <li>3 — run the SQL in <span className="text-gold">supabase/schema.sql</span></li>
          <li>4 — restart <span className="text-gold">npm run dev</span></li>
        </ol>
      </div>
      <Link
        href="/"
        className="mt-8 font-mono text-[11px] uppercase tracking-[0.25em] text-muted transition-colors hover:text-gold"
      >
        ← back home
      </Link>
    </main>
  );
}
