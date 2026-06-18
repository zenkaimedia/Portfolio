import Link from "next/link";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { fetchProjects, fetchFolderOrder } from "@/lib/supabase/server";
import { buildTree, flattenFiles, resolvePath } from "@/lib/tree";
import Browser from "@/components/Browser";
import Logo from "@/components/ui/Logo";

export const dynamic = "force-dynamic";

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  const initialPath = path.map((p) => decodeURIComponent(p));

  try {
    const [projects, folderOrder] = await Promise.all([
      fetchProjects(),
      fetchFolderOrder(),
    ]);

    // If visiting a category URL (/[slug]) and that category has a PDF, redirect to the PDF directly.
    if (initialPath.length === 1) {
      const tree = buildTree(projects, folderOrder);
      const { chain } = resolvePath(tree, initialPath);
      if (chain.length === 1) {
        const flat = flattenFiles(tree);
        const pdf = flat.find(
          (f) =>
            f.file.project.category === chain[0].name &&
            f.file.project.type === "pdf"
        );
        if (pdf) redirect(pdf.file.project.media);
      }
    }

    return (
      <Browser
        projects={projects}
        initialPath={initialPath}
        folderOrder={folderOrder}
      />
    );
  } catch (err) {
    if (isRedirectError(err)) throw err;
    const message = err instanceof Error ? err.message : "Unknown error";
    return <SetupNotice message={message} />;
  }
}

function SetupNotice({ message }: { message: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Logo className="mb-10 h-8" />
      <div className="max-w-lg rounded-2xl border border-line bg-panel/60 p-8 backdrop-blur">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.3em] text-ember">Portfolio offline</p>
        <h1 className="mb-4 font-display text-2xl font-bold text-bone">Connect Supabase to continue</h1>
        <p className="mb-6 text-sm leading-relaxed text-muted">{message}</p>
      </div>
      <Link href="/admin" className="mt-8 font-mono text-[11px] uppercase tracking-[0.25em] text-muted transition-colors hover:text-gold">
        → Admin
      </Link>
    </main>
  );
}
