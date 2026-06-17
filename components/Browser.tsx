"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import type { FileNode, Project, TreeNode } from "@/lib/types";
import {
  activeSlugs,
  buildTree,
  columnsFor,
  flattenFiles,
  resolvePath,
} from "@/lib/tree";
import Logo from "./ui/Logo";
import MediaViewer from "./MediaViewer";
import MediaStage from "./MediaStage";
import { screenshotUrl } from "@/lib/screenshot";
import {
  ChevronRight,
  FileIcon,
  FolderIcon,
  SearchIcon,
} from "./ui/icons";

const COL_WIDTH = 264;

/** True on phone-sized viewports. */
function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

export default function Browser({
  projects,
  initialPath,
  folderOrder = {},
}: {
  projects: Project[];
  initialPath: string[];
  folderOrder?: Record<string, number>;
}) {
  const tree = useMemo(
    () => buildTree(projects, folderOrder),
    [projects, folderOrder]
  );
  const flat = useMemo(() => flattenFiles(tree), [tree]);
  const isMobile = useIsMobile();

  const [path, setPath] = useState<string[]>(initialPath);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { chain, file } = useMemo(
    () => resolvePath(tree, path),
    [tree, path]
  );
  const columns = useMemo(() => columnsFor(tree, chain), [tree, chain]);
  const selected = useMemo(() => activeSlugs(chain, file), [chain, file]);

  // ── URL sync ──────────────────────────────────────────────────────────────
  // replace=true updates the URL WITHOUT adding a history entry — used when
  // swiping between sibling files so the device Back button returns to the
  // folder instead of stepping through every photo.
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

  // Keep the newest column in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
  }, [columns.length]);

  // ── interactions ────────────────────────────────────────────────────────
  const openInColumn = (colIndex: number, node: TreeNode) => {
    const prefix = selected.slice(0, colIndex);
    navigate([...prefix, node.slug]);
  };

  const closeViewer = useCallback(() => {
    // A file is opened with ONE pushState over the folder, and sibling swipes
    // only replace it — so a single back step lands cleanly on the folder.
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      navigate(chain.map((f) => f.slug), true);
    }
  }, [chain, navigate]);

  // Sibling files in the current file's folder (for swipe prev/next).
  const parentFolder = file ? chain[chain.length - 1] : undefined;
  const siblingFiles = parentFolder
    ? (parentFolder.children.filter((c) => c.kind === "file") as FileNode[])
    : [];
  const fileIndex = file
    ? siblingFiles.findIndex((f) => f.slug === file.slug)
    : -1;
  const gotoSibling = (i: number) =>
    navigate([...chain.map((f) => f.slug), siblingFiles[i].slug], true);

  // Breadcrumb segments
  const crumbs: { name: string; slugs: string[] }[] = [
    { name: "Our Work", slugs: [] },
    ...chain.map((f, i) => ({
      name: f.name,
      slugs: chain.slice(0, i + 1).map((c) => c.slug),
    })),
  ];
  if (file) crumbs.push({ name: file.name, slugs: selected });

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex shrink-0 items-center gap-4 px-5 py-4 md:px-8">
        <Link href="/" className="shrink-0">
          <Logo className="h-6 md:h-7" />
        </Link>

        <div className="hairline mx-2 hidden h-6 w-px shrink-0 md:block" />

        {/* Breadcrumb (desktop — on mobile it moves next to the Back button) */}
        <nav className="hidden min-w-0 flex-1 items-center gap-1.5 overflow-x-auto font-mono text-[11px] uppercase tracking-[0.18em] text-muted [scrollbar-width:none] md:flex">
          {crumbs.map((c, i) => (
            <span key={i} className="flex shrink-0 items-center gap-1.5">
              {i > 0 && <span className="text-line">/</span>}
              <button
                onClick={() => navigate(c.slugs)}
                className={`transition-colors hover:text-gold ${
                  i === crumbs.length - 1 ? "text-bone" : ""
                }`}
              >
                {c.name}
              </button>
            </span>
          ))}
        </nav>

        <div className="ml-auto shrink-0 md:ml-0">
          <Search flat={flat} onPick={(slugs) => navigate(slugs)} />
        </div>
      </header>

      <div className="hairline h-px w-full shrink-0" />

      {/* Columns */}
      {isMobile ? (
        <MobileColumn
          columns={columns}
          chain={chain}
          selected={selected}
          onOpen={openInColumn}
          onUp={() => navigate(chain.slice(0, -1).map((f) => f.slug))}
          onNavigate={navigate}
        />
      ) : (
        <div
          ref={scrollRef}
          className="flex flex-1 overflow-x-auto overflow-y-hidden"
        >
          {columns.map((items, colIndex) => {
            const label =
              colIndex === 0 ? "Our Work" : chain[colIndex - 1]?.name ?? "";
            return (
              <Column
                key={colIndex}
                index={colIndex}
                label={label}
                items={items}
                activeSlug={selected[colIndex]}
                onOpen={openInColumn}
              />
            );
          })}

          {columns.length === 1 && columns[0].length === 0 ? (
            /* Empty-state hint */
            <div className="flex flex-1 items-center justify-center">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
                No work to show yet — add rows to your projects table.
              </p>
            </div>
          ) : (
            /* Inline preview pane (the right-hand area) */
            <DesktopPreview file={file} trail={chain.map((f) => f.name)} />
          )}
        </div>
      )}

      {/* Mobile-only popup viewer (desktop uses the inline preview pane) */}
      <AnimatePresence>
        {isMobile && file && (
          <MediaViewer
            file={file}
            trail={chain.map((f) => f.name)}
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

/* ── Desktop: inline preview pane (right-hand area) ────────────────────────── */
function DesktopPreview({
  file,
  trail,
}: {
  file: FileNode | null;
  trail: string[];
}) {
  if (!file) {
    return (
      <div className="flex min-w-[420px] flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        <Logo variant="mark" className="h-12 opacity-[0.12]" />
        <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted/50">
          Select an item to preview
        </span>
      </div>
    );
  }

  const { project } = file;
  return (
    <motion.div
      key={project.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="flex min-w-[420px] flex-1 flex-col overflow-hidden"
    >
      <div className="flex items-center gap-3 px-6 pb-3 pt-5">
        <span className="rounded-full border border-gold/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-gold-soft">
          {project.type}
        </span>
        {trail.length > 0 && (
          <span className="truncate font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            {trail.join("  ·  ")}
          </span>
        )}
      </div>
      <h2 className="truncate px-6 pb-4 font-display text-2xl font-bold text-bone">
        {project.title}
      </h2>

      <MediaStage file={file} />

      {project.description && (
        <p className="px-6 py-4 text-sm leading-relaxed text-muted">
          {project.description}
        </p>
      )}
    </motion.div>
  );
}

/* ── Mobile: one full-width column at a time ───────────────────────────────── */
function MobileColumn({
  columns,
  chain,
  selected,
  onOpen,
  onUp,
  onNavigate,
}: {
  columns: TreeNode[][];
  chain: { name: string; slug: string }[];
  selected: string[];
  onOpen: (colIndex: number, node: TreeNode) => void;
  onUp: () => void;
  onNavigate: (slugs: string[]) => void;
}) {
  const lastIndex = columns.length - 1;
  const items = columns[lastIndex] ?? [];
  const label = lastIndex === 0 ? "Our Work" : chain[lastIndex - 1]?.name ?? "";
  const canGoUp = chain.length > 0;

  // Folder-only breadcrumb: Our Work / AI / AI Commercials
  const crumbs: { name: string; slugs: string[] }[] = [
    { name: "Our Work", slugs: [] },
    ...chain.map((f, i) => ({
      name: f.name,
      slugs: chain.slice(0, i + 1).map((c) => c.slug),
    })),
  ];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-3 border-b border-line/60 px-4 py-3">
        {canGoUp && (
          <button
            onClick={onUp}
            className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-gold transition-opacity hover:opacity-80"
          >
            <span className="rotate-180">
              <ChevronRight />
            </span>
            Back
          </button>
        )}
        <nav className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto font-mono text-[11px] uppercase tracking-[0.16em] text-muted [scrollbar-width:none]">
          {crumbs.map((c, i) => (
            <span key={i} className="flex shrink-0 items-center gap-1.5">
              {i > 0 && <span className="text-line">/</span>}
              <button
                onClick={() => onNavigate(c.slugs)}
                className={`transition-colors hover:text-gold ${
                  i === crumbs.length - 1 ? "text-bone" : ""
                }`}
              >
                {c.name}
              </button>
            </span>
          ))}
        </nav>
      </div>
      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted">
            {columns.length === 1
              ? "No work to show yet — add rows to your projects table."
              : "Empty folder"}
          </p>
        </div>
      ) : (
        <Column
          key={lastIndex}
          index={lastIndex}
          label={label}
          items={items}
          activeSlug={selected[lastIndex]}
          onOpen={onOpen}
          fullWidth
        />
      )}
    </div>
  );
}

