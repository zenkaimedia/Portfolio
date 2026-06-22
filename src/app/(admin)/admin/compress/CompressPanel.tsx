"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Project } from "@/lib/types";
import { supabaseBrowser, MEDIA_BUCKET } from "@/lib/supabase/client";
import { getOverwriteUploadUrlAction } from "./actions";

function storagePathFromUrl(url: string): string | null {
  const marker = "/object/public/portfolio/";
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(url.slice(i + marker.length));
}
import { transformImage } from "@/lib/image";

/* ── Types ───────────────────────────────────────────────────────────────── */
type FileSizeMap = Record<string, number | null>; // media url → bytes
type CompressStatus = Record<string, "idle" | "compressing" | "done" | "error" | "skipped">;

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

function estimateSavings(bytes: number, quality: number): string {
  // Typical savings per quality level for JPEG/WebP
  const ratio = quality >= 90 ? 0.15 : quality >= 75 ? 0.40 : quality >= 60 ? 0.60 : 0.72;
  const saved = Math.round(bytes * ratio);
  return `~${formatBytes(saved)} saved`;
}

function getRec(bytes: number | null, type: string): { label: string; color: string; priority: number } {
  if (!bytes) return { label: "Loading…", color: "text-muted", priority: 0 };
  const mb = bytes / 1024 / 1024;

  if (type === "image") {
    if (mb < 0.1)  return { label: "✓ Already small", color: "text-gold-soft", priority: 0 };
    if (mb < 0.3)  return { label: "Good — optional", color: "text-gold-soft", priority: 1 };
    if (mb < 1)    return { label: "⚠ Recommended", color: "text-gold", priority: 2 };
    if (mb < 5)    return { label: "❗ High priority", color: "text-ember", priority: 3 };
    return               { label: "🔴 Very large!", color: "text-ember", priority: 4 };
  }
  if (type === "video") {
    if (mb < 10)  return { label: "✓ Good size", color: "text-gold-soft", priority: 0 };
    if (mb < 50)  return { label: "⚠ Use HandBrake", color: "text-gold", priority: 2 };
    return              { label: "❗ Very large!", color: "text-ember", priority: 3 };
  }
  if (type === "pdf") {
    if (mb < 2)  return { label: "✓ Good size", color: "text-gold-soft", priority: 0 };
    if (mb < 10) return { label: "⚠ Use ilovepdf.com", color: "text-gold", priority: 2 };
    return             { label: "❗ Use Smallpdf/Acrobat", color: "text-ember", priority: 3 };
  }
  return { label: "N/A", color: "text-muted", priority: 0 };
}

/* ── Image compression via OffscreenCanvas (non-blocking) ───────────────── */
async function compressImageBlob(url: string, quality: number, maxMB: number | null): Promise<Blob> {
  const res = await fetch(url);
  const originalBlob = await res.blob();
  const bitmap = await createImageBitmap(originalBlob);

  // OffscreenCanvas runs off the main thread — much faster than HTMLCanvasElement
  const useOffscreen = typeof OffscreenCanvas !== "undefined";
  const canvas = useOffscreen
    ? new OffscreenCanvas(bitmap.width, bitmap.height)
    : (() => {
        const c = document.createElement("canvas");
        c.width = bitmap.width;
        c.height = bitmap.height;
        return c;
      })();

  (canvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D)!.drawImage(bitmap, 0, 0);
  bitmap.close();

  const tryCompress = (q: number): Promise<Blob> =>
    useOffscreen
      ? (canvas as OffscreenCanvas).convertToBlob({ type: "image/webp", quality: q / 100 })
      : new Promise((resolve, reject) =>
          (canvas as HTMLCanvasElement).toBlob(
            (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
            "image/webp",
            q / 100
          )
        );

  let blob = await tryCompress(quality);

  // Iteratively reduce quality if a max-size target is set
  if (maxMB && blob.size > maxMB * 1024 * 1024) {
    let q = quality - 10;
    while (q >= 20 && blob.size > maxMB * 1024 * 1024) {
      blob = await tryCompress(q);
      q -= 10;
    }
  }

  return blob;
}

/* ── Toast ───────────────────────────────────────────────────────────────── */
type Toast = { label: string; sub?: string; done?: boolean } | null;

function CompressToast({ toast }: { toast: Toast }) {
  if (!toast) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ type: "spring", stiffness: 400, damping: 32 }}
      className="fixed bottom-6 right-6 z-[200] flex items-center gap-4 rounded-2xl border border-line bg-ink-2/95 px-5 py-4 shadow-2xl backdrop-blur-sm"
    >
      {toast.done
        ? <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold/20 text-gold">✓</motion.span>
        : <span className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
      }
      <div className="min-w-0">
        <p className="truncate font-mono text-[12px] font-medium text-bone">{toast.label}</p>
        {toast.sub && <p className="font-mono text-[10px] text-muted">{toast.sub}</p>}
      </div>
    </motion.div>
  );
}

