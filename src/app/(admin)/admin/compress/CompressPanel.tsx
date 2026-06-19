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
type TypeFilter = "all" | "image" | "video" | "pdf";

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

/* ── Image compression via Canvas ────────────────────────────────────────── */
async function compressImageBlob(url: string, quality: number, maxMB: number | null): Promise<Blob> {
  const res = await fetch(url);
  const originalBlob = await res.blob();

  const bitmap = await createImageBitmap(originalBlob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
  bitmap.close();

  const tryCompress = (q: number) =>
    new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
        "image/webp",
        q / 100
      )
    );

  let blob = await tryCompress(quality);

  // If a max size is set, iteratively reduce quality until it fits
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
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [quality, setQuality] = useState(75);
  const [maxMB, setMaxMB] = useState<number | null>(null);
  const [sizes, setSizes] = useState<FileSizeMap>({});
  const [status, setStatus] = useState<CompressStatus>({});
  const [saved, setSaved] = useState<Record<string, number>>({}); // bytes saved per project
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<Toast>(null);
  const abortRef = useRef(false);

  // Deduplicate by media URL
  const unique = projects.filter((p, i, arr) =>
    arr.findIndex((x) => x.media === p.media) === i && p.type !== "website"
  );

  const filtered = unique.filter((p) =>
    typeFilter === "all" || p.type === typeFilter
  );

  const imageProjects = filtered.filter((p) => p.type === "image");
  const compressible = filtered.filter((p) => p.type === "image");

  // Fetch file sizes via HEAD requests
  useEffect(() => {
    let cancelled = false;
    async function loadSizes() {
      const toFetch = unique.filter((p) => sizes[p.media] === undefined);
      for (const p of toFetch) {
        if (cancelled) break;
        try {
          const res = await fetch(p.media, { method: "HEAD" });
          const len = res.headers.get("content-length");
          if (!cancelled) setSizes((prev) => ({ ...prev, [p.media]: len ? parseInt(len) : null }));
        } catch {
          if (!cancelled) setSizes((prev) => ({ ...prev, [p.media]: null }));
        }
      }
    }
    loadSizes();
    return () => { cancelled = true; };
  }, [unique.length]); // eslint-disable-line react-hooks/exhaustive-deps

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

      // Only upload if it's actually smaller
      if (compressed.size >= originalSize && !maxMB) {
        setStatus((prev) => ({ ...prev, [project.id]: "skipped" }));
        return false;
      }

      // Get the new WebP path (change extension)
      const webpPath = storagePath.replace(/\.[^.]+$/, ".webp");

      // Get signed upload URL
      const signed = await getOverwriteUploadUrlAction(webpPath);
      if ("error" in signed) throw new Error(signed.error);

      // Upload compressed blob
      const { error } = await supabaseBrowser.storage
        .from(MEDIA_BUCKET)
        .uploadToSignedUrl(signed.path, signed.token, compressed, {
          contentType: "image/webp",
        });

      if (error) throw new Error(error.message);

      const byteSaved = originalSize - compressed.size;
      setSaved((prev) => ({ ...prev, [project.id]: byteSaved }));
      setSizes((prev) => ({ ...prev, [project.media]: compressed.size }));
      setStatus((prev) => ({ ...prev, [project.id]: "done" }));
      return true;
    } catch {
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

    let done = 0, totalSaved = 0;
    setToast({ label: "Compressing images…", sub: `0 / ${toCompress.length}` });

    for (const p of toCompress) {
      if (abortRef.current) break;
      setToast({ label: "Compressing images…", sub: `${done + 1} / ${toCompress.length} — ${p.title}` });
      const ok = await compressOne(p);
      if (ok) totalSaved += (sizes[p.media] ?? 0);
      done++;
    }

    setToast({ label: `${done} images compressed`, sub: `~${formatBytes(totalSaved)} saved`, done: true });
    setTimeout(() => setToast(null), 3000);
  }

  const counts = {
    image: unique.filter((p) => p.type === "image").length,
    video: unique.filter((p) => p.type === "video").length,
    pdf: unique.filter((p) => p.type === "pdf").length,
  };

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
          {/* Type filter */}
          {(["all", "image", "video", "pdf"] as TypeFilter[]).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                typeFilter === t ? "bg-gold/15 text-gold" : "text-muted hover:text-bone"
              }`}
            >
              {t === "all" ? `All (${unique.length})` : `${t} (${counts[t as keyof typeof counts]})`}
            </button>
          ))}

          {typeFilter !== "video" && typeFilter !== "pdf" && (
            <button
              onClick={selectAllImages}
              className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-muted hover:text-bone"
            >
              {compressible.every((p) => selected.has(p.id)) ? "Deselect all" : "Select all images"}
            </button>
          )}

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
            const isImg = p.type === "image";

            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 border-b border-line/60 px-4 py-3.5 transition-colors last:border-b-0 ${isImg ? "hover:bg-white/[0.02]" : ""}`}
              >
                {/* Checkbox (images only) */}
                {isImg ? (
                  <span
                    onClick={() => toggleSelect(p.id)}
                    className={`grid h-5 w-5 shrink-0 cursor-pointer place-items-center rounded border transition-colors ${
                      selected.has(p.id) ? "border-gold bg-gold text-ink" : "border-line hover:border-muted/60"
                    }`}
                  >
                    {selected.has(p.id) && "✓"}
                  </span>
                ) : (
                  <span className="h-5 w-5 shrink-0" />
                )}

                {/* Thumbnail */}
                <span className="grid h-10 w-14 shrink-0 place-items-center overflow-hidden rounded border border-line bg-black">
                  {p.type === "image"
                    ? <img src={transformImage(p.media, 80, 60)} alt="" loading="lazy" className="h-full w-full object-cover" />
                    : <span className="font-mono text-[8px] uppercase text-muted">{p.type.slice(0, 3)}</span>
                  }
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
                  {sizeBytes && isImg && st === "idle" && (
                    <p className="font-mono text-[9px] text-muted/60">{estimateSavings(sizeBytes, quality)}</p>
                  )}
                </div>

                {/* Status / action */}
                <div className="shrink-0 w-24 text-right">
                  {!isImg ? (
                    p.type === "video" ? (
                      <a href="https://handbrake.fr" target="_blank" rel="noreferrer" className="font-mono text-[10px] text-muted underline hover:text-bone">HandBrake ↗</a>
                    ) : (
                      <a href="https://ilovepdf.com/compress_pdf" target="_blank" rel="noreferrer" className="font-mono text-[10px] text-muted underline hover:text-bone">ilovepdf ↗</a>
                    )
                  ) : st === "idle" ? (
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
