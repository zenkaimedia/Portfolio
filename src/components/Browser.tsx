"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import type { FileNode, Project } from "@/lib/types";
import type { FlatFile } from "@/lib/tree";
import { buildTree, flattenFiles, resolvePath } from "@/lib/tree";
import Link from "next/link";
import Logo from "./ui/Logo";
import ThemeToggle from "./ui/ThemeToggle";
import MediaViewer from "./MediaViewer";
import { screenshotUrl } from "@/lib/screenshot";
import { transformImage } from "@/lib/image";
import { PdfIcon } from "./ui/icons";

export default function Browser({
  projects,
  initialPath,
  folderOrder = {},
}: {
  projects: Project[];
  initialPath: string[];
  folderOrder?: Record<string, number>;
}) {
  const pathname = usePathname();
  const tree = useMemo(() => buildTree(projects, folderOrder), [projects, folderOrder]);
  const flat = useMemo(() => flattenFiles(tree), [tree]);

  const [path, setPath] = useState<string[]>(initialPath);

  const { chain, file } = useMemo(() => resolvePath(tree, path), [tree, path]);

  // If a category folder is in the chain (no file yet), filter grid to that category
  const selectedCategory = chain.length > 0 ? chain[0] : null;
  const visibleItems = useMemo(
    () =>
      selectedCategory
        ? flat.filter((f) => f.file.project.category === selectedCategory.name)
        : flat,
    [flat, selectedCategory]
  );

  // ── URL sync ──────────────────────────────────────────────────────────────
  const navigate = useCallback((slugs: string[], replace = false) => {
    setPath(slugs);
    const url = "/work" + (slugs.length ? "/" + slugs.map(encodeURIComponent).join("/") : "");
    if (replace) window.history.replaceState({}, "", url);
    else window.history.pushState({}, "", url);
  }, []);

  useEffect(() => {
    const onPop = () => {
      const parts = window.location.pathname
        .replace(/^\/work\/?/, "")
        .split("/")
        .filter(Boolean)
        .map((p) => decodeURIComponent(p));
      setPath(parts);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // ── Viewer close ─────────────────────────────────────────────────────────
  const closeViewer = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      navigate(selectedCategory ? [selectedCategory.slug] : [], true);
    }
  }, [navigate, selectedCategory]);

  // ── Sibling navigation (scoped to visible items) ─────────────────────────
  const fileIndex = file ? visibleItems.findIndex((f) => f.file.project.id === file.project.id) : -1;
  const gotoSibling = (i: number) => {
    const item = visibleItems[i];
    if (item) navigate(item.path, true);
  };

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex shrink-0 items-center px-5 py-4 md:px-8">
        <Link href={pathname} className="shrink-0">
          <Logo className="h-6 md:h-7" />
        </Link>
        <ThemeToggle className="ml-auto" />
      </header>

      <div className="hairline h-px w-full shrink-0" />

      {/* Flat image grid */}
      {visibleItems.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
            No projects here yet.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 md:p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 md:gap-3">
            {visibleItems.map((f) => (
              <GridItem
                key={f.file.project.id}
                item={f}
                active={file?.project.id === f.file.project.id}
                onSelect={() => navigate(f.path)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Media viewer */}
      <AnimatePresence>
        {file && (
          <MediaViewer
            file={file}
            onClose={closeViewer}
            index={fileIndex}
            total={visibleItems.length}
            onPrev={fileIndex > 0 ? () => gotoSibling(fileIndex - 1) : undefined}
            onNext={fileIndex < visibleItems.length - 1 ? () => gotoSibling(fileIndex + 1) : undefined}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function GridItem({
  item,
  active,
  onSelect,
}: {
  item: FlatFile;
  active: boolean;
  onSelect: () => void;
}) {
  const { project } = item.file;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      onClick={onSelect}
      className={`group relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-black ring-2 transition-all duration-150 ${
        active ? "ring-gold" : "ring-transparent hover:ring-gold/40"
      }`}
    >
      {project.type === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={transformImage(project.media, 400, 80)}
          alt={project.title}
          loading="lazy"
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className="h-full w-full select-none object-cover transition-transform duration-300 group-hover:scale-105"
        />
      )}
      {project.type === "video" && (
        <video
          src={project.media}
          muted
          playsInline
          preload="metadata"
          controlsList="nodownload"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
          onLoadedMetadata={(e) => {
            try { e.currentTarget.currentTime = 0.1; } catch { /* ignore */ }
          }}
          className="h-full w-full object-cover"
        />
      )}
      {project.type === "website" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={screenshotUrl(project.media, 400)}
          alt={project.title}
          loading="lazy"
          className="h-full w-full object-cover object-top"
        />
      )}

      {/* Hover title */}
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/75 via-black/20 to-transparent p-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <p className="truncate font-mono text-[10px] uppercase tracking-[0.15em] text-white">
          {project.title}
        </p>
      </div>

      {project.type === "pdf" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-panel/80">
          <span className="text-muted"><PdfIcon /></span>
          <p className="line-clamp-2 px-3 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            {project.title}
          </p>
        </div>
      )}
      {project.type !== "image" && project.type !== "pdf" && (
        <span className="absolute right-1.5 top-1.5 rounded bg-ink/70 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.15em] text-muted backdrop-blur">
          {project.type}
        </span>
      )}
    </motion.button>
  );
}