/* ── Main panel ──────────────────────────────────────────────────────────── */
export default function CompressPanel({ projects }: { projects: Project[] }) {
  type SortKey = "size_desc" | "size_asc" | "name_asc" | "name_desc" | "category_asc" | "status_first" | "priority_desc";
  const [quality, setQuality] = useState(75);
  const [sortKey, setSortKey] = useState<SortKey>("size_desc");
  const [maxMB, setMaxMB] = useState<number | null>(null);
  const [sizes, setSizes] = useState<FileSizeMap>({});
  const [status, setStatus] = useState<CompressStatus>({});
  const [saved, setSaved] = useState<Record<string, number>>({}); // bytes saved per project
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<Toast>(null);
  const abortRef = useRef(false);

  // Images only, deduplicated by media URL
  const allImages = projects.filter((p, i, arr) =>
    p.type === "image" && arr.findIndex((x) => x.media === p.media) === i
  );

  const filtered = [...allImages].sort((a, b) => {
    switch (sortKey) {
      case "size_desc":    return (sizes[b.media] ?? 0) - (sizes[a.media] ?? 0);
      case "size_asc":     return (sizes[a.media] ?? 0) - (sizes[b.media] ?? 0);
      case "name_asc":     return a.title.localeCompare(b.title);
      case "name_desc":    return b.title.localeCompare(a.title);
      case "category_asc": return a.category.localeCompare(b.category) || a.title.localeCompare(b.title);
      case "status_first": {
        const done = (p: Project) => (status[p.id] === "done" ? 1 : 0);
        return done(a) - done(b);
      }
      case "priority_desc": {
        const pa = getRec(sizes[a.media], a.type).priority;
        const pb = getRec(sizes[b.media], b.type).priority;
        return pb - pa || (sizes[b.media] ?? 0) - (sizes[a.media] ?? 0);
      }
      default: return 0;
    }
  });

  const compressible = filtered;

  // Fetch ALL file sizes in parallel via HEAD requests
  useEffect(() => {
    let cancelled = false;
    const toFetch = allImages.filter((p) => sizes[p.media] === undefined);
    if (!toFetch.length) return;

    Promise.all(
      toFetch.map(async (p) => {
        try {
          const res = await fetch(p.media, { method: "HEAD" });
          const len = res.headers.get("content-length");
          if (!cancelled) setSizes((prev) => ({ ...prev, [p.media]: len ? parseInt(len) : null }));
        } catch {
          if (!cancelled) setSizes((prev) => ({ ...prev, [p.media]: null }));
        }
      })
    );

    return () => { cancelled = true; };
  }, [allImages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAllImages() {
    const allImgIds = compressible.map((p) => p.id);
    const allSelected = allImgIds.every((id) => selected.has(id));
    setSelected(allSelected ? new Set() : new Set(allImgIds));
  }

  async function compressOne(project: Project): Promise<boolean> {
    const storagePath = storagePathFromUrl(project.media);
    if (!storagePath) return false;

    setStatus((prev) => ({ ...prev, [project.id]: "compressing" }));
    try {
      const originalSize = sizes[project.media] ?? 0;
      const compressed = await compressImageBlob(project.media, quality, maxMB);

      // Skip if result is not actually smaller (and no max-size target was set)
      if (compressed.size >= originalSize && !maxMB) {
        setStatus((prev) => ({ ...prev, [project.id]: "skipped" }));
        return false;
      }

      // Upload WebP content to the SAME storage path with upsert=true.
      // This atomically replaces the original — same URL, DB needs no update,
      // and the old file is gone. No orphaned files.
      const signed = await getOverwriteUploadUrlAction(storagePath);
      if ("error" in signed) throw new Error(signed.error);

      const { error } = await supabaseBrowser.storage
        .from(MEDIA_BUCKET)
        .uploadToSignedUrl(signed.path, signed.token, compressed, {
          contentType: "image/webp",
        });

      if (error) throw new Error(error.message);

      const byteSaved = Math.max(0, originalSize - compressed.size);
      setSaved((prev) => ({ ...prev, [project.id]: byteSaved }));
      setSizes((prev) => ({ ...prev, [project.media]: compressed.size }));
      setStatus((prev) => ({ ...prev, [project.id]: "done" }));
      return true;
    } catch (err) {
      console.error("Compress failed:", err);
      setStatus((prev) => ({ ...prev, [project.id]: "error" }));
      return false;
    }
  }

  async function compressSelected() {
    abortRef.current = false;
    const toCompress = compressible.filter(
      (p) => selected.has(p.id) && status[p.id] !== "done"
    );
    if (!toCompress.length) return;

    let done = 0;
    setToast({ label: "Compressing images…", sub: `0 / ${toCompress.length}` });

    // Process 3 images in parallel for speed
    const CONCURRENCY = 3;
    for (let i = 0; i < toCompress.length; i += CONCURRENCY) {
      if (abortRef.current) break;
      const batch = toCompress.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (p) => {
          await compressOne(p);
          done++;
          setToast({ label: "Compressing images…", sub: `${done} / ${toCompress.length} done` });
        })
      );
    }

    setToast({ label: `${done} image${done !== 1 ? "s" : ""} compressed`, sub: "All done!", done: true });
    setTimeout(() => setToast(null), 3000);
  }


  const qualityLabel = quality >= 85 ? "High quality" : quality >= 70 ? "Balanced (recommended)" : quality >= 55 ? "Smaller size" : "Maximum compression";
  const qualityColor = quality >= 85 ? "text-gold-soft" : quality >= 70 ? "text-gold" : quality >= 55 ? "text-ember/80" : "text-ember";

  const selectedImages = compressible.filter((p) => selected.has(p.id));

  return (
    <div className="flex w-full gap-5 overflow-hidden">
      {/* Left: Settings ─────────────────────────────────────────────────── */}
      <aside className="hidden w-64 shrink-0 flex-col gap-4 lg:flex">
        {/* Quality */}
        <div className="rounded-2xl border border-line bg-ink-2/40 p-5">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Image Quality</p>
          <div className="mb-2 flex items-center justify-between">
            <span className={`font-mono text-[13px] font-bold ${qualityColor}`}>{quality}%</span>
            <span className={`font-mono text-[10px] ${qualityColor}`}>{qualityLabel}</span>
          </div>
          <input
            type="range" min={20} max={95} step={5} value={quality}
            onChange={(e) => setQuality(+e.target.value)}
            className="w-full accent-gold"
          />
          <div className="mt-3 space-y-1.5 text-[11px] text-muted">
            <div className="flex justify-between"><span>95% → High quality</span><span className="text-muted/60">~10% saved</span></div>
            <div className="flex justify-between"><span>75% → Balanced ★</span><span className="text-muted/60">~40% saved</span></div>
            <div className="flex justify-between"><span>55% → Smaller</span><span className="text-muted/60">~60% saved</span></div>
            <div className="flex justify-between"><span>30% → Max compress</span><span className="text-muted/60">~75% saved</span></div>
          </div>
        </div>

        {/* Max size */}
        <div className="rounded-2xl border border-line bg-ink-2/40 p-5">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Max Output Size</p>
          <select
            value={maxMB ?? ""}
            onChange={(e) => setMaxMB(e.target.value ? +e.target.value : null)}
            className="w-full rounded-lg border border-line bg-ink px-3 py-2.5 font-mono text-sm text-bone outline-none focus:border-gold"
          >
            <option value="">No limit</option>
            <option value="0.2">0.2 MB</option>
            <option value="0.5">0.5 MB</option>
            <option value="1">1 MB</option>
            <option value="2">2 MB</option>
            <option value="5">5 MB</option>
          </select>
          <p className="mt-2 text-[10px] text-muted">Quality is reduced automatically until the target size is reached.</p>
        </div>

        {/* Format note */}
        <div className="rounded-2xl border border-line/60 bg-ink-2/20 p-4 text-[11px] text-muted">
          <p className="mb-1 font-semibold text-bone">Output format</p>
          <p>Images are compressed to <span className="text-gold-soft">WebP</span> — 25–35% smaller than JPEG at the same quality.</p>
        </div>

        {/* Compress button */}
        {selectedImages.length > 0 && (
          <button
            onClick={compressSelected}
            className="rounded-full border border-gold/40 bg-gold/10 px-5 py-3 font-mono text-xs uppercase tracking-[0.2em] text-gold-soft transition-all hover:border-gold hover:bg-gold/20"
          >
            Compress {selectedImages.length} image{selectedImages.length > 1 ? "s" : ""}
          </button>
        )}
      </aside>

      {/* Right: Media list ───────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] text-muted">{filtered.length} image{filtered.length !== 1 ? "s" : ""}</span>

          {/* Sort */}
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-lg border border-line bg-ink px-3 py-1.5 font-mono text-[10px] text-bone outline-none focus:border-gold"
          >
            <option value="size_desc">Size: Large → Small</option>
            <option value="size_asc">Size: Small → Large</option>
            <option value="priority_desc">Priority: High → Low</option>
            <option value="name_asc">Name: A → Z</option>
            <option value="name_desc">Name: Z → A</option>
            <option value="category_asc">Category: A → Z</option>
            <option value="status_first">Status: Uncompressed first</option>
          </select>

          {/* Auto-select high priority */}
          <button
            onClick={() => {
              const highPriority = allImages.filter(
                (p) => getRec(sizes[p.media], p.type).priority >= 2 && status[p.id] !== "done"
              );
              setSelected(new Set(highPriority.map((p) => p.id)));
            }}
            className="rounded-lg border border-ember/40 bg-ember/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-ember transition-colors hover:bg-ember/20"
          >
            ❗ Select High Priority
          </button>

          <button
            onClick={selectAllImages}
            className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-muted hover:text-bone"
          >
            {compressible.every((p) => selected.has(p.id)) ? "Deselect all" : "Select all"}
          </button>

          {/* Mobile compress button */}
          {selectedImages.length > 0 && (
            <button
              onClick={compressSelected}
              className="rounded-full border border-gold/40 bg-gold/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gold-soft transition-all hover:border-gold lg:hidden"
            >
              Compress {selectedImages.length}
            </button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto rounded-2xl border border-line">
          {filtered.length === 0 && (
            <div className="flex h-32 items-center justify-center">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">No items</p>
            </div>
          )}
          {filtered.map((p) => {
            const sizeBytes = sizes[p.media];
            const rec = getRec(sizeBytes, p.type);
            const st = status[p.id] ?? "idle";
            const savedBytes = saved[p.id];

            return (
              <div
                key={p.id}
                className="flex items-center gap-3 border-b border-line/60 px-4 py-3.5 transition-colors last:border-b-0 hover:bg-white/[0.02]"
              >
                {/* Checkbox */}
                <span
                  onClick={() => toggleSelect(p.id)}
                  className={`grid h-5 w-5 shrink-0 cursor-pointer place-items-center rounded border transition-colors ${
                    selected.has(p.id) ? "border-gold bg-gold text-ink" : "border-line hover:border-muted/60"
                  }`}
                >
                  {selected.has(p.id) && "✓"}
                </span>

                {/* Thumbnail */}
                <span className="grid h-10 w-14 shrink-0 place-items-center overflow-hidden rounded border border-line bg-black">
                  <img src={transformImage(p.media, 80, 60)} alt="" loading="lazy" className="h-full w-full object-cover" />
                </span>

                {/* Name + category */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-bone">{p.title}</p>
                  <p className="font-mono text-[10px] text-muted">{p.category}{p.subcategory ? ` / ${p.subcategory}` : ""}</p>
                </div>

                {/* File size */}
                <div className="hidden w-20 shrink-0 text-right sm:block">
                  {sizeBytes === undefined
                    ? <span className="font-mono text-[10px] text-muted/50">loading…</span>
                    : sizeBytes === null
                      ? <span className="font-mono text-[10px] text-muted/50">unknown</span>
                      : <span className="font-mono text-[11px] text-bone">{formatBytes(sizeBytes)}</span>
                  }
                  {savedBytes && (
                    <p className="font-mono text-[9px] text-gold-soft">−{formatBytes(savedBytes)}</p>
                  )}
                </div>

                {/* Recommendation */}
                <div className="hidden w-36 shrink-0 text-right md:block">
                  <span className={`font-mono text-[10px] ${rec.color}`}>{rec.label}</span>
                  {sizeBytes && st === "idle" && (
                    <p className="font-mono text-[9px] text-muted/60">{estimateSavings(sizeBytes, quality)}</p>
                  )}
                </div>

                {/* Status / action */}
                <div className="shrink-0 w-24 text-right">
                  {st === "idle" ? (
                    <button
                      onClick={() => {
                        setSelected((prev) => { const n = new Set(prev); n.add(p.id); return n; });
                        compressOne(p).then(() => setToast({ label: p.title, sub: "Compressed ✓", done: true }))
                          .then(() => setTimeout(() => setToast(null), 2500));
                      }}
                      className="rounded-lg border border-line px-3 py-1.5 font-mono text-[10px] text-muted transition-colors hover:border-gold/40 hover:text-bone"
                    >
                      Compress
                    </button>
                  ) : st === "compressing" ? (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-muted">
                      <span className="h-3 w-3 animate-spin rounded-full border border-gold/30 border-t-gold" />
                      Working…
                    </span>
                  ) : st === "done" ? (
                    <span className="font-mono text-[10px] text-gold-soft">✓ Done</span>
                  ) : st === "skipped" ? (
                    <span className="font-mono text-[10px] text-muted">Already small</span>
                  ) : (
                    <span className="font-mono text-[10px] text-ember">Error</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>{toast && <CompressToast toast={toast} />}</AnimatePresence>
    </div>
  );
}
