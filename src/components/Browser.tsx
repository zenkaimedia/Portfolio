"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import type { FileNode, FolderNode, Project } from "@/lib/types";
import type { FlatFile } from "@/lib/tree";
import {
  buildTree,
  flattenFiles,
  resolvePath,
} from "@/lib/tree";
import Logo from "./ui/Logo";
import ThemeToggle from "./ui/ThemeToggle";
import MediaViewer from "./MediaViewer";
import { screenshotUrl } from "@/lib/screenshot";
import { transformImage } from "@/lib/image";
import { ChevronRight } from "./ui/icons";

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
  const tree = useMemo(
    () => buildTree(projects, folderOrder),
    [projects, folderOrder]
  );
  const flat = useMemo(() => flattenFiles(tree), [tree]);

  const [path, setPath] = useState<string[]>(initialPath);

  const { chain, file } = useMemo(
    () => resolvePath(tree, path),
    [tree, path]
  );

  // The selected category is the first folder in the chain (or null = categories view)
  const selectedCategory: FolderNode | null = chain.length > 0 ? chain[0] : null;

  // ── URL sync ──────────────────────────────────────────────────────────────
  const navigate = useCallback((slugs: string[], replace = false) => {
    setPath(slugs);
    const url =
      "/work" +
      (slugs.length ? "/" + slugs.map(encodeURIComponent).join("/") : "");
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
    } else if (selectedCategory) {
      navigate([selectedCategory.slug], true);
    } else {
      navigate([], true);
    }
  }, [selectedCategory, navigate]);

  // ── Sibling navigation (all files in the category) ───────────────────────
  const categoryFlat = useMemo(
    () =>
      selectedCategory
        ? flat.filter((f) => f.file.project.category === selectedCategory.name)
        : flat,
    [flat, selectedCategory]
  );

  const siblingFiles = useMemo(
    () => (file ? categoryFlat.map((f) => f.file) : []),
    [categoryFlat, file]
  );

  const fileIndex = file
    ? siblingFiles.findIndex((f) => f.project.id === file.project.id)
    : -1;

  const gotoSibling = (i: number) => {
    const item = categoryFlat[i];
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

      {/* Content: category cards or item grid */}
      {selectedCategory === null ? (
        <CategoryGrid
          tree={tree}
          flat={flat}
          onSelect={(slug) => navigate([slug])}
        />
      ) : (
        <ItemGrid
          items={categoryFlat}
          selectedFile={file}
          onSelect={(slugs) => navigate(slugs)}
        />
      )}

      {/* Media viewer */}
      <AnimatePresence>
        {file && (
          <MediaViewer
            file={file}
            onClose={closeViewer}
            index={fileIndex}
            total={siblingFiles.length}
            onPrev={fileIndex > 0 ? () => gotoSibling(fileIndex - 1) : undefined}
            onNext={
              fileIndex < siblingFiles.length - 1
                ? () => gotoSibling(fileIndex + 1)
                : undefined
            }
          />
        )}
      </AnimatePresence>
    </main>
  );
}

/* ── Category grid (landing) ─────────────────────────────────────────────── */
function CategoryGrid({
  tree,
  flat,
  onSelect,
}: {
  tree: FolderNode;
  flat: FlatFile[];
  onSelect: (slug: string) => void;
}) {
  const categories = tree.children.filter(
    (c): c is FolderNode => c.kind === "folder"
  );

  if (categories.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
          No work to show yet — add rows to your projects table.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-5">
        {categories.map((cat) => {
          const firstImage = flat.find(
            (f) =>
              f.file.project.category === cat.name &&
              f.file.project.type === "image"
          );
          const count = flat.filter(
            (f) => f.file.project.category === cat.name
          ).length;
          return (
            <CategoryCard
              key={cat.slug}
              name={cat.name}
              imageUrl={firstImage?.file.project.media}
              count={count}
              onClick={() => onSelect(cat.slug)}
            />
          );
        })}
      </div>
    </div>
  );
}

function CategoryCard({
  name,
  imageUrl,
  count,
  onClick,
}: {
  name: string;
  imageUrl?: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-panel"
    >
      {/* Background image */}
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={transformImage(imageUrl, 600, 80)}
          alt={name}
          loading="lazy"
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className="absolute inset-0 h-full w-full select-none object-cover transition-transform duration-500 group-hover:scale-105"
        />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10 transition-opacity duration-300 group-hover:from-black/70" />

      {/* Text */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
        <div className="min-w-0">
          <h2 className="truncate font-display text-xl font-bold text-white sm:text-2xl">
            {name}
          </h2>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.25em] text-white/50">
            {count} {count === 1 ? "project" : "projects"}
          </p>
        </div>
        <span className="shrink-0 text-white/50 transition-colors group-hover:text-gold">
          <ChevronRight />
        </span>
      </div>
    </motion.button>
  );
}

/* ── Item grid (category detail) ─────────────────────────────────────────── */
function ItemGrid({
  items,
  selectedFile,
  onSelect,
}: {
  items: FlatFile[];
  selectedFile: FileNode | null;
  onSelect: (slugs: string[]) => void;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">

      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
            No items in this category yet.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 md:p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 md:gap-3">
            {items.map((f) => (
              <GridItem
                key={f.file.project.id}
                item={f}
                active={selectedFile?.project.id === f.file.project.id}
                onSelect={() => onSelect(f.path)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Grid item ────────────────────────────────────────────────────────────── */
function GridItem({
  item,
  active,
  onSelect,
}: {
  item: FlatFile;
  active: boolean;
  onSelect: () => void;
}) {
  const { file } = item;
  const { project } = file;

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

      {/* Type badge for non-image */}
      {project.type !== "image" && (
        <span className="absolute right-1.5 top-1.5 rounded bg-ink/70 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.15em] text-muted backdrop-blur">
          {project.type}
        </span>
      )}
    </motion.button>
  );
}