/* ── Column ──────────────────────────────────────────────────────────────── */
function Column({
  index,
  label,
  items,
  activeSlug,
  onOpen,
  fullWidth = false,
}: {
  index: number;
  label: string;
  items: TreeNode[];
  activeSlug?: string;
  onOpen: (colIndex: number, node: TreeNode) => void;
  fullWidth?: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
      className={`flex h-full flex-col ${
        fullWidth ? "w-full flex-1" : "shrink-0 border-r border-line"
      }`}
      style={fullWidth ? undefined : { width: COL_WIDTH }}
    >
      <div className="shrink-0 px-4 pb-2 pt-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
          {label}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-6">
        {items.length === 0 && (
          <p className="px-2 py-3 text-xs text-muted/60">Empty</p>
        )}
        {items.map((node, i) => {
          const active = node.slug === activeSlug;
          const isFolder = node.kind === "folder";
          return (
            <motion.button
              key={node.slug}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.02 * i + 0.04 * index, duration: 0.3 }}
              onClick={() => onOpen(index, node)}
              className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                active
                  ? "bg-gold/12 text-bone"
                  : "text-bone/75 hover:bg-white/[0.04] hover:text-bone"
              }`}
            >
              {/* active accent bar */}
              {active && (
                <motion.span
                  layoutId={`accent-${index}`}
                  className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full"
                  style={{ background: "var(--color-gold)" }}
                />
              )}

              {/* leading visual */}
              {isFolder ? (
                <span
                  className={`shrink-0 transition-colors ${
                    active ? "text-gold" : "text-muted group-hover:text-bone/80"
                  }`}
                >
                  <FolderIcon open={active} />
                </span>
              ) : (
                <Thumb project={node.project} />
              )}

              <span className="flex-1 truncate text-sm font-light">
                {node.name}
              </span>

              {isFolder ? (
                <span
                  className={`shrink-0 transition-transform ${
                    active ? "text-gold" : "text-muted/50 group-hover:translate-x-0.5"
                  }`}
                >
                  <ChevronRight />
                </span>
              ) : (
                <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.15em] text-muted/60">
                  {node.project.type}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.section>
  );
}

/* ── Thumbnail (derived, no thumbnail column) ──────────────────────────────── */
const THUMB =
  "relative h-8 w-12 shrink-0 overflow-hidden rounded border border-line bg-black";

function Thumb({ project }: { project: Project }) {
  if (project.type === "image") {
    return (
      <span className={THUMB}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={project.media}
          alt=""
          loading="lazy"
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100 select-none"
        />
      </span>
    );
  }
  if (project.type === "video") {
    return (
      <span className={THUMB}>
        <VideoThumb src={project.media} />
      </span>
    );
  }
  // website — auto-generated screenshot, falling back to a globe glyph
  return (
    <span className={THUMB}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={screenshotUrl(project.media, 240)}
        alt=""
        loading="lazy"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        className="h-full w-full select-none object-cover object-top opacity-90 transition-opacity group-hover:opacity-100"
      />
    </span>
  );
}

/** Renders the first frame of a video as a still thumbnail (no extra files). */
function VideoThumb({ src }: { src: string }) {
  return (
    <video
      src={src}
      muted
      playsInline
      preload="metadata"
      controlsList="nodownload"
      disablePictureInPicture
      onContextMenu={(e) => e.preventDefault()}
      onLoadedMetadata={(e) => {
        try {
          e.currentTarget.currentTime = 0.1;
        } catch {
          /* ignore */
        }
      }}
      className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
    />
  );
}

/* ── Search ──────────────────────────────────────────────────────────────── */
function Search({
  flat,
  onPick,
}: {
  flat: ReturnType<typeof flattenFiles>;
  onPick: (slugs: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else setQ("");
  }, [open]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return flat
      .filter((f) => {
        const hay = `${f.file.name} ${f.trail.join(" ")} ${f.file.project.category}`.toLowerCase();
        return hay.includes(term);
      })
      .slice(0, 8);
  }, [q, flat]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-2 rounded-full border border-line px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted transition-colors hover:border-gold/50 hover:text-bone"
      >
        <SearchIcon />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-muted/70 md:inline">
          ⌘K
        </kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[18vh]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-ink/80 backdrop-blur-md"
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-ink-2/95 shadow-2xl"
              initial={{ opacity: 0, y: -16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
            >
              <div className="flex items-center gap-3 border-b border-line px-5 py-4 text-muted">
                <SearchIcon />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search our work…"
                  className="w-full bg-transparent text-base text-bone outline-none placeholder:text-muted/60"
                />
              </div>

              <div className="max-h-[44vh] overflow-y-auto p-2">
                {q && results.length === 0 && (
                  <p className="px-4 py-6 text-center font-mono text-xs uppercase tracking-[0.2em] text-muted">
                    No matches
                  </p>
                )}
                {results.map((r) => (
                  <button
                    key={r.file.project.id}
                    onClick={() => {
                      onPick(r.path);
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
                  >
                    <span className="text-muted">
                      <FileIcon type={r.file.project.type} />
                    </span>
                    <span className="flex-1">
                      <span className="block truncate text-sm text-bone">
                        {r.file.name}
                      </span>
                      <span className="block truncate font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                        {r.trail.join(" · ") || r.file.project.category}
                      </span>
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted/60">
                      {r.file.project.type}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
