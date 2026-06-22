import Link from "next/link";
import { redirect, notFound } from "next/navigation";
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

    const tree = buildTree(projects, folderOrder);
    const { chain, file } = resolvePath(tree, initialPath);

    // For single-segment category URLs, check for redirect or PDF projects
    if (initialPath.length === 1 && chain.length === 1) {
      const flat = flattenFiles(tree);
      const catName = chain[0].name;

      // Redirect type: instantly send user to the stored URL
      const redirectProject = flat.find(
        (f) => f.file.project.category === catName && f.file.project.type === "redirect"
      );
      if (redirectProject) redirect(redirectProject.file.project.media);

      // PDF type: open the PDF directly
      const pdf = flat.find(
        (f) => f.file.project.category === catName && f.file.project.type === "pdf"
      );
      if (pdf) redirect(pdf.file.project.media);
    }

    // If the path doesn't match any category or item in the tree, return 404.
    // This blocks /work, /work/anything, and any other invalid URL.
    if (chain.length === 0 && file === null) {
      notFound();
    }

    return (
      <Browser
        projects={projects}
        initialPath={initialPath}
        folderOrder={folderOrder}
      />
    );
  } catch (err) {
    // Re-throw Next.js internal errors (redirect, notFound, etc.) — they have a digest property
    if (isRedirectError(err)) throw err;
    if (err && typeof err === "object" && "digest" in err) throw err;
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
